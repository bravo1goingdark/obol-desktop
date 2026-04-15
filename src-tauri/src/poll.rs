//! HTTP fetch for the Obol widget payload. Returns typed errors so the
//! Svelte side can render the right banner (unauthenticated /
//! rate-limited / network).

use serde::Deserialize;
use serde::Serialize;
use std::time::Duration;

const ENDPOINT_PATH: &str = "/api/desktop/widget";

static HTTP_CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();

fn get_client() -> &'static reqwest::Client {
    HTTP_CLIENT.get_or_init(|| {
        reqwest::Client::builder()
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

#[derive(Debug, thiserror::Error)]
pub enum PollError {
    #[error("unauthenticated")]
    Unauthenticated,
    #[error("rate-limited")]
    RateLimited,
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
            PollError::Network(_) => "network",
            PollError::Decode(_) => "network",
        }
    }
}

pub async fn fetch_widget(base_url: &str, token: &str) -> Result<WidgetPayload, PollError> {
    let url = format!("{}{}", base_url.trim_end_matches('/'), ENDPOINT_PATH);
    let res = get_client()
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| PollError::Network(e.to_string()))?;

    match res.status().as_u16() {
        401 => return Err(PollError::Unauthenticated),
        429 => return Err(PollError::RateLimited),
        s if !(200..300).contains(&s) => {
            return Err(PollError::Network(format!("HTTP {}", s)));
        }
        _ => {}
    }

    res.json::<WidgetPayload>()
        .await
        .map_err(|e| PollError::Decode(e.to_string()))
}

// Fallback base URL if no env var is set. Points at the Cloudflare Pages
// deploy alias.
pub fn default_base_url() -> String {
    std::env::var("OBOL_BASE_URL").unwrap_or_else(|_| "https://useobol.pages.dev".to_string())
}
