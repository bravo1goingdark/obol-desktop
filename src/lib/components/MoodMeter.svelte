<script lang="ts">
  // Copied from Obol's MoodMeter.svelte. Animations and severity colour
  // mapping stay identical — when you update one, mirror the other.
  import type { MoodTier } from "$lib/types";

  export let mood: MoodTier;
  export let animate = true;

  $: colorClass = (
    {
      chill: "text-muted-foreground",
      warm: "text-muted-foreground",
      hot: "text-amber-500",
      fire: "text-amber-500",
      meltdown: "text-destructive",
    } as Record<string, string>
  )[mood.severity] ?? "text-muted-foreground";

  $: animClass = animate ? `face-${mood.severity}` : "";
</script>

<div class="flex items-start gap-6">
  <div class={`face ${animClass} font-mono text-2xl tracking-tight ${colorClass}`}>
    {mood.face}
  </div>
  <div class="flex-1 min-w-0">
    <p class="font-display text-2xl leading-tight text-balance">{mood.quote}</p>
    <p class="mt-1 text-xs text-muted-foreground">{mood.subtitle}</p>
  </div>
</div>

<style>
  .face {
    display: inline-block;
    transform-origin: center;
  }

  .face-chill,
  .face-warm,
  .face-hot,
  .face-fire,
  .face-meltdown {
    will-change: transform, opacity;
  }

  .face-chill {
    animation: mood-breath 4.5s ease-in-out infinite;
  }
  @keyframes mood-breath {
    0%, 100% { transform: scale(1); opacity: 0.75; }
    50% { transform: scale(1.05); opacity: 1; }
  }

  .face-warm {
    animation: mood-sway 3s ease-in-out infinite;
  }
  @keyframes mood-sway {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-2px) rotate(-1.5deg); }
    75% { transform: translateX(2px) rotate(1.5deg); }
  }

  .face-hot {
    animation: mood-throb 1.2s ease-in-out infinite;
  }
  @keyframes mood-throb {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }

  .face-fire {
    animation: mood-shake 0.55s ease-in-out infinite;
  }
  @keyframes mood-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-3px); }
    40% { transform: translateX(3px); }
    60% { transform: translateX(-2px); }
    80% { transform: translateX(2px); }
  }

  .face-meltdown {
    animation: mood-glitch 0.4s steps(3, end) infinite;
  }
  @keyframes mood-glitch {
    0% { transform: translate(0, 0) skewX(0); filter: none; }
    20% { transform: translate(-2px, 1px) skewX(-4deg); filter: hue-rotate(-10deg); }
    40% { transform: translate(2px, -1px) skewX(4deg); filter: hue-rotate(10deg); }
    60% { transform: translate(-1px, 2px) skewX(-2deg); filter: hue-rotate(-5deg); }
    80% { transform: translate(1px, -2px) skewX(2deg); filter: hue-rotate(5deg); }
    100% { transform: translate(0, 0) skewX(0); filter: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .face-chill, .face-warm, .face-hot, .face-fire, .face-meltdown {
      animation: none;
    }
  }
</style>
