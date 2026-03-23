<div align="center">

![L-Hub](https://raw.githubusercontent.com/readysteadyscience/L-Hub/main/images/hero-banner.png)

**让 Antigravity 的主模型专注推理，辅助任务自动路由到专家模型 — 节省 60%+ Token**

*Stop burning tokens on auxiliary tasks. L-Hub routes them to expert models automatically.*

&nbsp;

[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Freadysteadyscience%2Fl-hub&query=%24.version&label=Version&color=blue&style=flat-square)](https://open-vsx.org/extension/readysteadyscience/l-hub)
[![Downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Freadysteadyscience%2Fl-hub&query=%24.downloadCount&label=Downloads&color=orange&style=flat-square)](https://open-vsx.org/extension/readysteadyscience/l-hub)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Antigravity](https://img.shields.io/badge/Antigravity-IDE%20Ready-7B68EE?style=flat-square)](https://www.antigravityide.com/)

</div>

---

## 核心痛点与解决方案
**Without L-Hub vs With L-Hub**

<div align="center">

![L-Hub Demo](https://raw.githubusercontent.com/readysteadyscience/L-Hub/main/images/demo.gif)

</div>

| 场景<br>Scenario | 没有 L-Hub (Without) | 使用 L-Hub (With) |
|----------|-----------|-------------|
| **代码审查**<br>Code Review | 主模型承担全量代码（极贵且慢）<br>Host writes all code (Expensive) | Codex CLI 初审 &rarr; 主模型把关<br>Codex CLI draft &rarr; Host verify |
| **翻译与文档**<br>Translation | Claude 翻译整篇大文档<br>Full docs by Claude | DeepSeek/Qwen 翻译 &rarr; 主模型润色<br>DeepSeek/Qwen translate &rarr; Host Polish |
| **Bug 修复**<br>Bug Fix | 仅单一主模型视角<br>Single-model perspective | 多模型并行投票 &rarr; 最佳方案胜出<br>Multi-model voting &rarr; Best wins |
| **模型调度**<br>API Routing | 手动去浏览器切网页<br>Manual browser tab switching | 统一 Dashboard，无感智能路由<br>Unified Dashboard, seamless |
| **Token 消耗**<br>Token Usage | 100% 主模型额度<br>100% Host Quota | **≤40% 主模型（省 60%+）**<br>**≤40% Host Quota (Save 60%+)** |

---

## 五大核心能力
**5 Core Superpowers**

### 自适应任务路由
***Smart 11-Task Routing***

自动识别 11 种任务类型（代码生成、检查、翻译、数学等），并无缝路由到您配置的最优专家模型。告别繁琐的手动切模型。

Auto-detects task type (code gen, review, translation, math...) and routes to the optimal model. Zero manual switching.

### 多模型投票引擎
***Multi-Model Consensus***

只需在对话框输入“投票择优”，后台将呼叫多个可用模型并行作答，最终由裁判模型融合成最佳答案。将算力转化为智力。（需手动触发）

Say "投票择优" in chat → multiple models answer in parallel → judge picks the best. Full control, manual trigger only.

### 内置免配置 CLI 代理
***Built-in CLI Agents***

原生集成 **Codex CLI** (ChatGPT) 与 **Gemini CLI**。直接调用您的官方订阅额度沙盒跑任务，无需再申请任何 API Key。

**Codex CLI** (ChatGPT OAuth) + **Gemini CLI** (Google OAuth) — use your subscription quota directly. No API key needed.

### 可视化中枢面板
***Visual Dashboard***

一站式可视化网关控制台。囊括模型品牌聚合管理、密钥安全存储、一键重置环境清理，以及自下而上的底层连接健康侦测。

One-stop config for all models grouped by Brands, 1-click environment cleanup, secure API keys, and comprehensive diagnostics.

### 状态栏全景雷达 (Mission Control HUD)
***Mission Control Status Bar***

原生融合编辑器底部状态栏的 4 联装网格监控台。无需打开 Dashboard，悬停状态栏即可实时总览云端专家阵列、本地机器沙盒状态、动态路由归属以及精准的 24H 专属网络遥测数据。

Hover the status bar for a 4-column Widescreen grid HUD. Instantly monitor cloud experts, local sandboxes, dynamic routing maps, and zero-baseline 24H 1st-party network telemetry.

---

## 已支持的专家模型库
**Supported Models Registry**

| 厂商<br>Provider | 代表模型<br>Models | 擅长领域<br>Best For Tasks |
|----------|--------|----------|
| **DeepSeek** | V3 / Reasoner | 高性价比代码生成、翻译与润色 ($0.028/M) |
| **智谱 GLM** | GLM-5 / GLM-5-Turbo | 多步骤复杂 Agent 拆解, 200K 长上下文 |
| **通义 Qwen** | Qwen-Max (3.5) / Plus | 中文语境、文档结构化整理 |
| **MiniMax** | M2.5 / M2.7 | 创意写作、大纲生成、发散性脑暴 |
| **Moonshot (Kimi)** | K2.5 | 深度数学证明与逻辑推理 |
| **OpenAI GPT**| GPT-5.4 (via Codex CLI) | 系统级终端提权、超大规模工程、1M 极长上下文 |
| **Google Gemini** | 3.1 Pro (via Gemini CLI)| 大前端全家桶、UI 设计演进、前瞻视觉分析 |
| **聚合分发** | OpenRouter / DMXAPI | 无限中继扩展与自动兜底路由机制 |

> **注意：** 列表中未包含 Claude。因为 Antigravity 主模型原生即由 Claude 驱动，再通过 L-Hub 套娃调用纯属浪费额度。
>
> **Note:** Claude is deliberately excluded. Antigravity's host model logic is already driven by Claude, routing to it via L-Hub is redundant.

---

## 快速开始
**Quick Start Guide**

> **L-Hub 专为 Antigravity IDE 量身定制**
> 
> L-Hub is exclusively designed for Antigravity IDE.

**1. 一键安装**
在 Antigravity 扩展商店中搜索 "L-Hub" 并点击安装。

**1. Install** — Search for "L-Hub" in the Antigravity Extension Marketplace.

**2. 激活沙盒**
执行 `Cmd/Ctrl + R` 重载窗口，L-Hub 会在后台自动完成 MCP 挂载与原生指令 Skill 的原子注入。

**2. Reload** — Press `Cmd/Ctrl + R` to reload window. L-Hub auto-registers MCP config and injects the routing skill.

**3. 填装弹药**
按下 `Cmd/Ctrl + Shift + P` 呼出面板输入 `L-Hub: Dash` 打开控制台，在"系统设置"中按需填入 API Key。

**3. Configure** — Run command `L-Hub: Open Dashboard` to securely add your preferred API keys.

**4. 沉浸探索**
像往常一样和主模型对话即可，遇到重复劳作，主模型会自动将脏活累活丢给 L-Hub 的临时工处理。

**4. Go** — Chat as usual. The Host model will automatically delegate heavy-lifting tasks to L-Hub's expert models.

```text
安装完毕后，确保以下内置原子工具已就绪：
After installation, verify these atomic tools appear via /list:

lhub / ai_ask           → 智能单模型路由
lhub / ai_multi_ask     → 多模型并行发散
lhub / ai_consensus     → 多模型共识投票
lhub / ai_codex_task    → 唤起 Codex 沙盒
lhub / ai_gemini_task   → 唤起 Gemini 沙盒
lhub / ai_list_providers→ 可视化检测已配模型栈
```

### 可选补充：解锁零配置 CLI 代理
***Optional: Unlock Config-Free CLI Agents***
```bash
# 解锁 ChatGPT PLUS 订阅户无感额度调用
npm install -g @openai/codex && codex login

# 解锁 Google Advanced 订阅户无感额度调用
npm install -g @google/gemini-cli && gemini
```

---

## 常见问题
**FAQ**

**Q: L-Hub 支持 VS Code 吗？**
A: **绝不支持。** L-Hub 是 Antigravity IDE 生态的专属基础设施，重度依赖于其底层的 Agentic 控制机制。

**Q: Does L-Hub support VS Code?**
A: **No.** L-Hub is an exclusive infrastructure built strictly for the Antigravity IDE ecosystem.

**Q: 我必须把 8 个平台的 API Key 都凑齐才能用吗？**
A: **完全不需要。** 只要有任何 1 个可用的 Key 就能跑通基础路由。填的 Key 越多，能帮你省下的钱和触发的专家领域就越精准。

**Q: Do I need all 8 API keys?**
A: **Not at all.** A single API key is enough. But the more keys you have, the better the fallback routing precision.

**Q: 你们窃取我的 API Key 吗？安全吗？**
A: **绝对安全。** 所有密钥均由 Antigravity 官方原生的加密离线保管库（SecretStorage）锁死，没有任何数据会离开你的这台电脑。

**Q: Is my API key safe?**
A: **100% safe.** Keys are securely stored locally inside Antigravity's offline SecretStorage wrapper.

---

<div align="center">

**走起智造 · Ready Steady Science** — Linglan Realm

&nbsp;

[![Install L-Hub](https://img.shields.io/badge/Install_L--Hub-Antigravity_IDE-7B68EE?style=for-the-badge)](https://open-vsx.org/extension/readysteadyscience/l-hub)

</div>
