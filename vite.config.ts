import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [svelte()],

  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },

  build: {
    // Both webkit2gtk (Linux) and WebView2 (Windows) support modern JS natively.
    // Targeting esnext skips transpilation transforms that add dead weight.
    target: "esnext",

    // The module-preload polyfill (~1.5 KB) is pointless inside a Tauri webview
    // where the module loader is always the same engine version.
    modulePreload: { polyfill: false },

    // esbuild is Vite's default for JS; be explicit so CI/CD isn't surprised.
    minify: "esbuild",

    rollupOptions: {
      output: {
        // Isolate the Tauri IPC glue into its own chunk so it hashes
        // independently from app code — better long-term cache reuse
        // across app updates.
        manualChunks: {
          tauri: ["@tauri-apps/api", "@tauri-apps/plugin-opener"],
        },
      },
    },
  },

  // Tauri expects a fixed port; fail if it can't bind.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1430 }
      : undefined,
    watch: {
      // Don't watch the Rust side — it has its own change detection.
      ignored: ["**/src-tauri/**"],
    },
  },
}));
