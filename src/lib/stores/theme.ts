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

  // Live-follow the OS when the user has NOT pinned a manual preference.
  // The `index.html` inline script handles the first render; this keeps
  // the widget in sync if the OS dark/light setting flips at runtime
  // (macOS sunset mode, Windows focus assist, Linux with darkman, etc.).
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", (e) => {
    // Skip if the user explicitly chose a theme via the toggle button.
    if (localStorage.getItem("theme")) return;
    const next: Theme = e.matches ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
    window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
    set(next);
  });

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
    /** Forget the manual preference and return to OS-follow mode. */
    resetToOs() {
      localStorage.removeItem("theme");
      const next: Theme = media.matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
      set(next);
    },
  };
}

export const theme = create();
