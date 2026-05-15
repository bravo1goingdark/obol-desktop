// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod poll;

use poll::{default_base_url, fetch_widget, WidgetPayload};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::menu::{CheckMenuItemBuilder, Menu, MenuBuilder, MenuEvent, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::Notify;
use tokio::time::Duration;

const KEYRING_SERVICE: &str = "obol-desktop";
const KEYRING_ACCOUNT: &str = "pat";
// Default 2-minute cadence; overridable at runtime via cmd_set_poll_interval.
const DEFAULT_POLL_INTERVAL_SECS: u64 = 120;
const DASHBOARD_URL: &str = "https://useobol.pages.dev/overview";

/// Shared state between Tauri commands and the background polling task.
pub struct AppState {
    /// Triggers an immediate poll when `notify_one()` is called.
    pub refresh: Arc<Notify>,
    /// Last successful payload, kept in memory for cache-on-error display.
    pub last: Mutex<Option<WidgetPayload>>,
    /// Whether the main window is always on top.
    pub always_on_top: Mutex<bool>,
    /// Highest budget threshold (80 or 100) we've notified in this session.
    /// Resets to 0 when spend drops back below 80 %.
    pub last_notified_threshold: Mutex<u8>,
    /// Handle to the "Always on top" check-menu item so we can update its
    /// checkmark from the menu-event handler.
    pub aot_item: Mutex<Option<tauri::menu::CheckMenuItem<tauri::Wry>>>,
    /// Handle to the "Pause / Resume polling" item so we can update its
    /// text when the state flips.
    pub pause_item: Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
    /// Handle to the "Copy today's cost" item so we can disable it when
    /// there's no payload yet (fresh launch before first poll).
    pub copy_today_item: Mutex<Option<tauri::menu::MenuItem<tauri::Wry>>>,
    /// How long to sleep between polls (seconds). Writable at runtime.
    pub poll_interval_secs: Mutex<u64>,
    /// Daily spend cap in cents (0 = disabled). Writable at runtime.
    pub daily_limit_cents: Mutex<i64>,
    /// True once we've fired the daily-limit notification; reset when a
    /// new calendar day begins (detected by comparing the date in the payload).
    pub daily_alert_fired: Mutex<bool>,
    /// The date string (YYYY-MM-DD) of the last poll that set daily_alert_fired.
    /// Used to reset the flag on day rollover instead of on spend fluctuation.
    pub last_daily_date: Mutex<String>,
    /// When true, the poll loop skips fetching and leaves the last payload
    /// visible. Set via the "Pause polling" tray item.
    pub paused: AtomicBool,
    /// When true, the server returned 402 (trial expired). Polling halts
    /// until the user upgrades or re-authenticates with a new token.
    pub trial_expired: AtomicBool,
    /// Last ETag value returned by the widget endpoint. Sent as
    /// `If-None-Match` on the next poll so unchanged payloads return 304.
    pub last_etag: Mutex<Option<String>>,
    /// When true, notifications are suppressed and tray label is dimmed.
    pub focus_mode: AtomicBool,
    /// Unix timestamp (secs) of last user activity. Updated by frontend on
    /// interaction. Polling is skipped when idle > 10 minutes.
    pub last_activity: std::sync::atomic::AtomicU64,
}

impl AppState {
    fn new() -> Self {
        Self {
            refresh: Arc::new(Notify::new()),
            last: Mutex::new(None),
            always_on_top: Mutex::new(false),
            last_notified_threshold: Mutex::new(0),
            aot_item: Mutex::new(None),
            pause_item: Mutex::new(None),
            copy_today_item: Mutex::new(None),
            poll_interval_secs: Mutex::new(DEFAULT_POLL_INTERVAL_SECS),
            daily_limit_cents: Mutex::new(0),
            daily_alert_fired: Mutex::new(false),
            last_daily_date: Mutex::new(String::new()),
            paused: AtomicBool::new(false),
            trial_expired: AtomicBool::new(false),
            last_etag: Mutex::new(None),
            focus_mode: AtomicBool::new(false),
            last_activity: std::sync::atomic::AtomicU64::new(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
            ),
        }
    }
}

// ---------- Keychain helpers ----------

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).map_err(|e| e.to_string())
}

fn load_token_from_keychain() -> Option<String> {
    keyring_entry().ok().and_then(|e| e.get_password().ok())
}

// ---------- Tauri commands ----------

#[tauri::command]
fn cmd_save_token(token: String, state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let entry = keyring_entry()?;
    entry.set_password(&token).map_err(|e| e.to_string())?;
    state.trial_expired.store(false, Ordering::Relaxed);
    state.refresh.notify_one();
    Ok(())
}

#[tauri::command]
fn cmd_load_token() -> Option<String> {
    load_token_from_keychain()
}

#[tauri::command]
fn cmd_delete_token(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    let entry = keyring_entry()?;
    let _ = entry.delete_credential();
    *state.last.lock().unwrap_or_else(|e| e.into_inner()) = None;
    state.refresh.notify_one();
    Ok(())
}

#[tauri::command]
fn cmd_refresh_now(state: State<'_, Arc<AppState>>) {
    state.refresh.notify_one();
}

#[tauri::command]
fn cmd_get_autostart(app: AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
fn cmd_set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    if enabled {
        app.autolaunch().enable().map_err(|e| e.to_string())
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn cmd_toggle_always_on_top(app: AppHandle, state: State<'_, Arc<AppState>>) -> bool {
    let new_aot = {
        let mut aot = state
            .always_on_top
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        *aot = !*aot;
        *aot
    };
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(new_aot);
    }
    if let Ok(guard) = state.aot_item.lock() {
        if let Some(ref item) = *guard {
            let _ = item.set_checked(new_aot);
        }
    }
    new_aot
}

#[tauri::command]
fn cmd_get_poll_interval(state: State<'_, Arc<AppState>>) -> u64 {
    *state
        .poll_interval_secs
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

#[tauri::command]
fn cmd_set_poll_interval(secs: u64, state: State<'_, Arc<AppState>>) {
    *state
        .poll_interval_secs
        .lock()
        .unwrap_or_else(|e| e.into_inner()) = secs.clamp(60, 900);
    state.refresh.notify_one();
}

#[tauri::command]
fn cmd_get_daily_limit(state: State<'_, Arc<AppState>>) -> i64 {
    *state
        .daily_limit_cents
        .lock()
        .unwrap_or_else(|e| e.into_inner())
}

#[tauri::command]
fn cmd_set_daily_limit(cents: i64, state: State<'_, Arc<AppState>>) {
    *state
        .daily_limit_cents
        .lock()
        .unwrap_or_else(|e| e.into_inner()) = cents.max(0);
    *state
        .daily_alert_fired
        .lock()
        .unwrap_or_else(|e| e.into_inner()) = false;
}

#[tauri::command]
fn cmd_heartbeat(state: State<'_, Arc<AppState>>) {
    state.last_activity.store(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        Ordering::Relaxed,
    );
}

#[tauri::command]
async fn cmd_toggle_proxy() -> Result<(), String> {
    let Some(token) = load_token_from_keychain() else {
        return Err("no token".into());
    };
    let base_url = poll::default_base_url();
    let url = format!("{}/api/proxy-keys/toggle", base_url.trim_end_matches('/'));
    poll::get_client()
        .post(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn cmd_set_focus_mode(enabled: bool, app: AppHandle, state: State<'_, Arc<AppState>>) {
    state.focus_mode.store(enabled, Ordering::Relaxed);
    // Dim/restore tray label to signal focus mode visually.
    if let Some(tray) = app.tray_by_id("main") {
        if enabled {
            let _ = tray.set_title(Some("· zen"));
        } else {
            // Restore normal label from last payload.
            let label = state
                .last
                .lock()
                .ok()
                .and_then(|g| {
                    g.as_ref()
                        .map(|p| format!("{} {}", p.mood.face, short_cents(p.today_spend_cents)))
                })
                .unwrap_or_else(|| "Obol".to_string());
            let _ = tray.set_title(Some(&label));
        }
    }
}

// ---------- Background polling task ----------

fn short_cents(cents: i64) -> String {
    let dollars = (cents as f64) / 100.0;
    if dollars.abs() >= 1000.0 {
        format!("${:.1}k", dollars / 1000.0)
    } else {
        format!("${:.2}", dollars)
    }
}

async fn poll_once(app: &AppHandle, state: &AppState) {
    // Short-circuit when the user has paused polling via the tray menu.
    // The last-known payload stays visible; only the tray label flips
    // to `(zZz) <last spend>` so there's a visible cue.
    if state.paused.load(Ordering::Relaxed) {
        if let Some(tray) = app.tray_by_id("main") {
            let last_label = state
                .last
                .lock()
                .ok()
                .and_then(|g| g.as_ref().map(|p| short_cents(p.today_spend_cents)))
                .unwrap_or_else(|| "paused".to_string());
            let _ = tray.set_title(Some(&format!("(zZz) {}", last_label)));
        }
        return;
    }

    // Skip polling when user is idle (no interaction for 10+ minutes).
    // Resumes automatically on next activity via cmd_heartbeat.
    {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let last = state.last_activity.load(Ordering::Relaxed);
        if now.saturating_sub(last) > 600 {
            return;
        }
    }

    // Stop polling when trial has expired — the user must upgrade or
    // re-authenticate. Cleared when the token changes (cmd_save_token).
    if state.trial_expired.load(Ordering::Relaxed) {
        return;
    }

    let Some(token) = load_token_from_keychain() else {
        // No token configured yet — nothing to do.
        return;
    };
    let base_url = default_base_url();
    let etag = state
        .last_etag
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    match fetch_widget(&base_url, &token, etag.as_deref()).await {
        Ok(None) => {
            // 304 Not Modified — payload unchanged. Just refresh the
            // tray tooltip timestamp so the user sees the poll is alive.
            if let Some(tray) = app.tray_by_id("main") {
                if let Some(ref payload) = *state.last.lock().unwrap_or_else(|e| e.into_inner()) {
                    let forecast_str = payload
                        .forecast_month_cents
                        .map(short_cents)
                        .unwrap_or_else(|| "—".to_string());
                    let tooltip = format!(
                        "Month: {}  |  Today: {}  |  Forecast: {}  |  {} connections",
                        short_cents(payload.month_spend_cents),
                        short_cents(payload.today_spend_cents),
                        forecast_str,
                        payload.active_connections,
                    );
                    let _ = tray.set_tooltip(Some(&tooltip));
                }
            }
        }
        Ok(Some((payload, new_etag))) => {
            // Store the new ETag for the next conditional request.
            *state.last_etag.lock().unwrap_or_else(|e| e.into_inner()) = new_etag;
            // Update tray title with mood face + today's spend for at-a-glance UX.
            if let Some(tray) = app.tray_by_id("main") {
                // Skip tray update in focus mode.
                if !state.focus_mode.load(Ordering::Relaxed) {
                    let status = if payload.budget_cents > 0 && payload.budget_percent >= 100.0 {
                        "🔴"
                    } else if payload.budget_cents > 0 && payload.budget_percent >= 80.0 {
                        "🟡"
                    } else {
                        "🟢"
                    };
                    let label = format!(
                        "{} {} {}",
                        status,
                        payload.mood.face,
                        short_cents(payload.today_spend_cents)
                    );
                    let _ = tray.set_title(Some(&label));
                }
                // Tooltip shows the fuller picture without opening the window.
                let forecast_str = payload
                    .forecast_month_cents
                    .map(short_cents)
                    .unwrap_or_else(|| "—".to_string());
                let tooltip = format!(
                    "Month: {}  |  Today: {}  |  Forecast: {}  |  {} connections",
                    short_cents(payload.month_spend_cents),
                    short_cents(payload.today_spend_cents),
                    forecast_str,
                    payload.active_connections,
                );
                let _ = tray.set_tooltip(Some(&tooltip));
            }

            // Budget threshold notifications — fire once per crossing per session.
            // Suppressed in focus mode.
            if payload.budget_cents > 0 && !state.focus_mode.load(Ordering::Relaxed) {
                let pct = payload.budget_percent;
                let mut last_thresh = state
                    .last_notified_threshold
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());

                if pct >= 100.0 && *last_thresh < 100 {
                    *last_thresh = 100;
                    drop(last_thresh);
                    let _ = app
                        .notification()
                        .builder()
                        .title("Obol — Budget Exceeded")
                        .body(format!(
                            "You've spent {} of your {} monthly budget ({:.0}%).",
                            short_cents(payload.month_spend_cents),
                            short_cents(payload.budget_cents),
                            pct,
                        ))
                        .show();
                } else if pct >= 80.0 && *last_thresh < 80 {
                    *last_thresh = 80;
                    drop(last_thresh);
                    let _ = app
                        .notification()
                        .builder()
                        .title("Obol — Budget Warning")
                        .body(format!(
                            "You've used {:.0}% of your {} monthly budget.",
                            pct,
                            short_cents(payload.budget_cents),
                        ))
                        .show();
                } else if pct < 80.0 {
                    // Only reset at the start of a new billing month (when
                    // month_spend drops). Don't reset on minor fluctuations.
                    if payload.month_spend_cents == 0 {
                        *last_thresh = 0;
                    }
                }
            }

            // Daily spend limit notification. Suppressed in focus mode.
            let daily_limit = *state
                .daily_limit_cents
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if daily_limit > 0 && !state.focus_mode.load(Ordering::Relaxed) {
                // Reset the fired flag on day rollover (new date in payload).
                let today = &payload.updated_at[..10]; // "YYYY-MM-DD"
                {
                    let mut last_date = state
                        .last_daily_date
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                    if last_date.as_str() != today {
                        *last_date = today.to_string();
                        *state
                            .daily_alert_fired
                            .lock()
                            .unwrap_or_else(|e| e.into_inner()) = false;
                    }
                }
                let mut fired = state
                    .daily_alert_fired
                    .lock()
                    .unwrap_or_else(|e| e.into_inner());
                if payload.today_spend_cents >= daily_limit && !*fired {
                    *fired = true;
                    drop(fired);
                    let _ = app
                        .notification()
                        .builder()
                        .title("Obol — Daily Limit Reached")
                        .body(format!(
                            "Today's spend ({}) has hit your {} daily limit.",
                            short_cents(payload.today_spend_cents),
                            short_cents(daily_limit),
                        ))
                        .show();
                }
            }

            *state.last.lock().unwrap_or_else(|e| e.into_inner()) = Some(payload.clone());

            // Enable the "Copy today's cost" tray item — first successful
            // poll means we have something worth copying.
            if let Ok(guard) = state.copy_today_item.lock() {
                if let Some(ref item) = *guard {
                    let _ = item.set_enabled(true);
                    let _ = item.set_text(format!(
                        "Copy today's cost — {}",
                        short_cents(payload.today_spend_cents)
                    ));
                }
            }

            if let Err(err) = app.emit("widget-update", payload) {
                eprintln!("failed to emit widget-update: {}", err);
            }
        }
        Err(poll::PollError::TrialExpired(payload)) => {
            eprintln!("poll failed: trial expired");
            *state.last_etag.lock().unwrap_or_else(|e| e.into_inner()) = None;
            state.trial_expired.store(true, Ordering::Relaxed);
            let _ = app.emit("widget-trial-expired", &payload);
            let _ = app.emit("widget-error", "trial_expired");
        }
        Err(err) => {
            eprintln!("poll failed: {}", err);
            // Clear the ETag so the next poll does a full fetch.
            *state.last_etag.lock().unwrap_or_else(|e| e.into_inner()) = None;
            let _ = app.emit("widget-error", err.tag());
        }
    }
}

fn spawn_poll_task(app: AppHandle) {
    let state: Arc<AppState> = (*app.state::<Arc<AppState>>().inner()).clone();
    let refresh = state.refresh.clone();
    tauri::async_runtime::spawn(async move {
        poll_once(&app, &state).await;
        loop {
            let interval = *state
                .poll_interval_secs
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(interval)) => {}
                _ = refresh.notified() => {}
            }
            poll_once(&app, &state).await;
        }
    });
}

// ---------- Auto-updater ----------

/// Fire one startup update check. Emits `update-available` with
/// `{ version, notes, downloaded: bool }` when a newer release is
/// published. The frontend (`App.svelte`) listens and renders the
/// banner. Installation is user-initiated — we never auto-install
/// without consent.
///
/// The plugin itself no-ops when `plugins.updater.active = false`, so
/// this task is safe to leave wired in until the signing keypair is
/// generated and the config flag is flipped on.
fn spawn_update_check(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(5)).await;
        use tauri_plugin_updater::UpdaterExt;
        let updater = match app.updater() {
            Ok(u) => u,
            Err(err) => {
                eprintln!("updater init skipped: {err}");
                return;
            }
        };
        match updater.check().await {
            Ok(Some(update)) => {
                let payload = serde_json::json!({
                    "version": update.version,
                    "notes": update.body.clone().unwrap_or_default(),
                });
                if let Err(err) = app.emit("update-available", payload) {
                    eprintln!("failed to emit update-available: {err}");
                }
            }
            Ok(None) => { /* already current — no-op */ }
            Err(err) => {
                eprintln!("update check failed: {err}");
            }
        }
    });
}

// ---------- Tray ----------

fn build_tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show = MenuItemBuilder::with_id("show", "Show window").build(app)?;
    let refresh = MenuItemBuilder::with_id("refresh", "Refresh now").build(app)?;
    // Disabled until the first successful poll — there's nothing to copy
    // on a fresh launch.
    let copy_today = MenuItemBuilder::with_id("copy_today", "Copy today's cost")
        .enabled(false)
        .build(app)?;
    let pause = MenuItemBuilder::with_id("pause", "Pause polling").build(app)?;
    let aot = CheckMenuItemBuilder::with_id("always_on_top", "Always on top")
        .checked(false)
        .build(app)?;
    let open_browser = MenuItemBuilder::with_id("open_browser", "Open in browser").build(app)?;
    let disconnect = MenuItemBuilder::with_id("disconnect", "Disconnect / Sign out").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Obol").build(app)?;

    let state = app.state::<Arc<AppState>>();
    state
        .aot_item
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .replace(aot.clone());
    state
        .pause_item
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .replace(pause.clone());
    state
        .copy_today_item
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .replace(copy_today.clone());

    MenuBuilder::new(app)
        .items(&[&show, &refresh, &copy_today, &pause, &aot, &open_browser])
        .separator()
        .item(&disconnect)
        .separator()
        .item(&quit)
        .build()
}

fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "refresh" => {
            if let Some(state) = app.try_state::<Arc<AppState>>() {
                state.refresh.notify_one();
            }
        }
        "copy_today" => {
            if let Some(state) = app.try_state::<Arc<AppState>>() {
                let value = state
                    .last
                    .lock()
                    .ok()
                    .and_then(|g| g.as_ref().map(|p| short_cents(p.today_spend_cents)));
                if let Some(text) = value {
                    if let Err(err) = app.clipboard().write_text(text.clone()) {
                        eprintln!("clipboard write failed: {err}");
                    } else {
                        // Brief confirmation via OS notification.
                        let _ = app
                            .notification()
                            .builder()
                            .title("Obol")
                            .body(format!("Copied today's cost: {}", text))
                            .show();
                    }
                }
            }
        }
        "pause" => {
            if let Some(state) = app.try_state::<Arc<AppState>>() {
                // Flip the atomic and update the menu-item label to reflect
                // the new state. The poll loop picks up the flag on its
                // next iteration (or immediately, on the resume notify).
                let now_paused = !state.paused.load(Ordering::Relaxed);
                state.paused.store(now_paused, Ordering::Relaxed);
                if let Ok(guard) = state.pause_item.lock() {
                    if let Some(ref item) = *guard {
                        let _ = item.set_text(if now_paused {
                            "Resume polling"
                        } else {
                            "Pause polling"
                        });
                    }
                }
                if now_paused {
                    // Update tray immediately so the user sees feedback
                    // without waiting a full poll cycle.
                    if let Some(tray) = app.tray_by_id("main") {
                        let last_label = state
                            .last
                            .lock()
                            .ok()
                            .and_then(|g| g.as_ref().map(|p| short_cents(p.today_spend_cents)))
                            .unwrap_or_else(|| "paused".to_string());
                        let _ = tray.set_title(Some(&format!("(zZz) {}", last_label)));
                    }
                } else {
                    // Resuming — kick the poll loop so the tray updates fast.
                    state.refresh.notify_one();
                }
            }
        }
        "always_on_top" => {
            if let Some(state) = app.try_state::<Arc<AppState>>() {
                let new_aot = {
                    let mut aot = state
                        .always_on_top
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                    *aot = !*aot;
                    *aot
                };
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_always_on_top(new_aot);
                }
                // Sync the checkmark.
                if let Ok(guard) = state.aot_item.lock() {
                    if let Some(ref item) = *guard {
                        let _ = item.set_checked(new_aot);
                    }
                }
            }
        }
        "open_browser" => {
            let _ = app.opener().open_url(DASHBOARD_URL, None::<&str>);
        }
        "disconnect" => {
            if let Ok(entry) = keyring_entry() {
                let _ = entry.delete_credential();
            }
            if let Some(state) = app.try_state::<Arc<AppState>>() {
                *state.last.lock().unwrap_or_else(|e| e.into_inner()) = None;
                state.refresh.notify_one();
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("widget-error", "unauthenticated");
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    match window.is_visible() {
        Ok(true) => {
            let _ = window.hide();
        }
        _ => {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

// ---------- App entrypoint ----------

fn main() {
    // Build the global shortcut: Cmd+Shift+O on macOS, Ctrl+Shift+O elsewhere.
    #[cfg(target_os = "macos")]
    let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyO);
    #[cfg(not(target_os = "macos"))]
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyO);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event: ShortcutEvent| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .manage(Arc::new(AppState::new()))
        .invoke_handler(tauri::generate_handler![
            cmd_save_token,
            cmd_load_token,
            cmd_delete_token,
            cmd_refresh_now,
            cmd_get_autostart,
            cmd_set_autostart,
            cmd_toggle_always_on_top,
            cmd_get_poll_interval,
            cmd_set_poll_interval,
            cmd_get_daily_limit,
            cmd_set_daily_limit,
            cmd_heartbeat,
            cmd_toggle_proxy,
            cmd_set_focus_mode,
        ])
        .setup(move |app| {
            // Register the global toggle shortcut.
            app.handle()
                .global_shortcut()
                .register(shortcut)
                .unwrap_or_else(|e| eprintln!("failed to register global shortcut: {e}"));

            let menu = build_tray_menu(app.handle())?;
            let icon = app
                .default_window_icon()
                .cloned()
                .expect("bundle must include a default icon");
            let _tray = TrayIconBuilder::with_id("main")
                .icon(icon)
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(handle_menu_event)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            eprintln!("obol-desktop started, starting poller");
            spawn_poll_task(app.handle().clone());

            // Auto-update check, run 5s after startup so the main window
            // renders first. The plugin silently no-ops when
            // plugins.updater.active = false in tauri.conf.json (v0.1
            // state, until the user generates a signing keypair and sets
            // active=true).
            spawn_update_check(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
