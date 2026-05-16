// Widget store — holds the current WidgetPayload + error/loading state.
// Subscribes to the Rust side's `widget-update` and `widget-error`
// events, which fire after each polling tick. Also exposes a manual
// `refresh()` that calls `cmd_refresh_now` on the Rust side.
import { writable } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { token } from "./token";
import type { ApiErrorKind, TrialExpiredPayload, WidgetPayload } from "$lib/types";

export interface WidgetState {
  payload: WidgetPayload | null;
  loading: boolean;
  error: ApiErrorKind | null;
  trialExpired: TrialExpiredPayload | null;
  lastUpdatedAt: string | null;
}

const initial: WidgetState = {
  payload: null,
  loading: false,
  error: null,
  trialExpired: null,
  lastUpdatedAt: null,
};

function create() {
  const { subscribe, update } = writable<WidgetState>(initial);
  const unsubs: UnlistenFn[] = [];
  // Cleared by widget-update and widget-error events. Guards against the poll
  // loop being skipped (paused / idle / trial-expired) after refresh() sets
  // loading=true, which would leave the spinner running indefinitely.
  let loadingTimeout: ReturnType<typeof setTimeout> | null = null;

  function clearLoadingTimeout(): void {
    if (loadingTimeout !== null) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }
  }

  async function wire(): Promise<void> {
    // Successful fetch — Rust emits the full WidgetPayload as the event
    // payload.
    unsubs.push(
      await listen<WidgetPayload>("widget-update", (ev) => {
        clearLoadingTimeout();
        update((s) => ({
          ...s,
          payload: ev.payload,
          loading: false,
          error: null,
          lastUpdatedAt: ev.payload.updated_at,
        }));
      }),
    );
    // Trial expired — Rust emits a structured payload with upgrade metadata.
    unsubs.push(
      await listen<TrialExpiredPayload>("widget-trial-expired", (ev) => {
        update((s) => ({
          ...s,
          trialExpired: ev.payload,
        }));
      }),
    );
    // Failed fetch — Rust emits a string tag matching ApiErrorKind.
    unsubs.push(
      await listen<ApiErrorKind>("widget-error", (ev) => {
        clearLoadingTimeout();
        update((s) => ({
          ...s,
          loading: false,
          error: ev.payload,
          // Drop the stale payload on auth errors so the Dashboard
          // doesn't briefly flash numbers from a revoked session.
          payload: ev.payload === "unauthenticated" ? null : s.payload,
        }));
        // Revoked tokens can't recover — purge the keychain entry so
        // App.svelte flips back to SetupScreen on the next tick. The
        // error tag is preserved in the store so SetupScreen can show
        // "Token was rejected" inline.
        if (ev.payload === "unauthenticated") {
          token.clear().catch(() => undefined);
        }
      }),
    );
  }

  /** Explicit reset — called by SetupScreen when the user retypes a token. */
  function clearError(): void {
    update((s) => ({ ...s, error: null }));
  }

  async function refresh(): Promise<void> {
    clearLoadingTimeout();
    update((s) => ({ ...s, loading: true }));
    // If the poll loop is skipped (paused / idle / trial-expired / no token),
    // Rust won't emit widget-update or widget-error. Clear the spinner after
    // 15 s so the UI doesn't stay in a permanent loading state.
    loadingTimeout = setTimeout(() => {
      loadingTimeout = null;
      update((s) => (s.loading ? { ...s, loading: false } : s));
    }, 15_000);
    try {
      await invoke("cmd_refresh_now");
    } catch (err) {
      clearLoadingTimeout();
      update((s) => ({ ...s, loading: false, error: "network" }));
      console.error("refresh failed", err);
    }
  }

  function dispose(): void {
    for (const u of unsubs) u();
  }

  return { subscribe, wire, refresh, clearError, dispose };
}

export const widget = create();
