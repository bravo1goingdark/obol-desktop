// Copied from Obol's src/lib/stores/theme.ts, minus the $app/environment
// SvelteKit import — we're in plain Svelte + Vite, so `browser` is always
// true here (module only runs client-side in a webview).
import { writable } from "svelte/store";

export type Theme = "light" | "dark";

function getInitial(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function apply(next: Theme): void {
  localStorage.setItem("theme", next);
  document.documentElement.classList.toggle("dark", next === "dark");
  window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
}

function create() {
  const { subscribe, set } = writable<Theme>(getInitial());
  return {
    subscribe,
    toggle() {
      const next: Theme = getInitial() === "dark" ? "light" : "dark";
      apply(next);
      set(next);
    },
    set(next: Theme) {
      apply(next);
      set(next);
    },
  };
}

export const theme = create();
