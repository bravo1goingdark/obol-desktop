# Obol Desktop

A lightweight system tray widget that tracks your AI API spend in real time. Built with Tauri 2 and Svelte 4, styled to match the Obol web dashboard exactly.

## Features

- Real-time cost tracking for Claude, OpenAI, and other AI APIs
- Mood meter that reflects your spending
- System tray residence - always visible, never in the way
- Budget alerts at 80% and 100%
- Daily spend caps
- 14-day trend sparkline
- CSV export
- Global keyboard shortcut (Ctrl+Shift+O / Cmd+Shift+O)
- Privacy-first: tokens stored in OS keychain

## Installation

Download pre-built binaries from the [Releases](https://github.com/bravo1goingdark/obol-desktop/releases) page.

**Available formats:**
- Linux: `.AppImage`, `.deb`, `.rpm`
- macOS: `.dmg`
- Windows: `.msi`

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
│                   "T_T $12.34" label                        │
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
│                              ┌─────────────────┴──────────┐ │
│                              │  Events: widget-update     │ │
│                              │         widget-error        │ │
│                              └────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Svelte Frontend                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │    App      │───▶│  Dashboard  │───▶│   Setup     │      │
│  │  (router)   │    │   (main UI) │    │  (token)    │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                              │                                │
│         ┌────────────────────┼────────────────────┐         │
│         ▼                    ▼                    ▼         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  MoodMeter  │    │  StatCard   │    │MiniSparkline│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Rust (`src-tauri/src/`)

| File | Purpose |
|------|---------|
| `main.rs` | App entry, tray icon, menu, polling loop, IPC commands |
| `poll.rs` | HTTP client for `/api/desktop/widget` with typed errors |

**Key commands:**
- `cmd_save_token` - Save PAT to OS keychain
- `cmd_load_token` - Load PAT from keychain  
- `cmd_delete_token` - Remove PAT from keychain
- `cmd_refresh_now` - Trigger immediate poll

### Svelte (`src/`)

| File | Purpose |
|------|---------|
| `App.svelte` | Routes between Dashboard and SetupScreen |
| `lib/stores/widget.ts` | Widget state + Tauri event listeners |
| `lib/stores/token.ts` | Token management |
| `lib/stores/theme.ts` | Dark/light theme |
| `lib/types.ts` | TypeScript types matching Rust |
| `lib/formatters.ts` | Currency formatting |

## Configuration

### Environment Variables

| Variable | Default |
|----------|---------|
| `VITE_OBOL_URL` | `https://useobol.pages.dev` |
| `OBOL_BASE_URL` | `https://useobol.pages.dev` |

### Window

- Size: 360x520 (min 320x420)
- Frameless with custom titlebar
- Resizable
- Centered on launch

## Tech Stack

- **Tauri 2** - Desktop framework
- **Rust** - Backend
- **Svelte 4** - UI
- **Tailwind CSS** - Styling
- **Vite** - Build tool

## License

[MIT](LICENSE)
