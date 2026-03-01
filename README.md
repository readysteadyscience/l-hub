<div align="center">

# L-Hub

**MCP AI Bridge**

*为 Antigravity 省钱 — 把日常任务委派给专家模型*

[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square&logo=visualstudiocode)](https://github.com/readysteadyscience/l-hub)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](https://github.com/readysteadyscience/l-hub/blob/main/LICENSE)
[![Brand](https://img.shields.io/badge/%E8%B5%B0%E8%B5%B7%E6%99%BA%E9%80%A0-Ready%20Steady%20Science-orange?style=flat-square)](https://github.com/ReadySteadyScience)
[![Universe](https://img.shields.io/badge/产品线-Linglan%20Realm-blueviolet?style=flat-square)](https://github.com/ReadySteadyScience)

[![GitHub Stars](https://img.shields.io/github/stars/readysteadyscience/l-hub?style=flat-square&logo=github&label=%E2%AD%90%20Stars&color=yellow)](https://github.com/readysteadyscience/l-hub/stargazers)
[![Discord](https://img.shields.io/badge/Discord-Community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)
[![Feedback](https://img.shields.io/badge/%F0%9F%92%AC%20反馈-GitHub%20Issues-blue?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)

> **L-Hub** 是 **走起智造 · Ready Steady Science** 旗下 **Linglan Realm** 产品线中的免费开源工具。

</div>

---

## 为什么需要 L-Hub？ / Why L-Hub?

**Antigravity** 是功能强大的 AI 编程助手，主模型天生擅长任务调度和复杂推理，但处理每一个日常子任务都消耗大量 token，成本高。**L-Hub 解决了这个问题。** 它把请求路由给最合适、最具性价比的专家模型。

Antigravity is a powerful AI coding assistant, but having it handle every routine sub-task burns through tokens fast. L-Hub routes each request to the most appropriate and cost-effective specialist model.

### 默认智能路由推荐 / Default Smart Routing

以下为 L-Hub 根据任务类型推荐的最佳模型，覆盖国内与国际主流厂商。用户可自由配置，不限于此表。

| 任务类型 / Task | 推荐模型 / Recommended | 原因 / Why |
|---|---|---|
| 代码生成 Code Gen | **DeepSeek-V3** / Qwen-Coder-Plus | SWE-bench 顶尖，性价比最高；Qwen 代码专项 |
| 调试 / 重构 Debug | **Claude Opus 4.6** / GPT-5.3 Codex | 全球编程最强；Terminal-Bench #1 |
| 架构设计 Architecture | **Claude Opus 4.6** / GLM-5 | 企业级 Agentic 设计；GLM 工程接近 Opus |
| 文档 Documentation | **Claude Sonnet 4.6** / Qwen-Max | 均衡首选；Qwen 中文文档最强 |
| 翻译 Translation | **Qwen-Max** / Mistral Large 3 | 中文翻译全球第一；Mistral 欧洲多语言 |
| UI / 前端 Frontend | **Gemini 3.1 Flash** / MiniMax-M2.5 | Google 多模态视觉；MiniMax 100 tok/s |
| 图像理解 Vision | **Gemini 3.1 Pro** / GPT-5.1 | 百万 token 多模态；OpenAI 视觉成熟 |
| 长文本 Long Context | **Gemini 3.1 Pro** / Kimi K2.5 | 百万 token 上下文；256K MoE 超长文档 |
| 数学 / 推理 Reasoning | **DeepSeek-R1** / Gemini 3.1 Pro | R1 思维链顶尖；ARC-AGI-2 全球第一 |
| 工具调用 Tool Calling | **Qwen-Max** / GPT-5.1 | Tau2-bench #1；OpenAI Function Calling 标准 |
| 创意写作 Creative | **Claude Sonnet 4.6** / Qwen-Max | 创意与表达力最强；中文写作首选 |
| Agentic 任务 | **MiniMax-M2.5** / Claude Opus 4.6 | SWE-bench 80.2%；企业级 Agentic 标杆 |
| 终端 / DevOps Terminal | **GPT-5.3 Codex** / Codex CLI | Terminal-Bench #1；CLI 直读写本地文件 |

---

## 支持的模型 / Supported Models

L-Hub 采用 **OpenAI 兼容接口**，只要模型支持该格式即可接入。目前内置支持以下厂商的最新模型：

| 厂商 / Provider | 模型 / Models |
|---|---|
| **DeepSeek** | V3 (deepseek-chat), R1 (deepseek-reasoner) |
| **GLM 智谱** | GLM-5 |
| **Qwen 通义** | Qwen-Max (Qwen3.5), Qwen-Coder-Plus |
| **MiniMax** | M2.5, M2.5-HighSpeed |
| **Kimi** | K2.5 (kimi-k2-instruct) |
| **OpenAI** | GPT-5.1, GPT-5.3 Codex |
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6, Opus 4.5, Sonnet 4.5 |
| **Google** | Gemini 3.1 Flash, 3.1 Pro Preview, Image Gen |
| **Mistral** | Mistral Large 3 |
| **Meta** | Llama 3.3 70B (需中转 / relay required) |
| **API 聚合** | OpenRouter, 一步API, DMXAPI |

同时支持自定义接口和第三方 API 中转，填入 Base URL 即可接入任何 OpenAI 兼容模型。

<div align="center">

![L-Hub 架构图](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture_zh.png)

</div>

---

## 核心功能 / Features

| 功能 / Feature | 说明 / Details |
|---|---|
| **智能路由** Smart Routing | 根据任务类型自动选择最佳专家模型 |
| **Codex CLI Agent** | 无需 API Key，用 ChatGPT 账号 OAuth 登录，直接读写本地文件 |
| **价格参考表** Pricing | 内置 OpenRouter 价格数据，帮助用户选择性价比最优模型 |
| **可视化面板** Dashboard | 图形界面配置 API Key、管理模型，无需编辑 JSON |
| **调用历史** History | 记录每次调用的 Token 用量、耗时、使用模型 |
| **零配置安装** Zero-Config | 激活后自动写入 Antigravity MCP 配置，开箱即用 |

---

## 快速开始 / Quick Start

### 第 1 步 — 安装 / Install

从 VS Code 商城搜索安装 **L-Hub**，或：

```bash
code --install-extension readysteadyscience.l-hub
```

### 第 2 步 — 重启 Antigravity / Restart

L-Hub 激活时自动注册到 `~/.gemini/antigravity/mcp_config.json`，**无需手动修改任何配置文件**。

### 第 3 步 — 配置 API Key / Add Keys

命令面板 (`Cmd/Ctrl + Shift + P`) → 输入 **L-Hub: Open Dashboard** → Settings 页填入 Key

### 第 4 步（可选）— 启用 Codex CLI / Enable Codex

Codex CLI 通过 OpenAI 账号 OAuth 登录，无需手动申请 API Key：

```bash
npm install -g @openai/codex   # 安装 / Install
codex login                     # 用 ChatGPT 账号登录 / Login
```

安装后，L-Hub 自动提供 `ai_codex_task` 工具，让 Antigravity 指派 Codex 直接对本地文件审查、重构或执行终端任务。

### 第 5 步 — 直接使用 / Done

照常与 Antigravity 对话即可。检查是否成功：

> **验证 / Verify**：在 Antigravity 工具面板看到 `MCP Tool: l-hub / ai_ask` 或 `l-hub / ai_codex_task`。

---

## 开源社区 / Community

L-Hub 是 **走起智造 · Ready Steady Science** 旗下 **Linglan Realm** 的免费开源工具。

[![Star on GitHub](https://img.shields.io/badge/Star_on_GitHub-readysteadyscience%2Fl--hub-brightgreen?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/stargazers)
[![Discord Community](https://img.shields.io/badge/Discord-Join_Community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)
[![Submit Feedback](https://img.shields.io/badge/Feedback-GitHub_Issues-blue?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)
