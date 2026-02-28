<div align="center">

# L-Hub

**MCP AI Bridge**

*为 Antigravity 省钱 — 把日常任务委派给专家模型*

[![Version](https://img.shields.io/badge/version-0.0.9-blue?style=flat-square&logo=visualstudiocode)](https://github.com/readysteadyscience/l-hub)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](https://github.com/readysteadyscience/l-hub/blob/main/LICENSE)
[![Brand](https://img.shields.io/badge/%E8%B5%B0%E8%B5%B7%E6%99%BA%E9%80%A0-Ready%20Steady%20Science-orange?style=flat-square)](https://github.com/ReadySteadyScience)
[![Universe](https://img.shields.io/badge/产品线-Linglan%20Realm-blueviolet?style=flat-square)](https://github.com/ReadySteadyScience)

[![GitHub Stars](https://img.shields.io/github/stars/readysteadyscience/l-hub?style=flat-square&logo=github&label=%E2%AD%90%20Stars&color=yellow)](https://github.com/readysteadyscience/l-hub/stargazers)
[![Discord](https://img.shields.io/badge/Discord-Community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)
[![Feedback](https://img.shields.io/badge/%F0%9F%92%AC%20反馈-GitHub%20Issues-blue?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)

> **L-Hub** 是 **走起智造 · Ready Steady Science** 旗下 **Linglan Realm** 产品线中的免费开源工具。

</div>

<div align="center">
  <a href="#chinese">🇨🇳 简体中文</a> | <a href="#english">🇬🇧 English</a>
</div>

---

<h2 id="chinese">🇨🇳 简体中文</h2>

## 为什么需要 L-Hub？

**Antigravity** 运行在 Claude Sonnet 或 Opus 之上——全球顶尖 AI 模型，但同时也是最昂贵的。用顶级模型处理每一个子任务——普通代码生成、翻译、UI 布局——是一种浪费。

**L-Hub 解决了这个问题。** 它是一个内嵌在 Antigravity 中的 MCP AI 桥接器。当 Antigravity（你的主控模型）需要委派子任务时，它调用 L-Hub 来完成，而不是自己消耗昂贵的 Claude 额度。L-Hub 将请求路由给最合适、最具性价比的专家模型：

| 任务类型 | 路由至 | 原因 |
|---|---|---|
| 代码生成、调试 | **DeepSeek** | 快速准确，成本极低 |
| 架构设计、复杂工程 | **GLM（智谱）** | 推理能力强，擅长长上下文 |
| 翻译、多语言文档 | **Qwen（通义）** | 语言任务专项优化 |
| UI / 前端 / 设计 | **MiniMax** | 视觉与组件生成专家 |
| **代码审查、文件重写、终端任务** | **✨ Codex CLI** | **用 OpenAI/ChatGPT 账号 OAuth 登录，无需手动配置 API Key，可直接读写本地文件** |

> ✅ **目前专为 Antigravity 设计和验证。** 与 Cursor、VS Code Cline 等其他 MCP 客户端的兼容性尚未测试。

<div align="center">

![L-Hub 架构图](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture_zh.png)

</div>

**实际截图** — Antigravity 通过 L-Hub 分发任务：

<div align="center">

![Antigravity 实际运行](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/screenshot_antigravity.png)

</div>

---

## ⚙️ 核心功能

| 功能 | 说明 |
|---|---|
| **智能路由** | 根据任务类型自动选择最佳专家模型 |
| **Codex CLI Agent** | 无需 API Key，用 ChatGPT 账号登录即可让 Codex 直接对本地文件进行代码审查与重写 |
| **可视化面板** | 图形界面配置 API Key，无需编辑 JSON |
| **调用历史** | 记录每次调用的 Token 用量、耗时、使用模型 |
| **零配置安装** | 激活后自动写入 Antigravity 的 MCP 配置，开箱即用 |

---

## 🚀 快速开始（Antigravity）

### 第一步 — 安装插件

从 VS Code 商城搜索安装 **L-Hub**，或命令行：

```bash
code --install-extension readysteadyscience.l-hub
```

### 第二步 — 重启 Antigravity

L-Hub 激活时自动注册到 `~/.gemini/antigravity/mcp_config.json`，**无需手动修改任何配置文件**。

### 第三步 — 配置 API Key

**[⚙️ 一键打开 L-Hub 设置面板](command:l-hub.openPanel)** ← 点这里（在 Antigravity 内直接跳转）

或：命令面板 (`Cmd/Ctrl + Shift + P`) → **L-Hub: Open Dashboard** → Settings 页

### 第四步（可选）— 启用 Codex CLI

Codex CLI 通过 OpenAI 账号（与 ChatGPT 同一账号）进行 OAuth 登录 ，无需手动去平台申请并粘贴 API Key：

```bash
npm install -g @openai/codex   # 安装
codex login                     # 用 ChatGPT 账号登录
```

安装后，L-Hub 会自动识别并提供 `ai_codex_task` 工具，让 Antigravity 可以指派 Codex 直接对本地文件审查、重构或执行终端任务。

### 第五步 — 直接使用

照常与 Antigravity 对话。当它需要委派任务时，会自动调用 L-Hub。

> **✅ 验证方式**：在 Antigravity 工具面板看到 `MCP Tool: l-hub / ai_ask` 或 `l-hub / ai_codex_task` 出现，即表示 L-Hub 已成功接入并正常运行。

---

## 🤝 开源社区

L-Hub 是 **走起智造 · Ready Steady Science** 旗下 **Linglan Realm** 的免费开源工具。

[![⭐ 在 GitHub 点 Star](https://img.shields.io/badge/⭐_在_GitHub_上点_Star-readysteadyscience%2Fl--hub-brightgreen?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/stargazers)
[![💬 Discord 社区](https://img.shields.io/badge/Discord-加入社区-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)
[![📝 提交反馈](https://img.shields.io/badge/📝_反馈与建议-GitHub_Issues-blue?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)

---

<h2 id="english">🇬🇧 English</h2>

## Why L-Hub?

**Antigravity** runs on Claude Sonnet or Opus — among the most powerful AI models in the world. But they are also expensive. Using a top-tier model for every sub-task — routine code generation, translation, UI work — is wasteful.

**L-Hub solves this.** It is an MCP AI Bridge inside Antigravity. When Antigravity needs to delegate, it calls L-Hub instead of burning Claude credits. L-Hub routes requests to the most appropriate specialist:

| Task type | Routed to | Why |
|---|---|---|
| Code generation, debugging | **DeepSeek** | Fast, accurate, fraction of the cost |
| Architecture, complex engineering | **GLM** | High reasoning, long-context specialist |
| Translation, multilingual docs | **Qwen** | Optimized for language tasks |
| UI / frontend / design | **MiniMax** | Visual & component generation specialist |
| **Code review, file rewrites, terminal tasks** | **✨ Codex CLI** | **OpenAI/ChatGPT OAuth login — no manual API key setup. Reads/writes local files directly** |

> ✅ **Designed and tested for Antigravity.** Compatibility with other MCP clients is not yet verified.

<div align="center">

![L-Hub Architecture](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture.png)

</div>

<div align="center">

![Antigravity in action](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/screenshot_antigravity.png)

</div>

---

## ⚙️ Features

| Feature | Details |
|---|---|
| **Smart Routing** | Auto-selects the right specialist model by task type |
| **Codex CLI Agent** | No API key — uses ChatGPT login. Codex reads/writes local files and executes commands autonomously |
| **Dashboard** | GUI to configure API keys — no JSON editing |
| **History Console** | Logs every call: tokens used, latency, model selected |
| **Zero-Config Setup** | Auto-registers in Antigravity's MCP config on first activation |

---

## 🚀 Quick Start (Antigravity)

### Step 1 — Install

```bash
code --install-extension readysteadyscience.l-hub
```

### Step 2 — Restart Antigravity

L-Hub auto-registers itself in `~/.gemini/antigravity/mcp_config.json`. **No manual config needed.**

### Step 3 — Add API Keys

**[⚙️ Open L-Hub Dashboard](command:l-hub.openPanel)** ← click here (works inside Antigravity)

### Step 4 (Optional) — Enable Codex CLI

No manual API key needed — authenticates via your OpenAI account (same as ChatGPT) through browser OAuth:

```bash
npm install -g @openai/codex
codex login
```

Once installed, L-Hub exposes `ai_codex_task` so Antigravity can delegate full file rewrites, code review, and terminal tasks directly to Codex.

### Step 5 — Done

> **✅ Verified**: Look for `MCP Tool: l-hub / ai_ask` or `l-hub / ai_codex_task` in Antigravity's tool panel.

---

## 🤝 Community

L-Hub is free and open-source by **走起智造 · Ready Steady Science**.

[![⭐ Star on GitHub](https://img.shields.io/badge/⭐_Star_on_GitHub-readysteadyscience%2Fl--hub-brightgreen?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/stargazers)
[![💬 Discord Community](https://img.shields.io/badge/Discord-Join_Community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)
[![📝 Submit Feedback](https://img.shields.io/badge/📝_Feedback_%26_Issues-GitHub_Issues-blue?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)
