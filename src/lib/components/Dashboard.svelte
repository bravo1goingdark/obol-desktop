<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import ErrorBanner from "$lib/components/ErrorBanner.svelte";
  import MiniSparkline from "$lib/components/MiniSparkline.svelte";
  import MoodMeter from "$lib/components/MoodMeter.svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import { formatCentsCompact, formatRelative } from "$lib/formatters";
  import { theme } from "$lib/stores/theme";
  import { widget } from "$lib/stores/widget";

  let showSettings = false;
  let autostart = false;
  let autostartLoading = false;

  onMount(async () => {
    widget.refresh();
    try {
      autostart = await invoke<boolean>("cmd_get_autostart");
    } catch {
      // Not fatal — autostart may be unavailable on some platforms.
    }
  });

  function toggleTheme(): void {
    theme.toggle();
  }

  async function openDashboard(): Promise<void> {
    await openUrl("https://useobol.pages.dev/overview");
  }

  async function setAutostart(enabled: boolean): Promise<void> {
    autostartLoading = true;
    try {
      await invoke("cmd_set_autostart", { enabled });
      autostart = enabled;
    } catch (err) {
      console.error("autostart toggle failed", err);
    } finally {
      autostartLoading = false;
    }
  }

  /** Returns subtitle for the "This month" card showing delta vs prev month.
   *  Expressed as a percentage change + arrow so users can see trend at a glance. */
  function prevMonthSubtitle(current: number, prev: number): string {
    if (prev === 0) return "";
    const diff = current - prev;
    const pct = Math.round((Math.abs(diff) / prev) * 100);
    if (diff > 0) return `↑ ${pct}% vs ${formatCentsCompact(prev)}`;
    if (diff < 0) return `↓ ${pct}% vs ${formatCentsCompact(prev)}`;
    return `= ${formatCentsCompact(prev)}`;
  }
</script>

<div class="flex h-full flex-col">
  <!-- Frameless titlebar. `data-tauri-drag-region` is detected by Tauri's
       webview runtimes (webkit2gtk + WebView2) on mousedown to start an
       OS-level drag. The button group is a sibling WITHOUT the attribute
       so its clicks remain interactive. -->
  <div class="flex h-8 flex-shrink-0 items-center border-b border-border">
    <div
      data-tauri-drag-region
      class="flex flex-1 items-center px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Obol
    </div>
    <div class="flex items-center gap-1 pr-2">
      <!-- Refresh -->
      <button
        type="button"
        on:click={widget.refresh}
        title="Refresh"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Refresh"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
      <!-- Open in browser -->
      <button
        type="button"
        on:click={openDashboard}
        title="Open in browser"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open in browser"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>
      <!-- Settings toggle -->
      <button
        type="button"
        on:click={() => (showSettings = !showSettings)}
        title="Settings"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Settings"
        class:text-foreground={showSettings}
        class:bg-muted={showSettings}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <!-- Theme toggle -->
      <button
        type="button"
        on:click={toggleTheme}
        title="Toggle theme"
        class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Toggle theme"
      >
        {#if $theme === "dark"}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        {:else}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>

  <!-- Settings panel (slide in below titlebar) -->
  {#if showSettings}
    <div class="flex-shrink-0 border-b border-border bg-card px-4 py-2">
      <label class="flex cursor-pointer items-center justify-between">
        <span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Launch at login
        </span>
        <!-- Toggle switch -->
        <button
          type="button"
          role="switch"
          aria-checked={autostart}
          disabled={autostartLoading}
          on:click={() => setAutostart(!autostart)}
          class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors disabled:opacity-50
            {autostart ? 'bg-primary' : 'bg-muted'}"
        >
          <span
            class="inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform
              {autostart ? 'translate-x-3.5' : 'translate-x-0.5'}"
          ></span>
        </button>
      </label>
    </div>
  {/if}

  <!-- Error banner (unauthenticated / offline / rate-limited) -->
  {#if $widget.error}
    <div class="flex-shrink-0 pt-2">
      <ErrorBanner kind={$widget.error} />
    </div>
  {/if}

  <!-- Scroll container for the payload -->
  <div class="flex-1 overflow-y-auto p-4 scroll-hidden">
    {#if !$widget.payload}
      <div class="flex h-full items-center justify-center">
        <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {$widget.loading ? "Loading…" : "No data yet"}
        </p>
      </div>
    {:else}
      {@const p = $widget.payload}
      <!-- Mood meter card — same visual weight as /overview -->
      <div class="mb-3 rounded-lg border border-border bg-card p-4">
        <MoodMeter mood={p.mood} />
        {#if p.budget_cents > 0}
          <div class="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              class={"h-full transition-all duration-500 " +
                (p.budget_percent < 75
                  ? "bg-primary"
                  : p.budget_percent < 100
                    ? "bg-amber-500"
                    : "bg-destructive")}
              style={`width: ${Math.min(100, p.budget_percent).toFixed(1)}%`}
            ></div>
          </div>
          <p class="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {p.budget_percent.toFixed(0)}% of ${(p.budget_cents / 100).toFixed(0)} budget
          </p>
        {/if}
      </div>

      <!-- Two-column KPI strip -->
      <div class="mb-3 grid grid-cols-2 gap-3">
        <StatCard
          label="This month"
          rawCents={p.month_spend_cents}
          accent="primary"
          subtitle={p.prev_month_spend_cents > 0
            ? prevMonthSubtitle(p.month_spend_cents, p.prev_month_spend_cents)
            : null}
        />
        <StatCard
          label="Today"
          rawCents={p.today_spend_cents}
          accent="muted"
        />
      </div>

      <!-- Top model + forecast -->
      <div class="mb-3 grid grid-cols-2 gap-3">
        <StatCard
          label="Top model"
          value={p.top_model?.display ?? "—"}
          subtitle={p.top_model
            ? formatCentsCompact(p.top_model.cost_cents)
            : null}
          accent="emerald"
        />
        <StatCard
          label="Forecast"
          rawCents={p.forecast_month_cents ?? 0}
          subtitle={p.forecast_month_cents === null ? "pro only" : "month end"}
          accent={p.forecast_month_cents === null ? "none" : "amber"}
        />
      </div>

      <!-- 14-day trend sparkline -->
      <div class="mb-3 rounded-lg border border-border bg-card p-4">
        <p class="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Last 14 days
        </p>
        <MiniSparkline data={p.daily_series} />
      </div>
    {/if}
  </div>

  <!-- Footer — last updated + connections -->
  <div
    class="flex h-7 flex-shrink-0 items-center justify-between border-t border-border px-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
  >
    <span>
      {$widget.payload ? `updated ${formatRelative($widget.lastUpdatedAt)}` : "—"}
    </span>
    <span>{$widget.payload?.active_connections ?? 0} connections</span>
  </div>
</div>
