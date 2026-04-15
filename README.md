# Obol desktop

Tiny desktop widget for [Obol](https://useobol.pages.dev) — shows the
mood meter, monthly spend, today's spend, top model, and a 14-day trend
at a glance. Built with Tauri 2 + Svelte 4, styled to match the Obol web
dashboard exactly so there's no visual jump between the two.

## Install

Pre-built binaries: see the [Releases](https://github.com/bravo1goingdark/obol-desktop/releases)
page. Current targets: Linux `.AppImage`, `.deb`, `.rpm`. macOS and
Windows builds are handled by the GitHub Actions release workflow once
signing certs are configured.

## First run

1. Sign in at <https://useobol.pages.dev>.
2. Open **Settings → Security → API tokens**, create a token named e.g. "Desktop".
3. Copy the `obol_pat_…` value immediately — it's only shown once.
4. Launch Obol desktop, paste the token, click **Connect**.

The widget polls your usage every 2 minutes in the background and
updates the tray icon label with `<mood face> $<today spend>` so you can
glance at it without opening the window.

## Dev

```bash
pnpm install
pnpm tauri dev
```

Point the dev build at a local Obol wrangler dev server:

```bash
VITE_OBOL_URL=http://localhost:5173 pnpm tauri dev
```

The widget reads `VITE_OBOL_URL` at build time and falls back to
`https://useobol.pages.dev` in production.

## Build

```bash
pnpm tauri build
```

Linux bundles land under `src-tauri/target/release/bundle/`
(`appimage/`, `deb/`, `rpm/`). Builds for macOS / Windows run in CI.

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     System Tray                              │
│                  "😊 $12.34" label                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Rust Backend                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   keyring   │    │   polling   │    │   Tauri     │    │
│  │ (keychain)  │───▶│   (tokio)   │───▶│  commands   │    │
│  └─────────────┘    └─────────────┘    └──────┬──────┘    │
│                                                │             │
│                              ┌─────────────────┴──────────┐ │
│                              │  Events: widget-update      │ │
│                              │         widget-error        │ │
│                              └────────────────────────────┘ │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Svelte Frontend                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    App      │───▶│  Dashboard  │───▶│   Setup     │     │
│  │  (router)   │    │   (main UI) │    │  (token)    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                              │                               │
│         ┌────────────────────┼────────────────────┐        │
│         ▼                    ▼                    ▼        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  MoodMeter  │    │  StatCard   │    │MiniSparkline│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Rust side (`src-tauri/src/`)

| File | Purpose |
|------|---------|
| `main.rs` | App entry, tray icon, menu, polling loop, IPC commands |
| `poll.rs` | HTTP client for `/api/desktop/widget` with typed errors |

**Tauri commands:**
- `cmd_save_token` — Save PAT to OS keychain
- `cmd_load_token` — Load PAT from keychain
- `cmd_delete_token` — Remove PAT from keychain
- `cmd_refresh_now` — Trigger immediate poll

**Keychain:** Uses `keyring` crate to store the PAT in the system keychain
(Linux: libsecret, macOS: Keychain, Windows: Credential Manager).

**Polling:** Runs every 120 seconds via tokio. Emits `widget-update` event
on success, `widget-error` on failure.

### Svelte frontend (`src/`)

| File | Purpose |
|------|---------|
| `App.svelte` | Routes between Dashboard and SetupScreen based on token |
| `lib/stores/widget.ts` | Widget state + Tauri event listeners |
| `lib/stores/token.ts` | Token management via Tauri IPC |
| `lib/stores/theme.ts` | Dark/light theme toggle |
| `lib/types.ts` | TypeScript types matching Rust `WidgetPayload` |
| `lib/api.ts` | Fallback HTTP client (unused, Rust handles fetch) |
| `lib/formatters.ts` | Currency formatting utilities |

**Components:**
- `Dashboard.svelte` — Main UI with mood meter, stats, sparkline
- `SetupScreen.svelte` — Token input for initial setup
- `MoodMeter.svelte` — Animated mood face display
- `StatCard.svelte` — Reusable stat display card
- `MiniSparkline.svelte` — 14-day trend chart (SVG)
- `ErrorBanner.svelte` — Error state display

**Styling:** `app.css` contains design tokens (HSL colors) copied verbatim
from Obol web. `tailwind.config.ts` maps Tailwind utilities to those tokens.

### IPC flow

1. Rust polls Obol API every 120s
2. On success: emits `widget-update` with `WidgetPayload`
3. On failure: emits `widget-error` with error tag
4. Svelte `widget` store subscribes to events, updates state
5. UI re-renders automatically via Svelte reactivity

## Dependencies

### Core
- **Tauri 2** — Desktop framework
- **Svelte 4** — UI framework
- **Vite** — Build tool
- **Tailwind CSS** — Styling

### Rust (`src-tauri/Cargo.toml`)
| Package | Purpose |
|---------|---------|
| `tauri` | Desktop framework |
| `tauri-plugin-opener` | Open URLs in browser |
| `tokio` | Async runtime |
| `reqwest` | HTTP client |
| `keyring` | OS keychain access |
| `serde` | Serialization |
| `thiserror` | Error types |
| `tracing` | Logging |
| `tracing-subscriber` | Log output |

### Frontend (`package.json`)
| Package | Purpose |
|---------|---------|
| `@tauri-apps/api` | Tauri IPC |
| `@tauri-apps/plugin-opener` | Open URLs |

## Configuration

### Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_OBOL_URL` | Obol API base URL (dev) | `https://useobol.pages.dev` |
| `OBOL_BASE_URL` | Obol API base URL (Rust, build-time) | `https://useobol.pages.dev` |

### Window config (`src-tauri/tauri.conf.json`)

- Size: 360×520 (min 320×420)
- Frameless (custom titlebar via `data-tauri-drag-region`)
- Resizable
- Center on launch

### CSP policy

```
default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://useobol.pages.dev https://useobol.com http://localhost:5173;
img-src 'self' data:; script-src 'self' 'unsafe-inline'
```

## Development

### Running in dev mode

```bash
pnpm tauri dev
```

This starts:
1. Vite dev server on port 1420
2. Rust backend (rebuilds on file changes)
3. Desktop window with hot reload

### Debug logging

Rust logs go to stdout in dev mode. Check console output for:
- `polling failed: ...` — API errors
- `failed to emit widget-update: ...` — IPC failures

### Adding a new component

1. Create `src/lib/components/NewComponent.svelte`
2. Import in parent (e.g., `Dashboard.svelte`):
   ```svelte
   import NewComponent from "$lib/components/NewComponent.svelte";
   ```
3. Use in template: `<NewComponent />`

## Keeping in sync with Obol

If Obol's `WidgetPayload` shape changes, update both:
1. `src/lib/types.ts` (TypeScript)
2. `src-tauri/src/poll.rs` (Rust struct)

The UI tokens live in `src/app.css` — when Obol's theme tokens change,
mirror the diff here to avoid visual drift.

## Troubleshooting

### Token not saving

- Check OS keychain is accessible (Linux: run `secret-tool` or check `~/.local/share/keyrings/`)
- Check `keyring` crate supports your platform

### Widget not updating

- Check tray icon shows recent label
- Check Rust logs for polling errors
- Try manual refresh via tray menu

### Build fails

- Ensure Rust 1.70+ installed
- Ensure Node.js 18+ installed
- Run `pnpm install` before build

## License

MIT