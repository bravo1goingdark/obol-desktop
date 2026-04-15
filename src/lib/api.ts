import { ApiError, type WidgetPayload } from "./types";

// Default: production Obol. Override via `VITE_OBOL_URL` in .env for
// development against a local wrangler dev server.
const BASE =
  (import.meta.env.VITE_OBOL_URL as string | undefined) ??
  "https://useobol.pages.dev";

export async function fetchWidget(token: string): Promise<WidgetPayload> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/desktop/widget`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new ApiError("network", (err as Error).message);
  }
  if (res.status === 401) throw new ApiError("unauthenticated");
  if (res.status === 429) throw new ApiError("rate-limited");
  if (!res.ok) throw new ApiError("network", `HTTP ${res.status}`);
  return (await res.json()) as WidgetPayload;
}
