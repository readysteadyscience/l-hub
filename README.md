<div align="center">

# L-Hub

**MCP AI Bridge — 智能多模型路由**

*让 Antigravity 自动把子任务委派给最合适的专家模型，省 token、降成本*

[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square&logo=visualstudiocode)](https://github.com/readysteadyscience/l-hub)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](https://github.com/readysteadyscience/l-hub/blob/main/LICENSE)
[![Brand](https://img.shields.io/badge/%E8%B5%B0%E8%B5%B7%E6%99%BA%E9%80%A0-Ready%20Steady%20Science-orange?style=flat-square)](https://github.com/ReadySteadyScience)
[![Universe](https://img.shields.io/badge/产品线-Linglan%20Realm-blueviolet?style=flat-square)](https://github.com/ReadySteadyScience)

[![GitHub Stars](https://img.shields.io/github/stars/readysteadyscience/l-hub?style=flat-square&logo=github&label=Stars&color=yellow)](https://github.com/readysteadyscience/l-hub/stargazers)
[![Discord](https://img.shields.io/badge/Discord-Community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)
[![Feedback](https://img.shields.io/badge/Feedback-Issues-blue?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)

> **走起智造 · Ready Steady Science** 旗下 **Linglan Realm** 产品线 — 免费开源

</div>

---

## 为什么需要 L-Hub？

Antigravity 的主控模型擅长调度与推理，但让它处理每一个子任务（写代码、翻译、UI）成本极高。

**L-Hub 是内置的 MCP AI 桥接器** — 自动把每个子任务路由到最合适的专家模型，只用最低的 token 开销。

---

## 产品亮点

**按任务类型智能路由** — 代码任务自动走 DeepSeek，翻译走 Qwen，架构走 Claude/GLM，无需手动选。13 种任务类型 × 10+ 厂商，全自动匹配。

**国内外 20+ 模型一站接入** — DeepSeek、GLM、Qwen、MiniMax、Kimi（国内直连）+ OpenAI、Claude、Gemini、Mistral（国际）+ OpenRouter/一步API/DMXAPI（聚合中转），统一管理。

**ChatGPT 账号零门槛** — 内置 Codex CLI 支持，用 ChatGPT 账号 OAuth 登录即可，无需申请 API Key，直接对本地文件做代码审查和重写。

**装上就能用** — 激活后自动写入 Antigravity 的 MCP 配置，零手动配置。可视化面板管理 Key 和模型，不用编辑 JSON。

**内置价格参考** — OpenRouter 实时价格数据，在设置页直接对比各模型的输入/输出成本。

---

## 默认路由推荐

以下为 L-Hub 按任务类型推荐的最佳模型。这只是默认参考，您可以自由修改任务分配。

| 任务 | 推荐模型 | 原因 |
|---|---|---|
| 代码生成 | **DeepSeek-V3** / Qwen-Coder-Plus | SWE-bench 顶尖，性价比最高 |
| 调试 / 重构 | **Claude Opus 4.6** / GPT-5.3 Codex | 全球编程最强；Terminal-Bench #1 |
| 架构设计 | **Claude Opus 4.6** / GLM-5 | 企业级 Agentic；GLM 工程接近 Opus |
| 文档 | **Claude Sonnet 4.6** / Qwen-Max | 均衡首选；中文文档最强 |
| 翻译 | **Qwen-Max** / Mistral Large 3 | 中文第一；Mistral 欧洲多语言 |
| UI / 前端 | **Gemini 3.1 Flash** / MiniMax-M2.5 | 多模态视觉；100 tok/s 高速 |
| 图像理解 | **Gemini 3.1 Pro** / GPT-5.1 | 百万 token 多模态 |
| 长文本 | **Gemini 3.1 Pro** / Kimi K2.5 | 百万上下文；256K MoE |
| 推理 | **DeepSeek-R1** / Gemini 3.1 Pro | R1 思维链；ARC-AGI-2 #1 |
| 工具调用 | **Qwen-Max** / GPT-5.1 | Tau2-bench #1 |
| Agentic | **MiniMax-M2.5** / Claude Opus 4.6 | SWE-bench 80.2% |
| 终端 / DevOps | **GPT-5.3 Codex** / Codex CLI | Terminal-Bench #1 |

---

## 支持的模型

L-Hub 采用 OpenAI 兼容接口，任何支持该格式的模型均可接入。内置支持：

| 厂商 | 内置型号 |
|---|---|
| DeepSeek | V3, R1 |
| GLM 智谱 | GLM-5 |
| Qwen 通义 | Qwen-Max, Qwen-Coder-Plus |
| MiniMax | M2.5, M2.5-HighSpeed |
| Kimi | K2.5 |
| OpenAI | GPT-5.1, GPT-5.3 Codex |
| Anthropic | Opus 4.6, Sonnet 4.6, Opus 4.5, Sonnet 4.5 |
| Google | Gemini 3.1 Flash, 3.1 Pro, Image Gen |
| Mistral | Large 3 |
| Meta | Llama 3.3 70B (需中转) |
| 聚合平台 | OpenRouter, 一步API, DMXAPI |

也可自定义 Base URL 接入任何 OpenAI 兼容模型。

<div align="center">

![L-Hub 架构图](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture_zh.png)

</div>

---

## 快速开始

**1. 安装** — 商城搜索 L-Hub，或命令行：

```bash
code --install-extension readysteadyscience.l-hub
```

**2. 重启 Antigravity** — L-Hub 自动注册 MCP 配置，无需手动操作。

**3. 配置 API Key** — `Cmd/Ctrl + Shift + P` → `L-Hub: Open Dashboard` → 添加模型并填入 Key。

**4. （可选）启用 Codex CLI** — 用 ChatGPT 账号登录，无需额外 API Key：

```bash
npm install -g @openai/codex && codex login
```

**5. 开始使用** — 照常与 Antigravity 对话，L-Hub 自动接管子任务路由。

> 验证：工具面板出现 `l-hub / ai_ask` 和 `l-hub / ai_codex_task` 即成功。

---

## 社区

**走起智造 · Ready Steady Science** — Linglan Realm 免费开源工具。

[![Star on GitHub](https://img.shields.io/badge/Star-GitHub-brightgreen?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/stargazers)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)
[![Feedback](https://img.shields.io/badge/Feedback-Issues-blue?style=flat-square&logo=github)](https://github.com/readysteadyscience/l-hub/issues/new)
