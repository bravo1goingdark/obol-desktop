<script lang="ts">
  // Inline-SVG 14-day trend. Pure Svelte math — no Chart.js dep. The
  // line uses the same `hsl(var(--primary))` token as the web overview
  // so it picks up dark/light mode changes for free.
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
</script>

{#if data.length > 0}
  <svg
    viewBox="0 0 {width} {height}"
    width="100%"
    height="60"
    preserveAspectRatio="none"
    class="overflow-visible"
    role="img"
    aria-label="14-day spend trend"
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
  </svg>
{:else}
  <div class="flex h-[60px] items-center justify-center text-[10px] text-muted-foreground">
    no data yet
  </div>
{/if}
