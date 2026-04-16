<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { theme } from "$lib/stores/theme";
  import { token } from "$lib/stores/token";

  const dispatch = createEventDispatcher<{ back: void }>();

  // ── Autostart ────────────────────────────────────────────────────────────
  let autostart = false;
  let autostartLoading = false;

  // ── Poll interval ─────────────────────────────────────────────────────────
  const POLL_OPTIONS = [
    { label: "1 min",  value: 60 },
    { label: "2 min",  value: 120 },
    { label: "5 min",  value: 300 },
    { label: "15 min", value: 900 },
  ];
  let pollInterval = 120;

  // ── Daily limit ───────────────────────────────────────────────────────────
  let dailyLimitDollars = "";

  // ── Sign out ──────────────────────────────────────────────────────────────
  let signingOut = false;

  onMount(async () => {
    try {
      autostart = await invoke<boolean>("cmd_get_autostart");
    } catch { /* autostart unavailable on this platform */ }

    const savedInterval = localStorage.getItem("poll_interval_secs");
    if (savedInterval) {
      const n = parseInt(savedInterval, 10);
      if (POLL_OPTIONS.some((o) => o.value === n)) pollInterval = n;
    } else {
      pollInterval = await invoke<number>("cmd_get_poll_interval").catch(() => 120);
    }

    const savedLimit = localStorage.getItem("daily_limit_cents");
    if (savedLimit) {
      const cents = parseInt(savedLimit, 10);
      if (cents > 0) dailyLimitDollars = (cents / 100).toFixed(2);
    }
  });

  async function toggleAutostart(): Promise<void> {
    autostartLoading = true;
    try {
      await invoke("cmd_set_autostart", { enabled: !autostart });
      autostart = !autostart;
    } catch { /* ignore */ } finally {
      autostartLoading = false;
    }
  }

  async function onPollChange(e: Event): Promise<void> {
    const secs = parseInt((e.target as HTMLSelectElement).value, 10);
    pollInterval = secs;
    localStorage.setItem("poll_interval_secs", String(secs));
    await invoke("cmd_set_poll_interval", { secs }).catch(() => undefined);
  }

  async function onDailyLimitBlur(): Promise<void> {
    const dollars = parseFloat(dailyLimitDollars);
    const cents = isNaN(dollars) || dollars <= 0 ? 0 : Math.round(dollars * 100);
    dailyLimitDollars = cents > 0 ? (cents / 100).toFixed(2) : "";
    localStorage.setItem("daily_limit_cents", String(cents));
    await invoke("cmd_set_daily_limit", { cents }).catch(() => undefined);
  }

  async function signOut(): Promise<void> {
    signingOut = true;
    await token.clear();
    // token going null causes App.svelte to render SetupScreen automatically.
  }
</script>

<div class="flex h-full flex-col">

  <!-- Titlebar -->
  <div class="flex h-8 flex-shrink-0 items-center border-b border-border">
    <button
      type="button"
      on:click={() => dispatch("back")}
      aria-label="Back"
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
    <div
      data-tauri-drag-region
      class="flex flex-1 items-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
    >
      Settings
    </div>
    <!-- Theme toggle lives here too for quick access -->
    <button
      type="button"
      on:click={() => theme.toggle()}
      title="Toggle theme"
      aria-label="Toggle theme"
      class="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
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

  <!-- Scrollable settings body -->
  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-5 scroll-hidden">

    <!-- ── STARTUP ─────────────────────────────────────────── -->
    <section>
      <p class="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        Startup
      </p>
      <div class="rounded-lg border border-border bg-card overflow-hidden">
        <!-- Launch at login -->
        <div class="px-4 py-3">
          <div class="flex items-center justify-between">
            <span class="text-[13px] font-medium">Launch at login</span>
            <button
              type="button"
              role="switch"
              aria-checked={autostart}
              disabled={autostartLoading}
              on:click={toggleAutostart}
              class="relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-40
                {autostart ? 'bg-primary' : 'bg-muted'}"
            >
              <span
                class="inline-block h-3 w-3 transform rounded-full bg-background shadow transition-transform
                  {autostart ? 'translate-x-3.5' : 'translate-x-0.5'}"
              ></span>
            </button>
          </div>
          <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
            Opens Obol automatically when your computer starts.
          </p>
        </div>
      </div>
    </section>

    <!-- ── DATA ──────────────────────────────────────────────── -->
    <section>
      <p class="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        Data
      </p>
      <div class="rounded-lg border border-border bg-card overflow-hidden">
        <!-- Refresh interval -->
        <div class="px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <span class="text-[13px] font-medium">Refresh every</span>
            <!-- Wrapper strips native chrome so bg/text tokens render correctly in both
                 light and dark mode. The SVG caret replaces the native arrow. -->
            <div class="relative">
              <select
                value={pollInterval}
                on:change={onPollChange}
                class="appearance-none rounded-md border border-border bg-background py-1 pl-2 pr-6 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {#each POLL_OPTIONS as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
              <svg
                class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                width="10" height="10" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
            How often to pull the latest spend data from Obol.
          </p>
        </div>
      </div>
    </section>

    <!-- ── ALERTS ─────────────────────────────────────────────── -->
    <section>
      <p class="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        Alerts
      </p>
      <div class="rounded-lg border border-border bg-card overflow-hidden">
        <!-- Daily spend limit -->
        <div class="px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <span class="text-[13px] font-medium">Daily spend limit</span>
            <div class="relative">
              <span class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="—"
                bind:value={dailyLimitDollars}
                on:blur={onDailyLimitBlur}
                class="w-20 rounded-md border border-border bg-background py-1 pl-5 pr-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
            Send a notification when today's spend crosses this threshold. Leave blank to disable.
          </p>
        </div>
      </div>
    </section>

    <!-- ── ACCOUNT ────────────────────────────────────────────── -->
    <section>
      <p class="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
        Account
      </p>
      <div class="rounded-lg border border-border bg-card overflow-hidden">
        <div class="px-4 py-3">
          <button
            type="button"
            disabled={signingOut}
            on:click={signOut}
            class="rounded-md border border-destructive/50 px-3 py-1.5 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
            Removes your token from the keychain and returns to the setup screen.
          </p>
        </div>
      </div>
    </section>

  </div>
</div>
