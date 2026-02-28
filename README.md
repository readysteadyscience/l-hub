<div align="center">

# L-Hub

**MCP AI Bridge**

*Smart multi-model routing for Antigravity & VS Code*

[![Version](https://img.shields.io/badge/version-0.0.9-blue?style=for-the-badge&logo=visualstudiocode)](https://github.com/readysteadyscience/l-hub)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](https://github.com/readysteadyscience/l-hub/blob/main/LICENSE)
[![Brand](https://img.shields.io/badge/%E8%B5%B0%E8%B5%B7%E6%99%BA%E9%80%A0-Ready%20Steady%20Science-orange?style=for-the-badge)](https://github.com/ReadySteadyScience)
[![Universe](https://img.shields.io/badge/Product%20Line-Linglan%20Realm-blueviolet?style=for-the-badge)](https://github.com/ReadySteadyScience)

[![GitHub Stars](https://img.shields.io/github/stars/readysteadyscience/l-hub?style=for-the-badge&logo=github&label=%E2%AD%90%20Stars&color=yellow)](https://github.com/readysteadyscience/l-hub/stargazers)
[![Feedback](https://img.shields.io/badge/%F0%9F%92%AC%20Feedback-GitHub%20Issues-blue?style=for-the-badge&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)

> **L-Hub** is part of the [Linglan Realm](https://github.com/ReadySteadyScience) product universe by **走起智造 · Ready Steady Science**.

</div>

<div align="center">
  <a href="#english">🇬🇧 English</a> | <a href="#chinese">🇨🇳 简体中文</a>
</div>

---

<h2 id="english">🇬🇧 English</h2>

## What is L-Hub?

L-Hub is a **VS Code extension** that acts as an **MCP AI Bridge** between your Coordinator Model (e.g., Antigravity) and a pool of specialized AI APIs.

Your coordinator model dispatches each sub-task to the expert best suited for it — architecture to GLM, code to DeepSeek, UI to MiniMax, translation to Qwen — automatically, with no manual switching.

<div align="center">

![L-Hub Architecture](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture.png)

</div>

**Live demo** — Antigravity dispatching tasks to multiple models via L-Hub:

<div align="center">

![Antigravity in action](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/screenshot_antigravity.png)

</div>

---

## ⚙️ Features

| Feature | Details |
|---|---|
| **Smart Routing** | Auto-selects the right model based on task type |
| **Dashboard** | GUI to configure API keys — no JSON editing |
| **History Console** | Logs every call: tokens, latency, model used |
| **Zero-Config Setup** | Installs itself into Antigravity's MCP config automatically |

---

## 🚀 Quick Start

### Step 1 — Install the Extension

Install **L-Hub** from the VS Code Marketplace, or via:

```bash
code --install-extension readysteadyscience.l-hub
```

### Step 2 — Restart Antigravity / VS Code

L-Hub registers itself automatically in `~/.gemini/antigravity/mcp_config.json` on first activation. **No manual config needed.**

### Step 3 — Add Your API Keys

**[⚙️ Open L-Hub Dashboard](command:l-hub.openPanel)** ← click here (works in VS Code)

Or: Command Palette (`Cmd/Ctrl + Shift + P`) → **L-Hub: Open Dashboard** → Settings tab → Enter your API keys:

| Provider | Use case |
|---|---|
| DeepSeek | Code generation, everyday tasks |
| GLM (Zhipu) | Complex architecture, engineering |
| Qwen | Translation, multilingual, docs |
| MiniMax | UI/frontend, visual design |

### Step 4 — Done

Ask your coordinator model anything. L-Hub routes it automatically.

> **✅ Verification**: When L-Hub is connected correctly, you will see `MCP Tool: l-hub / ai_list_providers` (or `ai_ask`) appear in Antigravity's tool invocation panel. This confirms L-Hub is live and routing is active.

---

## 🤝 Community

L-Hub is free and open-source by **走起智造 · Ready Steady Science**.

[![⭐ Star on GitHub](https://img.shields.io/badge/⭐_Star_on_GitHub-readysteadyscience%2Fl--hub-brightgreen?style=for-the-badge&logo=github)](https://github.com/readysteadyscience/l-hub/stargazers)
[![💬 Submit Feedback](https://img.shields.io/badge/💬_Feedback_%26_Issues-GitHub_Issues-blue?style=for-the-badge&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)

---

<h2 id="chinese">🇨🇳 简体中文</h2>

## L-Hub 是什么？

L-Hub 是一个 **VS Code 插件**，作为 **MCP AI 桥接器**，将主控模型（如 Antigravity）与多个专业 AI API 连接起来。

主控模型把任务拆分后，由 L-Hub 自动路由给最适合的专家模型——架构问题交给 GLM，代码生成交给 DeepSeek，前端设计交给 MiniMax，翻译文档交给 Qwen——全自动分配，无需手动切换。

<div align="center">

![L-Hub 架构图](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture_zh.png)

</div>

**实际截图** — Antigravity 通过 L-Hub 并行向多个模型分发任务：

<div align="center">

![Antigravity 实际运行](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/screenshot_antigravity.png)

</div>

---

## ⚙️ 核心功能

| 功能 | 说明 |
|---|---|
| **智能路由** | 根据任务类型自动选择最佳模型 |
| **可视化面板** | 图形界面配置 API Key，无需编辑 JSON |
| **调用历史** | 记录每次调用的 Token 用量、耗时、使用的模型 |
| **零配置安装** | 激活后自动写入 Antigravity 的 MCP 配置，开箱即用 |

---

## 🚀 快速开始

### 第一步 — 安装插件

从 VS Code 商城搜索安装 **L-Hub**，或命令行：

```bash
code --install-extension readysteadyscience.l-hub
```

### 第二步 — 重启 Antigravity / VS Code

L-Hub 激活时会**自动注册**到 `~/.gemini/antigravity/mcp_config.json`，**无需手动修改任何配置文件**。

### 第三步 — 配置 API Key

**[⚙️ 一键打开 L-Hub 设置面板](command:l-hub.openPanel)** ← 点这里（在 VS Code 内直接跳转）

或：命令面板 (`Cmd/Ctrl + Shift + P`) → **L-Hub: Open Dashboard** → Settings 页 → 填入各模型的 API Key：

| Provider | 推荐使用场景 |
|---|---|
| DeepSeek | 日常代码生成、性价比优先 |
| GLM（智谱） | 复杂架构设计、工程重构 |
| Qwen（通义） | 翻译、多语言文档处理 |
| MiniMax | 前端 UI、视觉设计 |

### 第四步 — 开始使用

向主控模型提问，L-Hub 全自动路由，无需其他操作。

> **✅ 验证方式**：连接成功后，在 Antigravity 的工具调用面板中可以看到 `MCP Tool: l-hub / ai_list_providers` 或 `ai_ask` 字样出现，即代表 L-Hub 已成功接入，正在正常运行。

---

## 🤝 开源社区

L-Hub 是 **走起智造 · Ready Steady Science** 旗下 **Linglan Realm** 的免费开源工具。

[![⭐ 在 GitHub 点 Star](https://img.shields.io/badge/⭐_在_GitHub_上点_Star-readysteadyscience%2Fl--hub-brightgreen?style=for-the-badge&logo=github)](https://github.com/readysteadyscience/l-hub/stargazers)
[![💬 提交反馈](https://img.shields.io/badge/💬_反馈与建议-GitHub_Issues-blue?style=for-the-badge&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)
