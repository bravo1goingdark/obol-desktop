<script lang="ts">
  export let size: number = 32;
  export let withWordmark: boolean = false;
</script>

<span class="logo" style="--size: {size}px">
  <svg
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <circle cx="16" cy="16" r="10.88" fill="none" stroke="currentColor" stroke-width="2.05" />
    <path d="M 12.83 2.28 A 14.08 14.08 0 0 1 19.17 2.28" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" />
    <path d="M 22.39 3.45 A 14.08 14.08 0 0 1 27.24 7.53" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" opacity="0.1" />
    <path d="M 28.96 10.50 A 14.08 14.08 0 0 1 30.06 16.74" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" opacity="0.1" />
    <path d="M 29.46 20.12 A 14.08 14.08 0 0 1 26.30 25.60" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" />
    <path d="M 23.67 27.81 A 14.08 14.08 0 0 1 17.72 29.98" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" opacity="0.1" />
    <path d="M 14.28 29.98 A 14.08 14.08 0 0 1 8.33 27.81" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" opacity="0.1" />
    <path d="M 5.70 25.60 A 14.08 14.08 0 0 1 2.54 20.12" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" />
    <path d="M 1.94 16.74 A 14.08 14.08 0 0 1 3.04 10.50" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" opacity="0.1" />
    <path d="M 4.76 7.53 A 14.08 14.08 0 0 1 9.61 3.45" stroke="currentColor" stroke-width="1.28" stroke-linecap="round" fill="none" opacity="0.1" />
    <path d="M 16 12.8 L 19.2 16 L 16 19.2 L 12.8 16 Z" fill="currentColor" />
  </svg>
  {#if withWordmark}
    <span class="wordmark">Obol</span>
  {/if}
</span>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    color: hsl(var(--foreground));
    line-height: 1;
  }
  .wordmark {
    font-family: "DM Sans", sans-serif;
    font-weight: 600;
    font-size: calc(var(--size) * 0.92);
    letter-spacing: -0.02em;
  }
</style>