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
}

export type ApiErrorKind =
  | "unauthenticated"
  | "rate-limited"
  | "trial_expired"
  | "offline"
  | "network";

export interface TrialExpiredPayload {
  message: string;
  upgrade_url: string;
  trial_ends_at: string;
}
