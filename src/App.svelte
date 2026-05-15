<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import Dashboard from "$lib/components/Dashboard.svelte";
  import SetupScreen from "$lib/components/SetupScreen.svelte";
  import { token } from "$lib/stores/token";
  import { widget } from "$lib/stores/widget";
  import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";
  import { listen } from "@tauri-apps/api/event";
  import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";

  let ready = false;
  let unlistenMove: (() => void) | null = null;
  let unlistenUpdate: (() => void) | null = null;

  // Debounce timer for saving window position.
  let positionSaveTimer: ReturnType<typeof setTimeout> | null = null;

  // Update banner state. Populated by Rust side emitting `update-available`
  // after a successful manifest check (~5s after startup). Null = no update.
  let available: { version: string; notes: string } | null = null;
  let installing = false;
  let installError = "";

  async function installUpdate() {
    if (installing) return;
    installing = true;
    installError = "";
    try {
      const u = await checkForUpdate();
      if (!u) {
        available = null;
        return;
      }
      await u.downloadAndInstall();
      await relaunch();
    } catch (err) {
      installError = (err as Error).message;
    } finally {
      installing = false;
    }
  }

  onMount(async () => {
    await widget.wire();
    await token.load();
    ready = true;

    // Subscribe to the Rust side's update-available event. Fires at most
    // once per app session, ~5s after startup (see spawn_update_check).
    unlistenUpdate = await listen<{ version: string; notes: string }>(
      "update-available",
      (e) => {
        available = e.payload;
      },
    );

    const win = getCurrentWindow();

    // Restore saved position (validated against current monitors).
    const saved = localStorage.getItem("window_pos");
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved) as { x: number; y: number };
        const { availableMonitors } = await import("@tauri-apps/api/window");
        const monitors = await availableMonitors();
        const inBounds = monitors.some((m) => {
          const mx = m.position.x;
          const my = m.position.y;
          const mw = m.size.width / m.scaleFactor;
          const mh = m.size.height / m.scaleFactor;
          return x >= mx - 50 && x < mx + mw && y >= my - 50 && y < my + mh;
        });
        if (inBounds) {
          await win.setPosition(new LogicalPosition(x, y));
        } else {
          localStorage.removeItem("window_pos");
        }
      } catch {
        // Stale or malformed — ignore.
      }
    }

    // Persist position whenever the window is moved.
    unlistenMove = await win.onMoved(({ payload }) => {
      if (positionSaveTimer) clearTimeout(positionSaveTimer);
      positionSaveTimer = setTimeout(() => {
        localStorage.setItem(
          "window_pos",
          JSON.stringify({ x: payload.x, y: payload.y }),
        );
      }, 300);
    });

    // Idle detection: heartbeat on any user interaction
    document.addEventListener("pointerdown", heartbeat);
    document.addEventListener("keydown", heartbeat);
    window.addEventListener("focus", heartbeat);
    heartbeat(); // initial heartbeat on mount
  });

  // ── Idle detection heartbeat ─────────────────────────────────────────
  // Sends a heartbeat to Rust on user activity (throttled to once/60s).
  // Polling pauses after 10 min of no heartbeat.
  let lastHeartbeat = 0;
  function heartbeat(): void {
    const now = Date.now();
    if (now - lastHeartbeat > 60_000) {
      lastHeartbeat = now;
      invoke("cmd_heartbeat").catch(() => undefined);
    }
  }

  onDestroy(() => {
    widget.dispose();
    if (unlistenMove) unlistenMove();
    if (unlistenUpdate) unlistenUpdate();
    if (positionSaveTimer) clearTimeout(positionSaveTimer);
    document.removeEventListener("pointerdown", heartbeat);
    document.removeEventListener("keydown", heartbeat);
    window.removeEventListener("focus", heartbeat);
  });
</script>

<main class="h-screen w-screen overflow-hidden bg-background text-foreground">
  {#if !ready}
    <div class="flex h-full items-center justify-center">
      <p class="font-mono text-xs text-muted-foreground">Loading…</p>
    </div>
  {:else if $token}
    <Dashboard />
  {:else}
    <SetupScreen />
  {/if}

  {#if available}
    <!-- Bottom-right update banner. Dismissible; installation is
         user-initiated via the button. -->
    <div
      class="pointer-events-auto fixed bottom-3 right-3 z-50 max-w-[280px] rounded-md border border-border bg-card/95 p-3 shadow-lg backdrop-blur"
    >
      <p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Update available
      </p>
      <p class="mt-1 text-sm text-foreground">
        Obol <span class="font-mono">{available.version}</span>
      </p>
      {#if available.notes}
        <p class="mt-1 line-clamp-3 text-[11px] text-muted-foreground">
          {available.notes}
        </p>
      {/if}
      {#if installError}
        <p class="mt-2 font-mono text-[10px] text-destructive">{installError}</p>
      {/if}
      <div class="mt-2 flex items-center gap-2">
        <button
          type="button"
          on:click={installUpdate}
          disabled={installing}
          class="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {installing ? "Installing…" : "Update & restart"}
        </button>
        <button
          type="button"
          on:click={() => (available = null)}
          disabled={installing}
          class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Later
        </button>
      </div>
    </div>
  {/if}
</main>
