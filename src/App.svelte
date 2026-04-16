<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Dashboard from "$lib/components/Dashboard.svelte";
  import SetupScreen from "$lib/components/SetupScreen.svelte";
  import { token } from "$lib/stores/token";
  import { widget } from "$lib/stores/widget";
  import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";

  let ready = false;
  let unlistenMove: (() => void) | null = null;

  // Debounce timer for saving window position.
  let positionSaveTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(async () => {
    await widget.wire();
    await token.load();
    ready = true;

    const win = getCurrentWindow();

    // Restore saved position.
    const saved = localStorage.getItem("window_pos");
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved) as { x: number; y: number };
        await win.setPosition(new LogicalPosition(x, y));
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
  });

  onDestroy(() => {
    widget.dispose();
    if (unlistenMove) unlistenMove();
    if (positionSaveTimer) clearTimeout(positionSaveTimer);
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
</main>
