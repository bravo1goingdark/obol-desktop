# Obol Desktop

A lightweight system tray widget that tracks your AI API spend in real time. Built with Tauri 2 and Svelte 4, styled to match the Obol web dashboard exactly.

## Features

### Core
- Real-time cost tracking for Claude, OpenAI, and 8 other AI providers
- Mood meter that reflects your spending with animated faces
- System tray residence — always visible, never in the way
- Budget alerts at 80% and 100% (native OS notifications)
- Daily spend caps with per-day reset
- 14-day trend sparkline with hover tooltips
- CSV export of spending history
- Global keyboard shortcut (Ctrl+Shift+O / Cmd+Shift+O)
- Privacy-first: tokens stored in OS keychain

### Intelligence
- **Anomaly detection** — alerts when today's spend is abnormally high
- **Cache savings** — shows how much prompt caching saved you
- **Forecast confidence** — projected month-end with confidence level
- **Over-budget projection** — warns before you exceed your budget
- **Provider breakdown** — per-provider spend pills with percentages
- **Cost-per-hour** — live burn rate shown on the Today card

### Proxy Dashboard
- Live request feed (last 8 requests with model, latency, cost)
- Error rate badge with success percentage
- RPM gauge and daily request count
- Cache hit rate percentage
- Kill switch — one-click pause all proxy keys

### UX
- **Focus mode** — mutes notifications, dims tray to "· zen"
- **Idle detection** — pauses polling after 10 min of inactivity
- **Cost delta badge** — "+$2.34 since you last looked" on open
- **Streak counter** — "🔥 4d streak" when under daily threshold
- **Copy as markdown** — one-click report to clipboard
- **Keyboard shortcuts** — R (refresh), C (copy cost), Esc (hide)
- **Widget skins** — Default, Terminal (green/black), Neon (purple/pink)
- **Window position memory** — validated against screen bounds
- **Conditional insights panel** — appears only when extra data exists

### Multi-account
- Store multiple PATs with labels
- Switch between work/personal accounts

## Installation

Download pre-built binaries from the [Releases](https://github.com/bravo1goingdark/obol-desktop/releases) page.

**Available formats:**
- Linux: `.AppImage`, `.deb`, `.rpm`
- macOS: `.dmg`
- Windows: `.msi`, `.nsis`

## Quick Start

1. Sign in at [useobol.pages.dev](https://useobol.pages.dev)
2. Go to **Settings → Security → API tokens**
3. Create a new token (e.g., "Desktop")
4. Launch Obol Desktop, paste your token, click **Connect**

The widget polls every 2 minutes and updates the tray icon with your mood and today's spend.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Point to local Obol dev server
VITE_OBOL_URL=http://localhost:5173 pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

Build artifacts are in `src-tauri/target/release/bundle/`.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      System Tray                             │
│                   "(T_T) $12.34" label                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Rust Backend                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   keyring   │    │   polling   │    │   Tauri     │     │
│  │ (keychain)  │───▶│   (tokio)   │───▶│  commands   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                │             │
│                     ┌──────────────────────────┤             │
│                     │  idle detection          │             │
│                     │  focus mode              │             │
│                     │  proxy kill switch       │             │
│                     └──────────────────────────┘             │
│                              ┌─────────────────┴──────────┐ │
│                              │  Events: widget-update     │ │
│                              │         widget-error        │ │
│                              │         widget-trial-expired│ │
│                              └────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Svelte Frontend                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    App      │───▶│  Dashboard  │───▶│   Setup     │     │
│  │  (router)   │    │   (main UI) │    │  (token)    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                              │                               │
│    ┌─────────────────────────┼──────────────────────┐       │
│    ▼            ▼            ▼           ▼          ▼       │
│ MoodMeter  StatCard  MiniSparkline  ProxyFeed  Settings     │
└─────────────────────────────────────────────────────────────┘
```

### Rust (`src-tauri/src/`)

| File | Purpose |
|------|---------|
| `main.rs` | App entry, tray icon, menu, polling loop, IPC commands, idle detection, focus mode |
| `poll.rs` | HTTP client for `/api/desktop/widget` with ETag/304 support and typed errors |

**Key commands:**
- `cmd_save_token` / `cmd_load_token` / `cmd_delete_token` — Keychain management
- `cmd_refresh_now` — Trigger immediate poll
- `cmd_set_focus_mode` — Toggle notification suppression
- `cmd_heartbeat` — Idle detection heartbeat from frontend
- `cmd_toggle_proxy` — Kill switch for proxy keys
- `cmd_set_poll_interval` / `cmd_set_daily_limit` — Runtime config
- `cmd_toggle_always_on_top` / `cmd_get_autostart` / `cmd_set_autostart`

### Svelte (`src/`)

| File | Purpose |
|------|---------|
| `App.svelte` | Routes, window position, idle heartbeat, auto-updater |
| `lib/components/Dashboard.svelte` | Main UI with conditional panels |
| `lib/components/ProxyFeed.svelte` | Live proxy request feed |
| `lib/components/SettingsPage.svelte` | Settings with skins, autostart, alerts |
| `lib/stores/widget.ts` | Widget state + Tauri event listeners |
| `lib/stores/token.ts` | Multi-account token management |
| `lib/stores/theme.ts` | Dark/light/system theme |
| `lib/types.ts` | Full v2 API types (proxy, anomaly, cache, forecast) |
| `lib/formatters.ts` | Currency + relative time formatting |

## Configuration

### Environment Variables

| Variable | Default |
|----------|---------|
| `VITE_OBOL_URL` | `https://useobol.pages.dev` |
| `OBOL_BASE_URL` | `https://useobol.pages.dev` |

### Window

- Size: 360×520 (min 320×420)
- Frameless with custom titlebar
- Resizable, position remembered
- Centered on first launch

## Tech Stack

- **Tauri 2** — Desktop framework
- **Rust** — Backend (tokio, reqwest, keyring)
- **Svelte 4** — UI
- **Tailwind CSS 3** — Styling
- **Vite 5** — Build tool

## License

[MIT](LICENSE)
