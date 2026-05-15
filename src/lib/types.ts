// ⚠ Keep in sync with WidgetPayload in the Obol repo at
// src/routes/api/desktop/widget/+server.ts — if you change one, change
// the other in the same commit or the widget will crash on the next
// deploy.

export type MoodSeverity = "chill" | "warm" | "hot" | "fire" | "meltdown";

export interface MoodTier {
  face: string;
  quote: string;
  subtitle: string;
  severity: MoodSeverity;
}

export interface ProxyRequest {
  id: string;
  model: string;
  provider: string;
  cost_cents: number;
  latency_ms: number;
  status_code: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  created_at: string;
}

export interface ProxyStats {
  active: boolean;
  error_rate: number;
  cache_hit_rate: number;
  rpm: number;
  total_requests_today: number;
  recent_requests: ProxyRequest[];
}

export interface PeriodAlertSlot {
  threshold_cents: number;
  spent_cents: number;
  pct: number;
}

export interface ForecastDetail {
  projected_total_cents: number;
  daily_average_cents: number;
  days_remaining: number;
  confidence: "low" | "medium" | "high";
  over_budget_cents: number | null;
}

export interface CacheStats {
  hit_rate_pct: number;
  savings_cents: number;
  potential_additional_savings_cents: number;
}

export interface AnomalyInfo {
  delta_cents: number;
  median_cents: number;
  modified_z: number;
}

export interface WidgetPayload {
  month_spend_cents: number;
  prev_month_spend_cents: number;
  today_spend_cents: number;
  budget_cents: number;
  budget_percent: number;
  mood: MoodTier;
  top_model: {
    display: string;
    provider: string;
    cost_cents: number;
  } | null;
  daily_series: Array<{ date: string; cents: number }>;
  forecast_month_cents: number | null;
  active_connections: number;
  updated_at: string;
  // v2 fields
  provider_breakdown?: Array<{ provider: string; cents: number }>;
  forecast?: ForecastDetail | null;
  period_alerts?: {
    daily: PeriodAlertSlot | null;
    weekly: PeriodAlertSlot | null;
    monthly: PeriodAlertSlot | null;
  };
  cache?: CacheStats | null;
  anomaly?: AnomalyInfo | null;
  proxy?: ProxyStats | null;
}

export type ApiErrorKind =
  | "unauthenticated"
  | "rate-limited"
  | "trial_expired"
  | "offline"
  | "network";

export interface TrialExpiredPayload {
  error: string;
  message: string;
  upgrade_url: string;
  trial_started_at: string;
  trial_ends_at: string;
}
