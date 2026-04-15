<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Dashboard from "$lib/components/Dashboard.svelte";
  import SetupScreen from "$lib/components/SetupScreen.svelte";
  import { token } from "$lib/stores/token";
  import { widget } from "$lib/stores/widget";

  let ready = false;

  onMount(async () => {
    await widget.wire();
    await token.load();
    ready = true;
  });

  onDestroy(() => {
    widget.dispose();
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
