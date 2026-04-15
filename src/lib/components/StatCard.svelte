<script lang="ts">
  // Copied from Obol's StatCard.svelte with the CountUp animation
  // dropped — the widget is too small for the scroll-by effect to read
  // cleanly, and CountUp would add an unnecessary dep to the bundle.
  import { formatCents } from "$lib/formatters";

  export let label: string;
  export let value: string | null = null;
  export let rawCents: number | null = null;
  export let subtitle: string | null = null;
  export let accent: "primary" | "emerald" | "amber" | "muted" | "none" = "none";

  const accentClass: Record<typeof accent, string> = {
    primary: "from-primary/60 via-primary/30 to-transparent",
    emerald: "from-emerald-500/60 via-emerald-500/20 to-transparent",
    amber: "from-amber-500/60 via-amber-500/20 to-transparent",
    muted: "from-muted-foreground/40 via-muted-foreground/15 to-transparent",
    none: "from-transparent to-transparent",
  };

  $: displayValue =
    rawCents !== null ? formatCents(rawCents) : (value ?? "—");
</script>

<div
  class="group relative min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/30"
>
  {#if accent !== "none"}
    <div
      class={`pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accentClass[accent]}`}
    ></div>
  {/if}

  <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
    {label}
  </p>
  <p
    class={"mt-2 truncate font-display " +
      (displayValue.length > 12 ? "text-xl" : "text-2xl")}
    title={displayValue}
  >
    {displayValue}
  </p>
  {#if subtitle}
    <p class="mt-0.5 truncate text-[10px] text-muted-foreground">{subtitle}</p>
  {/if}
</div>
