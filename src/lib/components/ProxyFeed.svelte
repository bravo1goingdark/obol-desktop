<script lang="ts">
  import type { ProxyRequest } from "$lib/types";
  import { formatCents } from "$lib/formatters";

  export let requests: ProxyRequest[];

  function relativeTime(iso: string): string {
    const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 5) return "now";
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m`;
  }
</script>

<div class="space-y-1 max-h-[120px] overflow-y-auto scroll-hidden">
  {#each requests.slice(0, 8) as req (req.id)}
    <div class="flex items-center gap-2 rounded px-2 py-1 text-[9px] transition-colors hover:bg-muted/50">
      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 {req.status_code < 400 ? 'bg-emerald-500' : 'bg-destructive'}"></span>
      <span class="truncate flex-1 font-mono text-foreground">{req.model || 'unknown'}</span>
      <span class="text-muted-foreground">{req.latency_ms}ms</span>
      <span class="font-mono text-foreground">{formatCents(req.cost_cents)}</span>
      <span class="text-muted-foreground w-6 text-right">{relativeTime(req.created_at)}</span>
    </div>
  {:else}
    <p class="text-center text-[9px] text-muted-foreground py-2">No proxy requests yet</p>
  {/each}
</div>
