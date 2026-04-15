// Currency formatters for Obol widget.

let currencyFormatter: Intl.NumberFormat | null = null;
let compactFormatter: Intl.NumberFormat | null = null;

function getCurrencyFormatter(): Intl.NumberFormat {
  if (!currencyFormatter) {
    currencyFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return currencyFormatter;
}

function getCompactFormatter(): Intl.NumberFormat {
  if (!compactFormatter) {
    compactFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    });
  }
  return compactFormatter;
}

export function formatCents(cents: number): string {
  return getCurrencyFormatter().format(cents / 100);
}

export function formatCentsCompact(cents: number): string {
  const value = cents / 100;
  if (Math.abs(value) >= 1000) {
    return getCompactFormatter().format(value);
  }
  return formatCents(cents);
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  return `${day} d ago`;
}
