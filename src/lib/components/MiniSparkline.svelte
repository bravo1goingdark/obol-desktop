<script lang="ts">
  // Inline-SVG 14-day trend. Pure Svelte math — no Chart.js dep. The
  // line uses the same `hsl(var(--primary))` token as the web overview
  // so it picks up dark/light mode changes for free.
  import { formatCents } from "$lib/formatters";

  export let data: Array<{ date: string; cents: number }>;

  const width = 280;
  const height = 60;
  const pad = 4;

  $: maxCents = Math.max(1, ...data.map((d) => d.cents));
  $: points = data.map((d, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1);
    const y = height - pad - (d.cents / maxCents) * (height - pad * 2);
    return { x, y };
  });
  $: linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  $: areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${height - pad} L${points[0].x.toFixed(1)},${height - pad} Z`
      : "";

  let hoveredIndex: number | null = null;

  function formatDate(iso: string): string {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Band width for hit areas
  $: bandWidth = data.length > 1 ? (width - pad * 2) / (data.length - 1) : width;
</script>

{#if data.length > 0}
  <div class="relative">
    <svg
      viewBox="0 0 {width} {height}"
      width="100%"
      height="60"
      preserveAspectRatio="none"
      class="overflow-visible"
      role="img"
      aria-label="14-day spend trend"
      on:mouseleave={() => (hoveredIndex = null)}
    >
      <path d={areaPath} fill="hsl(var(--primary))" fill-opacity="0.08" />
      <path
        d={linePath}
        fill="none"
        stroke="hsl(var(--primary))"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Hover circles -->
      {#each points as pt, i}
        {#if hoveredIndex === i}
          <circle
            cx={pt.x}
            cy={pt.y}
            r="3"
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            stroke-width="1.5"
          />
        {/if}
      {/each}

      <!-- Invisible hit bands, one per data point. aria-hidden because the
           parent SVG already carries the accessible label for the chart. -->
      {#each points as pt, i}
        <rect
          role="presentation"
          x={pt.x - bandWidth / 2}
          y={0}
          width={bandWidth}
          height={height}
          fill="transparent"
          on:mouseenter={() => (hoveredIndex = i)}
        />
      {/each}
    </svg>

    <!-- Floating tooltip -->
    {#if hoveredIndex !== null}
      {@const pt = points[hoveredIndex]}
      {@const d = data[hoveredIndex]}
      {@const pctX = (pt.x / width) * 100}
      <div
        class="pointer-events-none absolute -top-8 z-10 rounded border border-border bg-card px-2 py-1 font-mono text-[9px] shadow-sm whitespace-nowrap"
        style="left: {pctX}%; transform: translateX(-50%)"
      >
        <span class="text-muted-foreground">{formatDate(d.date)}</span>
        <span class="ml-1 text-foreground">{formatCents(d.cents)}</span>
      </div>
    {/if}
  </div>
{:else}
  <div class="flex h-[60px] items-center justify-center text-[10px] text-muted-foreground">
    no data yet
  </div>
{/if}
