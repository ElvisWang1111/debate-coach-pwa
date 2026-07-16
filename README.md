# Debate Coach PWA

This folder contains a standalone PWA implementation that mirrors the current iOS app structure and interaction flow as closely as the web platform allows.

The current frontend is organized with React components loaded through ESM CDN imports, so it does not require a local Node/Vite setup to start refactoring. For production hardening, the next step would be vendoring dependencies or moving to a standard Vite build.

## Features

- Risk consent gate before entering the app
- `Chat / History / Settings` bottom tab layout
- Local session persistence with recycle bin retention
- JSON import, JSON/Markdown/JPG export
- Streaming chat requests against the configured OpenAI-compatible endpoint
- Offline-capable installable PWA shell

## Local Run

Use any static file server from the repository root or this folder. Example:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/debate-coach-pwa/`.

## Platform Gaps

The app intentionally copies the iOS visual system, but web still differs from native iOS in:

- System keyboard animation timing
- Native swipe actions and haptics
- Share sheet behavior
- Full parity with SwiftUI rendering and image export
