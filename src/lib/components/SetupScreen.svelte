<script lang="ts">
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { token } from "$lib/stores/token";
  import { widget } from "$lib/stores/widget";

  let input = "";
  let saving = false;
  let error = "";

  // Surface the stale "unauthenticated" error from the widget store on
  // first render — that's the signal that we just got bounced back
  // from the Dashboard because the token was revoked or rotated.
  $: rejectedByServer = $widget.error === "unauthenticated";

  async function connect(): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed.startsWith("obol_pat_")) {
      error = "Token should start with obol_pat_";
      return;
    }
    saving = true;
    error = "";
    widget.clearError();
    try {
      await token.save(trimmed);
      input = "";
      // The save() call also kicks the Rust poller; if the token is
      // bad, the poller will emit `widget-error: unauthenticated`
      // within ~1 second and the widget store will auto-clear the
      // keychain, bouncing us back here with rejectedByServer = true.
      await widget.refresh();
    } catch (err) {
      error = (err as Error).message;
    } finally {
      saving = false;
    }
  }

  async function openSettings(): Promise<void> {
    await openUrl("https://useobol.pages.dev/settings?tab=api");
  }
</script>

<div class="flex h-full flex-col">
  <!-- Titlebar drag region. Uses `data-tauri-drag-region` rather than
       CSS `-webkit-app-region: drag` because the latter is macOS-only
       — Tauri's webkit2gtk + WebView2 runtimes detect the attribute on
       mousedown and start an OS-level drag. -->
  <div
    data-tauri-drag-region
    class="flex h-8 items-center justify-center border-b border-border text-[10px] uppercase tracking-widest text-muted-foreground"
  >
    Obol · setup
  </div>

  <div class="flex flex-1 flex-col justify-center gap-4 p-6">
    <div>
      <h1 class="font-display text-3xl">Welcome to Obol.</h1>
      <p class="mt-1 text-xs text-muted-foreground">
        Paste a personal access token to connect this widget to your
        account.
      </p>
    </div>

    {#if rejectedByServer}
      <div class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[11px] text-destructive">
        The previous token was rejected by Obol (revoked, expired, or
        never valid). Create a new one at useobol.pages.dev → Settings →
        API and paste it below.
      </div>
    {/if}

    <form on:submit|preventDefault={connect} class="space-y-3">
      <label class="block">
        <span class="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Personal access token
        </span>
        <input
          type="password"
          bind:value={input}
          placeholder="obol_pat_…"
          autocomplete="off"
          spellcheck="false"
          class="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
        />
      </label>

      {#if error}
        <p class="font-mono text-[11px] text-destructive">{error}</p>
      {/if}

      <button
        type="submit"
        disabled={saving || !input.trim()}
        class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Connecting…" : "Connect"}
      </button>

      <button
        type="button"
        on:click={openSettings}
        class="block w-full text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        Create a token on useobol.pages.dev →
      </button>
    </form>
  </div>
</div>
