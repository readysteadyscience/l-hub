# Changelog

All notable changes to **L-Hub** will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.3.6] - 2026-03-23

### Changed
- **文档质感升级**：引入了由社区/作者亲自微调和优化剪裁比例后的全新专属 L-Hub Hero Banner 品牌海报图作为页首，使 README 排版更加饱满、极客。

## [0.3.5] - 2026-03-23

### Changed
- **文档版式更新**：移除了顶部不美观的海报占位图，恢复为极简、纯粹的 `L-Hub` 纯文字 Header。

## [0.3.4] - 2026-03-23

### Changed
- **文档版式优化**：调整了 README 的视觉连贯性。将 L-Hub 专属 Hero Banner 置于页首作为海报，并将操作演示动图（Demo GIF）下推至“核心痛点与解决方案”实战环节。

## [0.3.3] - 2026-03-23

### Fixed
- **Open VSX 图像渲染修复**：将 README 文档中的本地相对路径动图与静态图，全线替换为 GitHub 远程直链（Raw URLs），彻底解决插件主页“L-Hub Demo”等图像资源裂图、无法加载的问题。

## [0.3.2] - 2026-03-23

### Added
- **状态栏全景雷达 (Mission Control HUD)**：原生融合编辑器底部状态栏的 4 联装网格监控台。悬停状态栏即可实时总览云端专家阵列、本地机器沙盒状态、动态路由归属以及精准的 24H 专属网络遥测数据。
- **一键极致清理功能**：ConfigPanel 新增了 `[×]` 按钮，点击即可秒级清空该厂商下挂载的所有 API 密钥及环境参数变量。

### Changed
- **按厂商品牌聚合展示**：原先所有模型混在一个长列表中，现已在 Dashboard 内按底层厂商（DeepSeek、GLM等）聚合折叠。统一入口，下属模型作为内联按扭，全景界面告别杂乱。
- **配置生效敏锐侦测**：大幅度优化了底层探测逻辑。填写配置后，侧边栏 Skill 面板及底部状态栏组件将极速刷新为可用状态并立即分流接管任务，不再阻断响应。

### Fixed
- **每日监控基线清零**：修正了概览统计大屏的零点基准计算。现在的网络历史监控将从每日零点精准截断，彻底阻绝底层历史残桩对当日请求与 Token 数据的污染。

---

## [0.3.1] - 2026-03-12
### Changed
- **引擎架构迭代** — 底层交互系统前置重构，为后续高自由度路由中枢面板平稳上线奠定框架基础。

---

## [0.3.0] - 2026-03-11

### Fixed
- **参数持久化控制** — 修复特定环境下空密钥存储验证拦截失效的安全隐患。
- **跨平台代理穿透** — 深度增强子进程环境探测策略 (`shell: true` 桥接)，彻底根治 Windows 生态下 Codex 与 Gemini 工具链底层进程脱离监管的问题。
- **状态观测一致性** — 修复极小概率下全局视图与任务栏组件关于本地代理模型在线统计数据的误差，确保数据看板的绝对同步。
- **稳定与性能提升** — 内部代码清理，移除底层重叠泛型声明，提升宿主内载入稳定性。

### Changed
- **全面适配 Antigravity** — 进一步剥离冗余兼容逻辑，测试面板、底层握手提示词及通信协议已针对 Antigravity 核心能力特征进行端到端的最高级别调优赋能。

---

## [0.2.5] - 2026-03-11

### Fixed
- **C1** `storage` null 崩溃 — 去掉 `storage!` 强制断言，`DashboardPanel`、`LinglanMcpServer` 均接受可空 storage；`_syncModelsToFile` 加 `?.` 防护
- **H1** CLI fallback SQL 注入 — 改用 sanitize helper，同时转义反斜杠和单引号
- **H2** `testAllModels` 无取消 — 面板关闭时 `safePost` helper 捕获异常，并提前退出循环
- **M1** `cleanupLHub` config.update 未 await — `deactivate` 改为 async，正确等待 cleanup 完成
- **M2** ws-server `logTransaction` null 崩溃 — 加 null guard
- **M3** ws-server MiniMax URL / model 过时 — 更新为 `api.minimax.io` + `MiniMax-M2.5`
- **M4** `mapDbRowToRecord` this 绑定丢失 — 改用箭头函数调用
- **L1** `Date.now()` ID 碰撞 — 追加随机后缀
- **L2** 空字符串 API Key 写入 — 空时跳过存储

---

## [0.2.4] - 2026-03-10

### Fixed
- **Reload Window 后 ⚠️ 激活失败** — `deactivate()` 中 `cleanupLHub()` 的第5步会 `fs.rmSync` 删除自身扩展目录，导致 Reload Window（同样触发 deactivate）后扩展文件消失，重新激活失败。已移除该步骤，扩展目录由 Antigravity 在真正卸载时负责清理
- **状态栏 CLI 检测误报** — `spawnSync` 加 `shell: true`，修复 Electron PATH 下 Codex/Gemini CLI 无法被检测到的问题
- **SQLite 加载失败弹窗** — 移除 `showWarningMessage`，改为静默降级；`getHistory` 加 null guard 防 crash

### Added
- **卸载自动清理** — 禁用/卸载时自动移除 MCP 配置、Skill 目录、`GEMINI.md` 注入段、路由规则（API Keys 保留）

---

## [0.2.3] - 2026-03-10

### Fixed
- **SQLite ABI 跨平台兼容性** — extension host 侧（Electron 进程）改用 `sql.js`（WebAssembly WASM），彻底消除 `better-sqlite3` 原生模块 ABI 不兼容问题，所有平台均可正常使用历史记录功能

---

## [0.2.2] - 2026-03-10

### Added
- **卸载自动清理** — 扩展禁用/卸载时自动执行 `cleanupLHub()`，移除 MCP 配置条目、Skill 目录、`GEMINI.md` 注入段、路由规则；API Keys（`~/.l-hub-keys.json`）保留不删

### Fixed
- **状态栏 CLI 检测误报未安装** — `updateStatusBar` 中 `spawnSync` 缺少 `shell: true`，导致在 Electron 环境下无法继承完整 PATH，Codex CLI / Gemini CLI 实际已安装却显示 ❌。现已修复，与 Dashboard 检测行为保持一致
- **SQLite 加载失败弹窗** — `better-sqlite3` ABI 不兼容时会弹出警告对话框影响体验。现改为静默降级：移除 `showWarningMessage`，`getHistory` 加 null guard（返回空数组而非 crash），历史 Tab 显示空状态

---

## [0.2.1] - 2026-03-06

### Changed
- **适配 GPT-5.4** — OpenAI 于 2026-03-05 发布 GPT-5.4，替代 GPT-5.3-Codex 系列。更新 `LEGACY_PROVIDERS` 默认模型为 `gpt-5.4`，更新 ConfigPanel 模型注册表（新增 `gpt-5.4` 和 `gpt-5.4-pro`，移除旧 `gpt-5.1`/`gpt-5.3-codex` 条目）
- **Codex CLI v0.111.0 新调用格式** — `callCodex` 函数适配新参数顺序：`codex --model gpt-5.4 exec ...`（`--model` 必须在子命令之前）
- **流式输出（Streaming）** — `callProvider` 全面升级为 SSE 流式接收：从"30s 总超时"改为"15s 首字节超时 + 无总时长限制"，彻底解决长文创意写作（万字级）并发超时问题。兼容不支持 streaming 的 provider（自动降级）

---

## [0.2.0] - 2026-03-04

### Added
- **AI 调度规则自动注入** — 扩展激活时自动写入 Antigravity 代理规则，让 Claude 自动把体力活（代码生成、翻译、调试等）委派给 L-Hub 中的便宜模型，主模型 token 消耗降低 50%+
- 动态检测用户已配置的模型（DeepSeek/GLM/Qwen/MiniMax）和 CLI 工具（Codex/Gemini），仅推荐实际可用的路由
- Codex CLI 安装后自动成为代码审查/Bug检查的首选（GPT 5.3 Codex）
- 幂等保护：`[L-Hub Auto-Routing]` 标记防止重复注入，不覆盖用户自定义规则

> 灵感致谢：用户 **"来自星星的我"** 提出 Skill 驱动 AI 团队协同的概念

---

## [0.1.15] - 2026-03-04

### Fixed
- **Windows CLI 检测失败** — 为所有 CLI 版本检测（Codex / Gemini）添加 `shell: true`，修复 Windows 上 npm 全局安装的 `.cmd` 命令无法被 `spawnSync` 识别的问题

---

## [0.1.14] - 2026-03-04

### Added
- **⭐ 同账号驱动 Antigravity + Gemini CLI** — 使用同一个 Google Ultra 账号登录 Antigravity 和 Gemini CLI，一份订阅同时驱动 Claude + Gemini 双顶级模型协同工作
- **概览面板 CLI 状态** — 系统状态区域新增 Codex CLI / Gemini CLI 状态展示（版本号、登录状态），在线计数从 x/4 升级为 x/6
- **Reload 后自动测试** — 概览面板加载时自动触发全模型连通测试，无需手动点击"一键全部测试"
- **编辑向导"恢复默认"按钮** — 任务选择区域新增一键恢复预设任务按钮

### Fixed
- **编辑模型回填** — 点击"编辑"时直接跳到任务分配页（step 2），所有字段已回填，无需从头配置
- **编辑模式"上一步"缺失** — 所有步骤均可前后切换，上一步按钮样式与下一步统一
- **Gemini CLI 登录状态** — 通过检测 `~/.gemini/oauth_creds.json` 区分"已登录"和"未登录"，与 Codex CLI 卡片一致
- **调用历史 / 延迟 / Token 不显示** — 通过 sqlite3 CLI fallback 解决 Electron ABI 不兼容导致 better-sqlite3 加载失败的问题
- **Tab 切换重复测试** — 模型管理页不再每次切入都重新测试连通性
- **测试文案不一致** — 统一测试成功提示为"已连通"

---

## [0.1.12] - 2026-03-03

### Fixed
- **Overview 0/5 online** - getOverviewStats now reads test cache so tested models show online status
- **Test All no response** - OverviewPanel now listens to testResult events in real-time
- **Logo broken** - Added images/ to localResourceRoots so Webview can load the logo
- **Status bar text** - Changed misleading text from free-key to Google local credentials

### Added
- **Gemini CLI card** - New status card in Config panel alongside Codex CLI
- **Model test cache** - Test results persist across tab switches

## [0.1.11] - 2026-03-03

### Changed
- **自动化发布验证** — 商店 `0.1.10` 手动传版后锁号，发布 `0.1.11` 全景补完版以验证整套 GitHub Actions 的 CD (持续部署) 工作流的首次自动化上架连通性。

## [0.1.10] - 2026-03-03

### Fixed
- **全生态版本对齐** — 将 MCP Server 环境中的版本号、Dashboard README 小贴纸等所有与 `package.json` 不一致的幽灵版本号清理，并正式沉淀了 `lhub-release-guide` 发版标准防御协议，规避以后的发版碎片化。

## [0.1.9] - 2026-03-03

### Fixed
- **多进程历史记录丢失** — 修复了 MCP Server 子进程无法获取被 VS Code 宿主托管的 SQLite `dbPath` 配置，导致 `ai_ask` 连通打流数据写入失败、Dashboard 面板显示统计为空（0）的严重问题。
- **Gemini CLI 状态误报** — 修复了仅安装了 npm 包但无可用凭证时错误判定为 `✅ Ready` 的体验问题，现在通过探测命令行退出码，并在底层和扩展状态栏统一标示更准确的 `✅ 已安装 (使用本地凭据)`。
- **Dashboard UI 修复** — 补全了 Webview 的 CSP (Content Security Policy) 配置，使由于策略拦截导致的 L-Hub 本地 Logo 载入失败（裂图）问题得到修复。

### Changed
- **产品文档与高光精简** — 根据用户反馈，重构并精简了过于复杂啰嗦的产品亮点介绍；去除了过时的“模型任务绑定”举例，并将路由建议面板移动到 Dashboard 内聚展示。
- **MCP Server 版本同步** — 修复了内部写死的 `v0.1.5` 硬编码问题，与主包保持跨平台版本一致性。

## [0.1.4] - 2026-03-02

### Fixed
- **版本徽章同步** — README `version` badge 已与实际发布版本同步，修复之前因打包顺序错误导致 badge 显示旧版本号的问题
- **产品亮点文案** — 更新插件详情页路由描述，去掉已过时的"代码走 DeepSeek、架构走 Claude/GLM"说法，改为当前实际默认路由

### Changed
- **Gemini CLI 补充说明** — 产品亮点"ChatGPT 账号零门槛"扩展为"ChatGPT / Google 账号零门槛"，加入 Gemini CLI（Google OAuth）说明，与 Codex CLI 对称展示
- **快速开始** — 新增第 5 步 Gemini CLI 安装与登录步骤

---

## [0.1.3] - 2026-03-02

### Added
- **`ai_gemini_task` 工具** — 调用本地 Gemini CLI（需已安装 `@google/gemini-cli`），支持 `prompt`、`model`、`working_dir` 参数。Gemini 以非交互模式（`-p --yolo`）执行，自动清理 ANSI 色码后返回纯文本结果
- **文件上下文注入** — `ai_ask` / `ai_multi_ask` 新增可选参数 `file_paths: string[]`，自动读取本地文件内容并拼入 system prompt。支持 `~` 路径扩展，单文件上限 200KB，总量 1MB，超限自动跳过并附加警告说明
- **自动 Fallback 重试链** — `ai_ask` 遇到可重试错误（429 限速、5xx 服务错误、网络超时）时，自动顺序尝试其他已启用模型，最终响应末尾附注 ⚡ 标记说明实际使用的模型
- **`ai_list_providers` 新增 Gemini CLI 状态** — 同 Codex CLI，显示是否安装及版本信息

### Changed
- **路由矩阵全面更新** — 依据 2026 年第一季度主流编程基准（SWE-bench Verified、LiveCodeBench、BFCL）持续校准各模型任务分配：
  - 代码生成首选 **GPT/Codex 5.3**（`priority 0`）；文件级编码建议直接使用 `ai_codex_task`
  - **MiniMax-M2.5 Coding**（SWE-bench 80.2%、BFCL 工具调用 76.8%）升为 `code_gen` 第二优先级并新增 `agentic`、`tool_calling` 任务类型
  - **GLM-5 Coding Plan** 专注 `agentic`、`tool_calling`、`long_context`，同时作为代码生成备选
  - **Gemini 3.1 Pro** 承接 `ui_design`（前端设计效果最佳）及 `math_reasoning`
  - **MiniMax-M2.5 highspeed** 保留 `creative` 大量内容生成场景
- **移除 Claude 路由** — L-Hub 作为 Antigravity（Claude Sonnet 4.6）的补充工具，不再将任务反向路由回 Claude 本身，避免冗余调用
- **`ai_list_providers`** 输出补充显示 Gemini CLI 安装状态

---

## [0.1.2] - 2026-03-02
### Added
- **`ai_multi_ask` 工具** — 一次并行调用多个 AI 模型，汇总对比结果。指定 `providers` 列表或留空（自动选全部已配置模型，最多 5 个）
- **路由长度感知** — 消息 > 3000 字自动路由到 long_context 最优模型（GLM）；< 100 字纯代码短问题快速走 DeepSeek
- **历史面板搜索框** — 可按 method 名、模型名、prompt 内容实时过滤调用历史记录

## [0.1.1] - 2026-03-02

### Fixed
- **调用历史真实写入**：修复 MCP server 调用 AI API 后不写历史记录的 Bug。每次 `ai_ask` / `ai_codex_task` 调用后，耗时、模型名、Token 数均写入历史面板可查

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
