# Changelog

All notable changes to **L-Hub** will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-03-01

### Added
- **ConfigPanel 2.0** — dynamic model management: add/remove/edit models, 3-step modal, 12 task types (multi-select with auto-filled defaults per model)
- **Model Registry** — 21 pre-configured models across DeepSeek, GLM, Qwen, MiniMax, Moonshot, Yi, GPT-4o, Claude, Gemini, Llama, Mistral, and more
- **v2 config format** — model configs stored with tasks, baseUrl, encrypted API key per model

### Changed
- **mcp-server.ts** — completely rewritten: reads v2 model config, routes by task type matching user's configured models; falls back to v1 legacy format
- **activationEvents** — added `*` + `onCommand:l-hub.openPanel` to guarantee activation
- **Package** — now includes full `node_modules` (fixed `ws`/`better-sqlite3` not found on load)
- **README** — removed incorrect "runs on Claude Sonnet/Opus" claim; simplified model section to examples

---

## [0.0.9] — 2026-03-01

### Added
- **Codex CLI integration** (`ai_codex_task` MCP tool) — autonomous local file agent via OpenAI OAuth, no manual API key needed
- **Custom / Third-party relay API** — add any OpenAI-compatible endpoint (OpenRouter, SiliconFlow, etc.) from the Settings panel
- **Discord community** — [discord.gg/gurEPMnn52](https://discord.gg/gurEPMnn52)
- Transparent logo (cyan, 1024×1024)
- `ai_list_providers` now shows Codex CLI installation status

### Changed
- README rewritten: **Chinese first**, English second
- Removed specific Claude version numbers for forward compatibility
- Badge style: `for-the-badge` → `flat-square` (smaller, cleaner)
- Removed `command:` URIs that caused 404 in GitHub/Antigravity rendering

---

## [0.0.8] — 2026-02-28

### Added
- Standalone MCP server (`mcp-server.ts`) — runs independently of VS Code extension host
- API keys stored in `~/.l-hub-keys.json`, synced from VS Code SecretStorage
- Auto-registration in `~/.gemini/antigravity/mcp_config.json` on first activation
- Smart routing: auto-selects best model by task type (DeepSeek / GLM / Qwen / MiniMax)
- History console with token usage and latency tracking

### Changed
- Activation event changed to `onStartupFinished` for zero-config experience
- Brand corrected to **走起智造 · Ready Steady Science**

---

## [0.0.1] — 2026-02-25

### Added
- Initial release
- WebSocket-based MCP bridge (local extension host)
- Dashboard webview: Config, History panels
- Support for: DeepSeek, GLM (Zhipu), Qwen (Alibaba), MiniMax
