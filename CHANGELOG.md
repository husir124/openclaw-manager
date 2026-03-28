# Changelog

## v1.0.0 (2026-03-28)

Initial release of OpenClaw Manager — a desktop GUI for managing OpenClaw.

### Features

- **Dashboard** — System overview with Gateway status, Agent/Channel counts, quick actions
- **Setup** — Environment detection (Node.js, OpenClaw, Gateway) with one-click fixes
- **Models** — Provider management (add/edit/delete), model configuration, Agent model assignment
  - Supports built-in providers (OpenRouter, OpenAI, Anthropic, etc.)
  - API Key masking for security
- **Channels** — 24 messaging channels with enable/disable toggle and configuration
- **Agents** — Agent list with 4-step creation wizard (basic info → platform → credentials → confirm)
- **Skills** — Local skill browser with per-Agent skill management
- **Health** — System diagnostics with auto-refresh (60s), one-click fixes, Gateway log viewer
- **Backup** — AES-256-GCM encrypted backup/restore with progress tracking
- **Config** — Visual config editor with sections view, raw JSON editing, and backup history
- **Settings** — Gateway, security, theme (light/dark/system), auto-update configuration
- **Onboarding** — First-run guide detecting Node.js, OpenClaw, and Gateway status

### Architecture

- **Desktop framework**: Tauri 2.x (< 15MB installer)
- **Frontend**: React 19 + TypeScript (strict) + Ant Design 6 + Tailwind CSS 4
- **State**: React Context (theme/i18n) + Zustand (gateway)
- **Backend**: Rust commands for system detection, config I/O, process management, backup encryption
- **Testing**: Vitest (29 unit tests for Service layer)
- **Performance**: Cold start < 2s, page switch < 100ms, memory < 120MB idle

### Quality

- TypeScript strict mode — 0 errors
- Rust Clippy — 0 warnings
- Unit tests — 29/29 passing
- All 6 architecture performance targets met
- Release build — 12.98MB

### Known Limitations

- Windows only (macOS/Linux planned for v2.0)
- Chat page redirects to official OpenClaw Control UI
- ClawHub marketplace pending platform launch
