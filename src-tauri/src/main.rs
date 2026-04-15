// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod poll;

use poll::{default_base_url, fetch_widget, WidgetPayload};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
    menu::{Menu, MenuBuilder, MenuEvent, MenuItemBuilder},
    AppHandle, Emitter, Manager, State,
};
use tokio::sync::Notify;

const KEYRING_SERVICE: &str = "obol-desktop";
const KEYRING_ACCOUNT: &str = "pat";
// 2-minute cadence so a token revoked on the website takes effect in
// the widget almost immediately. The server-side cache still absorbs
// the D1 load — this is just a KV read per poll, well inside free tier.
const POLL_INTERVAL_SECS: u64 = 120;

/// Shared state between Tauri commands and the background polling task.
pub struct AppState {
    /// Triggers an immediate poll when `notify_one()` is called.
    pub refresh: Arc<Notify>,
    /// Last successful payload, kept in memory for cache-on-error display.
    pub last: Mutex<Option<WidgetPayload>>,
}

impl AppState {
    fn new() -> Self {
        Self {
            refresh: Arc::new(Notify::new()),
            last: Mutex::new(None),
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
fn cmd_save_token(token: String, state: State<'_, AppState>) -> Result<(), String> {
    let entry = keyring_entry()?;
    entry.set_password(&token).map_err(|e| e.to_string())?;
    // Kick the poller so the UI updates immediately.
    state.refresh.notify_one();
    Ok(())
}

#[tauri::command]
fn cmd_load_token() -> Option<String> {
    load_token_from_keychain()
}

#[tauri::command]
fn cmd_delete_token(state: State<'_, AppState>) -> Result<(), String> {
    let entry = keyring_entry()?;
    // delete_credential errors if the entry doesn't exist; swallow that.
    let _ = entry.delete_credential();
    *state.last.lock().unwrap() = None;
    state.refresh.notify_one();
    Ok(())
}

#[tauri::command]
fn cmd_refresh_now(state: State<'_, AppState>) {
    state.refresh.notify_one();
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
    let Some(token) = load_token_from_keychain() else {
        // No token configured yet — nothing to do, the UI is showing
        // the SetupScreen regardless.
        return;
    };
    let base_url = default_base_url();
    match fetch_widget(&base_url, &token).await {
        Ok(payload) => {
            // Update tray title with mood + today spend — "at a glance" UX.
            if let Some(tray) = app.tray_by_id("main") {
                let label = format!(
                    "{} {}",
                    payload.mood.face,
                    short_cents(payload.today_spend_cents)
                );
                let _ = tray.set_title(Some(&label));
            }
            *state.last.lock().unwrap() = Some(payload.clone());
            if let Err(err) = app.emit("widget-update", payload) {
                eprintln!("failed to emit widget-update: {}", err);
            }
        }
        Err(err) => {
            eprintln!("poll failed: {}", err);
            let _ = app.emit("widget-error", err.tag());
        }
    }
}

fn spawn_poll_task(app: AppHandle) {
    let state = app.state::<AppState>().inner() as *const AppState;
    // SAFETY: AppState lives for the duration of the Tauri app, which
    // outlives this task. The app handle we hold keeps it alive. We
    // only read the refresh notifier + last mutex through &AppState so
    // no aliasing issues.
    let state: &'static AppState = unsafe { &*state };
    let refresh = state.refresh.clone();
    tauri::async_runtime::spawn(async move {
        // Kick an initial poll immediately.
        poll_once(&app, state).await;
        loop {
            // Either wait POLL_INTERVAL_SECS or wait for a manual refresh nudge,
            // whichever comes first.
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)) => {}
                _ = refresh.notified() => {}
            }
            poll_once(&app, state).await;
        }
    });
}

// ---------- Tray ----------

fn build_tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let show = MenuItemBuilder::with_id("show", "Show window").build(app)?;
    let refresh = MenuItemBuilder::with_id("refresh", "Refresh now").build(app)?;
    let disconnect = MenuItemBuilder::with_id("disconnect", "Disconnect / Sign out").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit Obol").build(app)?;
    MenuBuilder::new(app)
        .items(&[&show, &refresh])
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
            if let Some(state) = app.try_state::<AppState>() {
                state.refresh.notify_one();
            }
        }
        "disconnect" => {
            if let Ok(entry) = keyring_entry() {
                let _ = entry.delete_credential();
            }
            if let Some(state) = app.try_state::<AppState>() {
                *state.last.lock().unwrap() = None;
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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            cmd_save_token,
            cmd_load_token,
            cmd_delete_token,
            cmd_refresh_now,
        ])
        .setup(|app| {
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
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
