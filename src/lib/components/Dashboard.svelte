<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import ErrorBanner from "$lib/components/ErrorBanner.svelte";
  import MiniSparkline from "$lib/components/MiniSparkline.svelte";
  import MoodMeter from "$lib/components/MoodMeter.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import type SettingsPageType from "$lib/components/SettingsPage.svelte";
  let SettingsPage: typeof SettingsPageType | null = null;
  async function openSettings(): Promise<void> {
    if (!SettingsPage) {
      SettingsPage = (await import("$lib/components/SettingsPage.svelte")).default;
    }
    showSettings = true;
  }
  import StatCard from "$lib/components/StatCard.svelte";
  import { formatCents, formatCentsCompact, formatRelative } from "$lib/formatters";
  import { theme } from "$lib/stores/theme";
  import { widget } from "$lib/stores/widget";

  let showSettings = false;
  let csvExported = false;
  let csvExportTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Cost-since-last-open delta ──────────────────────────────────────────
  let deltaCents: number | null = null;
  let deltaVisible = false;

  function computeDelta(currentCents: number): void {
    const key = "obol_last_seen_today_cents";
    const prev = localStorage.getItem(key);
    if (prev !== null) {
      const diff = currentCents - parseInt(prev, 10);
      if (diff > 0) {
        deltaCents = diff;
        deltaVisible = true;
        setTimeout(() => (deltaVisible = false), 5000);
      }
    }
    localStorage.setItem(key, String(currentCents));
  }

  // ── Focus / DND mode ────────────────────────────────────────────────────
  let focusMode = localStorage.getItem("obol_focus_mode") === "true";

  function toggleFocus(): void {
    focusMode = !focusMode;
    localStorage.setItem("obol_focus_mode", String(focusMode));
    invoke("cmd_set_focus_mode", { enabled: focusMode }).catch(() => undefined);
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  function handleKeydown(e: KeyboardEvent): void {
    if (showSettings) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    switch (e.key.toLowerCase()) {
      case "r":
        widget.refresh();
        break;
      case "c": {
        const cost = $widget.payload?.today_spend_cents;
        if (cost != null) navigator.clipboard.writeText(formatCents(cost));
        break;
      }
      case "escape":
        getCurrentWindow().hide();
        break;
    }
  }

  onMount(async () => {
    widget.refresh();

    const savedInterval = localStorage.getItem("poll_interval_secs");
    if (savedInterval) {
      const secs = parseInt(savedInterval, 10);
      await invoke("cmd_set_poll_interval", { secs }).catch(() => undefined);
    }
    const savedLimit = localStorage.getItem("daily_limit_cents");
    if (savedLimit) {
      const cents = parseInt(savedLimit, 10);
      if (cents > 0) await invoke("cmd_set_daily_limit", { cents }).catch(() => undefined);
    }

    // Sync focus mode to backend on startup
    if (focusMode) {
      invoke("cmd_set_focus_mode", { enabled: true }).catch(() => undefined);
    }

    document.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", handleKeydown);
  });

  // Compute delta when first payload arrives
  $: if ($widget.payload && deltaCents === null) {
    computeDelta($widget.payload.today_spend_cents);
  }

  async function openDashboard(): Promise<void> {
    await openUrl("https://useobol.pages.dev/overview");
  }

  function exportCsv(series: Array<{ date: string; cents: number }>): void {
    const rows = ["date,usd"];
    for (const { date, cents } of series) {
      rows.push(`${date},${(cents / 100).toFixed(4)}`);
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "obol-14day.csv";
    a.click();
    URL.revokeObjectURL(url);

    // Show confirmation for 2 s.
    csvExported = true;
    if (csvExportTimer) clearTimeout(csvExportTimer);
    csvExportTimer = setTimeout(() => (csvExported = false), 2000);
  }

  function prevMonthSubtitle(current: number, prev: number): string {
    if (prev === 0) return "";
    const diff = current - prev;
    const pct = Math.round((Math.abs(diff) / prev) * 100);
    if (diff > 0) return `↑ ${pct}% vs ${formatCentsCompact(prev)}`;
    if (diff < 0) return `↓ ${pct}% vs ${formatCentsCompact(prev)}`;
    return `= ${formatCentsCompact(prev)}`;
  }
</script>

{#if showSettings && SettingsPage}
  <svelte:component this={SettingsPage} on:back={() => (showSettings = false)} />
{:else}
  <div class="flex h-full flex-col">
    <!-- Frameless titlebar -->
    <div class="flex h-8 flex-shrink-0 items-center border-b border-border">
      <div
        data-tauri-drag-region
        class="flex flex-1 items-center gap-2 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        <Logo size={14} />
        <span>Obol</span>
      </div>
      <div class="flex items-center gap-1 pr-2">
        <!-- Refresh -->
        <button
          type="button"
          on:click={widget.refresh}
          title="Refresh"
          aria-label="Refresh"
          class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
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
          aria-label="Open in browser"
          class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </button>
        <!-- Settings — lazy-loads SettingsPage on first click -->
        <button
          type="button"
          on:click={openSettings}
          title="Settings"
          aria-label="Settings"
          class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <!-- Focus mode toggle -->
        <button
          type="button"
          on:click={toggleFocus}
          title={focusMode ? "Focus mode ON (click to disable)" : "Focus mode (mute notifications)"}
          aria-label="Toggle focus mode"
          class="flex h-6 w-6 items-center justify-center rounded transition-colors
            {focusMode ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            {#if focusMode}
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
            {:else}
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            {/if}
          </svg>
        </button>
        <!-- Theme toggle -->
        <button
          type="button"
          on:click={() => theme.toggle()}
          title="Toggle theme"
          aria-label="Toggle theme"
          class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {#if $theme === "dark"}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          {:else}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          {/if}
        </button>
      </div>
    </div>

    <!-- Error banner -->
    {#if $widget.error}
      <div class="flex-shrink-0 pt-2">
        <ErrorBanner kind={$widget.error} />
      </div>
    {/if}

    <!-- Scroll container -->
    <div class="flex-1 overflow-y-auto p-4 scroll-hidden">
      {#if !$widget.payload}
        <div class="flex h-full items-center justify-center">
          <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {$widget.loading ? "Loading…" : "No data yet"}
          </p>
        </div>
      {:else}
        {@const p = $widget.payload}

        <!-- Cost since last open delta badge -->
        {#if deltaVisible && deltaCents && deltaCents > 0}
          <div class="mb-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5">
            <span class="font-mono text-[10px] text-primary">+{formatCents(deltaCents)}</span>
            <span class="text-[10px] text-muted-foreground">since you last looked</span>
          </div>
        {/if}

        <!-- Mood meter -->
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

        <!-- KPI strip -->
        <div class="mb-3 grid grid-cols-2 gap-3">
          <StatCard
            label="This month"
            rawCents={p.month_spend_cents}
            accent="primary"
            subtitle={p.prev_month_spend_cents > 0
              ? prevMonthSubtitle(p.month_spend_cents, p.prev_month_spend_cents)
              : null}
            copyValue={formatCents(p.month_spend_cents)}
          />
          <StatCard
            label="Today"
            rawCents={p.today_spend_cents}
            accent="muted"
            copyValue={formatCents(p.today_spend_cents)}
          />
        </div>

        <!-- Top model + forecast -->
        <div class="mb-3 grid grid-cols-2 gap-3">
          <StatCard
            label="Top model"
            value={p.top_model?.display ?? "—"}
            subtitle={p.top_model ? `${formatCentsCompact(p.top_model.cost_cents)} · ${p.top_model.provider}` : null}
            accent="emerald"
          />
          <StatCard
            label="Forecast"
            rawCents={p.forecast_month_cents ?? 0}
            subtitle={p.forecast_month_cents === null ? "pro only" : "month end"}
            accent={p.forecast_month_cents === null ? "none" : "amber"}
            copyValue={p.forecast_month_cents !== null
              ? formatCents(p.forecast_month_cents)
              : null}
          />
        </div>

        <!-- Provider concentration bar -->
        {#if p.top_model && p.month_spend_cents > 0}
          {@const pct = Math.min(100, Math.round((p.top_model.cost_cents / p.month_spend_cents) * 100))}
          <div class="mb-3 rounded-lg border border-border bg-card px-4 py-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Spend concentration</span>
              <span class="font-mono text-[9px] text-muted-foreground">{p.active_connections} provider{p.active_connections !== 1 ? 's' : ''}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full bg-emerald-500 transition-all duration-500" style="width: {pct}%"></div>
              </div>
              <span class="font-mono text-[10px] text-foreground">{pct}%</span>
            </div>
            <p class="mt-1 text-[9px] text-muted-foreground">
              {p.top_model.display} ({p.top_model.provider}) is {pct}% of your month
            </p>
          </div>
        {/if}

        <!-- 14-day sparkline -->
        <div class="mb-3 rounded-lg border border-border bg-card p-4">
          <div class="mb-2 flex items-center justify-between">
            <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Last 14 days
            </p>
            {#if p.daily_series.length > 0}
              <button
                type="button"
                on:click={() => exportCsv(p.daily_series)}
                title="Export CSV"
                class="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[9px] transition-colors
                  {csvExported
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
              >
                {#if csvExported}
                  <!-- Checkmark -->
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Exported
                {:else}
                  <!-- Download icon -->
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  CSV
                {/if}
              </button>
            {/if}
          </div>
          <MiniSparkline data={p.daily_series} />
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div
      class="flex h-7 flex-shrink-0 items-center justify-between border-t border-border px-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
    >
      <span>
        {$widget.payload ? `updated ${formatRelative($widget.lastUpdatedAt)}` : "—"}
      </span>
      <span>{$widget.payload?.active_connections ?? 0} connections</span>
    </div>
  </div>
{/if}
