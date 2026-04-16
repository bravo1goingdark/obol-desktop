# Updater manifest — activation steps

The Tauri auto-updater is wired in (`src-tauri/src/main.rs` → `spawn_update_check`, `src/App.svelte` → banner) but sits behind `"active": false` in `tauri.conf.json` until the signing keypair is generated.

## One-time setup to activate

1. Generate a signing keypair:
   ```
   cargo install tauri-cli --version "^2"
   cargo tauri signer generate -w ~/.tauri/obol.key
   ```
   Store the private key (`~/.tauri/obol.key`) in a password manager. Do **not** commit it.

2. Copy the printed public key into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

3. Flip `plugins.updater.active` to `true` in the same file.

## Per-release steps

For each new version (e.g. `v0.2.0`):

1. Bump `version` in `src-tauri/Cargo.toml` AND `src-tauri/tauri.conf.json` AND `package.json`.
2. Build signed artifacts per target. With `tauri-cli` picking up `TAURI_SIGNING_PRIVATE_KEY` (path or contents of `~/.tauri/obol.key`):
   ```
   TAURI_SIGNING_PRIVATE_KEY=~/.tauri/obol.key pnpm tauri build
   ```
   This produces `.sig` files next to each artifact.
3. Upload the artifacts to a GitHub Release tagged `v0.2.0`.
4. Update `docs/updates/latest.json` with the new version, per-target URLs, and signatures:
   ```json
   {
     "version": "0.2.0",
     "notes": "Auto-updater active. Tray quick actions. OS theme sync.",
     "pub_date": "2026-04-20T00:00:00Z",
     "platforms": {
       "linux-x86_64":   { "signature": "...", "url": "https://github.com/bravo1goingdark/obol-desktop/releases/download/v0.2.0/obol-desktop_0.2.0_amd64.AppImage.tar.gz" },
       "darwin-aarch64": { "signature": "...", "url": "..." },
       "windows-x86_64": { "signature": "...", "url": "..." }
     }
   }
   ```
5. Commit `docs/updates/latest.json` — Cloudflare Pages redeploys the static site and `https://obol-dektop.pages.dev/updates/latest.json` serves the new manifest.
6. Existing v0.1.x installs will see the update banner on their next launch (or at the next 5-second-after-startup check on restart).

## Endpoint format

`tauri.conf.json` points the updater at:
```
https://obol-dektop.pages.dev/updates/{{target}}-{{arch}}/{{current_version}}
```
Tauri appends those placeholders and fetches. The single `latest.json` at `docs/updates/latest.json` covers every target because the plugin reads `platforms.<target>-<arch>` out of it. For per-target manifests later, split into `linux-x86_64.json`, `darwin-aarch64.json`, etc.
