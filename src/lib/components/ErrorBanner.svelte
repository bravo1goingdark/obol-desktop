<script lang="ts">
  import type { ApiErrorKind } from "$lib/types";
  import { token } from "$lib/stores/token";
  import { widget } from "$lib/stores/widget";

  export let kind: ApiErrorKind;

  const messages: Record<ApiErrorKind, string> = {
    unauthenticated: "Token invalid or revoked. Connect again.",
    "rate-limited": "Rate limit reached. Retrying in a moment.",
    offline: "Offline. Showing cached data.",
    network: "Couldn't reach Obol. Retrying next tick.",
  };

  async function reconnect(): Promise<void> {
    await token.clear();
  }
</script>

<div
  class={"mx-4 mb-2 flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-[10px] " +
    (kind === "unauthenticated"
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400")}
>
  <span class="truncate">{messages[kind]}</span>
  {#if kind === "unauthenticated"}
    <button
      type="button"
      on:click={reconnect}
      class="flex-shrink-0 font-mono uppercase tracking-wider hover:underline"
    >
      Reconnect
    </button>
  {:else}
    <button
      type="button"
      on:click={widget.refresh}
      class="flex-shrink-0 font-mono uppercase tracking-wider hover:underline"
    >
      Retry
    </button>
  {/if}
</div>
