//! HTTP fetch for the Obol widget payload. Returns typed errors so the
//! Svelte side can render the right banner (unauthenticated /
//! rate-limited / trial_expired / network).

use serde::Deserialize;
use serde::Serialize;
use std::time::Duration;

const ENDPOINT_PATH: &str = "/api/desktop/widget";

static HTTP_CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();

fn get_client() -> &'static reqwest::Client {
    HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(10))
            .user_agent(concat!("obol-desktop/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("failed to create HTTP client")
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoodTier {
    pub face: String,
    pub quote: String,
    pub subtitle: String,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopModel {
    pub display: String,
    pub provider: String,
    pub cost_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyPoint {
    pub date: String,
    pub cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPayload {
    pub month_spend_cents: i64,
    pub prev_month_spend_cents: i64,
    pub today_spend_cents: i64,
    pub budget_cents: i64,
    pub budget_percent: f64,
    pub mood: MoodTier,
    pub top_model: Option<TopModel>,
    pub daily_series: Vec<DailyPoint>,
    pub forecast_month_cents: Option<i64>,
    pub active_connections: i64,
    pub updated_at: String,
}

/// Metadata from the 402 `trial_expired` response. Emitted as a
/// separate Tauri event so the Svelte UI can show the upgrade URL.
#[derive(Debug, Clone, Serialize)]
pub struct TrialExpiredPayload {
    pub error: String,
    pub message: String,
    pub upgrade_url: String,
    pub trial_started_at: String,
    pub trial_ends_at: String,
}

/// 402 response body from the Obol API.
#[derive(Debug, Deserialize)]
struct TrialExpiredBody {
    #[serde(default)]
    error: String,
    #[serde(default)]
    message: String,
    #[serde(default)]
    upgrade_url: String,
    #[serde(default)]
    trial_started_at: String,
    #[serde(default)]
    trial_ends_at: String,
}

#[derive(Debug, thiserror::Error)]
pub enum PollError {
    #[error("unauthenticated")]
    Unauthenticated,
    #[error("rate-limited")]
    RateLimited,
    #[error("trial expired")]
    TrialExpired(TrialExpiredPayload),
    #[error("network: {0}")]
    Network(String),
    #[error("decode: {0}")]
    Decode(String),
}

impl PollError {
    /// Tag that matches the `ApiErrorKind` enum in src/lib/types.ts so
    /// the Svelte side can switch on it.
    pub fn tag(&self) -> &'static str {
        match self {
            PollError::Unauthenticated => "unauthenticated",
            PollError::RateLimited => "rate-limited",
            PollError::TrialExpired(_) => "trial_expired",
            PollError::Network(_) => "network",
            PollError::Decode(_) => "network",
        }
    }
}

/// Fetch the widget payload from the Obol API.
///
/// When `etag` is `Some`, an `If-None-Match` header is sent. A 304
/// response returns `Ok(None)` — the caller should keep its cached
/// payload. A successful 200 returns `Ok(Some((payload, new_etag)))`.
pub async fn fetch_widget(
    base_url: &str,
    token: &str,
    etag: Option<&str>,
) -> Result<Option<(WidgetPayload, Option<String>)>, PollError> {
    let url = format!("{}{}", base_url.trim_end_matches('/'), ENDPOINT_PATH);
    let mut req = get_client().get(&url).bearer_auth(token);
    if let Some(tag) = etag {
        req = req.header("If-None-Match", tag);
    }
    let res = req
        .send()
        .await
        .map_err(|e| PollError::Network(e.to_string()))?;

    match res.status().as_u16() {
        304 => return Ok(None),
        401 => return Err(PollError::Unauthenticated),
        402 => {
            // Trial expired — parse the body for upgrade metadata.
            let body = res
                .json::<TrialExpiredBody>()
                .await
                .unwrap_or(TrialExpiredBody {
                    error: "trial_expired".into(),
                    message: "Your desktop widget trial has ended. Upgrade to Pro to continue."
                        .into(),
                    upgrade_url: String::new(),
                    trial_started_at: String::new(),
                    trial_ends_at: String::new(),
                });
            return Err(PollError::TrialExpired(TrialExpiredPayload {
                error: body.error,
                message: body.message,
                upgrade_url: body.upgrade_url,
                trial_started_at: body.trial_started_at,
                trial_ends_at: body.trial_ends_at,
            }));
        }
        429 => return Err(PollError::RateLimited),
        s if !(200..300).contains(&s) => {
            return Err(PollError::Network(format!("HTTP {}", s)));
        }
        _ => {}
    }

    // Extract the ETag header before .json() consumes the response.
    let new_etag = res
        .headers()
        .get("etag")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let payload = res
        .json::<WidgetPayload>()
        .await
        .map_err(|e| PollError::Decode(e.to_string()))?;

    Ok(Some((payload, new_etag)))
}

// Fallback base URL if no env var is set. Points at the Cloudflare Pages
// deploy alias.
pub fn default_base_url() -> String {
    std::env::var("OBOL_BASE_URL").unwrap_or_else(|_| "https://useobol.pages.dev".to_string())
}
