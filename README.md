<div align="center">

# L-Hub

**MCP AI Bridge — 智能多模型路由中枢**

*The Smart Multi-Model Router for Antigravity IDE*

&nbsp;

![L-Hub Demo](./docs/demo-placeholder.gif)

*解决开发者多模型 API 切换繁琐问题，智能切分的路由中枢*
*Stop juggling AI APIs. Let L-Hub intelligently route tasks to the right model — save tokens, cut costs, boost productivity.*

&nbsp;

[![Version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Freadysteadyscience%2Fl-hub&query=%24.version&label=Version&color=blue&style=flat-square&logo=visualstudiocode)](https://open-vsx.org/extension/readysteadyscience/l-hub)
[![Downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fopen-vsx.org%2Fapi%2Freadysteadyscience%2Fl-hub&query=%24.downloadCount&label=Downloads&color=orange&style=flat-square&logo=openvscode)](https://open-vsx.org/extension/readysteadyscience/l-hub)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](https://github.com/readysteadyscience/L-Hub/blob/main/LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/gurEPMnn52)

[![GitHub Stars](https://img.shields.io/github/stars/readysteadyscience/L-Hub?style=flat-square&logo=github&label=Stars&color=yellow)](https://github.com/readysteadyscience/L-Hub/stargazers)
[![Antigravity](https://img.shields.io/badge/Antigravity-IDE%20Ready-7B68EE?style=flat-square&logo=visualstudiocode)](https://www.antigravityide.com/)


**走起智造 · Ready Steady Science** — Linglan Realm

</div>

&nbsp;

---

&nbsp;

## ✨ 为什么选择 L-Hub？ (Why L-Hub?)

**痛点 (The Pain):** Antigravity IDE 原生的 AI 面板仅支持少数特定模型（如 Gemini、Claude）。当你需要接入 **DeepSeek V3、Qwen、GLM** 等高性价比模型，或想使用其他自定义 API 厂商时，IDE 本身无能为力。

*Antigravity's native AI panel only supports a few specific models (e.g., Gemini, Claude). You're locked out when you need **high-value models like DeepSeek V3, Qwen, GLM**, or want to use other custom API providers.*

**解决方案 (The Solution):** L-Hub 是你的 **外部大模型扩展中枢**。当 Antigravity 自带的主模型（如 Claude 4.6 / Gemini 3.1 Pro）处理核心推理与充当"总指挥"时，L-Hub 能够**为你解锁并接入外部所有的优质大模型**，将代码生成、审查等任务自动委派、路由给高性价比的特定专家（如 Codex CLI / GPT-5.4），从而在不损失能力的前提下，**大幅节省你原生主模型的 Token 配额消耗，同时提升干活效率**。

*L-Hub is your **external LLM expansion hub**. While Antigravity's native models (like Claude 4.6 / Gemini 3.1 Pro) serve as commanders focusing on core reasoning, L-Hub **seamlessly weaves external expert models into your workflow**. By routing auxiliary tasks like code generation and review to highly cost-effective models (e.g., Codex CLI / GPT-5.4), it **drastically cuts your native token consumption and boosts efficiency** without sacrificing quality.*

&nbsp;

## 🚀 核心特性 (Core Features)

### 🤖 **内置智能调度 (Built-in Intelligent Routing)**
安装即用。自动为 Antigravity 注入路由 Skill，基于四层规则（简单问答、代码审查、专业任务、创意协作链）智能分发任务，最大化你的 API 额度价值。

*Works out-of-the-box. Auto-injects a routing Skill into Antigravity. Uses a 4-tier rule system to intelligently dispatch tasks, maximizing your API quota.*

### 🏆 **多模型投票引擎 (Multi-Model Voting Engine)**
`ai_consensus` — 在对话中简单说“**投票择优**”，即可启动并行推理。多个模型同时回答，由裁判模型评分，返回最佳结果。**按需手动触发，完全可控。**

*Simply say **"vote for the best"** in chat to activate parallel reasoning. Multiple models answer, a judge scores, returns the best. **Manual trigger only, full control.***

### 🔀 **13 类任务自动寻优 (13-Task-Type Auto-Routing)**
代码生成、调试、翻译、总结、创意写作等 13 大类任务，自动匹配至性价比最优的模型。告别选择困难症。

*Code gen, debug, translation, summarization, creative writing — 13 task types auto-matched to the most cost-effective model. No more decision fatigue.*

### 🌐 **8+ 厂商 & 平台支持 (8+ Providers & Platforms)**
原生支持 **DeepSeek, GLM, Qwen, MiniMax, Kimi, OpenAI, Claude, Gemini**。同时支持 **OpenRouter, DMXAPI** 等聚合平台。自定义 Base URL 轻松接入任何兼容 API。

*Native support for 8 major providers. Plus relay platforms. Custom Base URL for any compatible API endpoint.*

### 🔌 **内置 CLI 代理 (Built-in CLI Agents)**
直接使用 **Codex CLI (ChatGPT OAuth)** 和 **Gemini CLI (Google OAuth)**，享受你的订阅账户额度，无需额外配置 API Key。

*Use **Codex CLI (ChatGPT OAuth)** and **Gemini CLI (Google OAuth)** directly. Leverages your subscription quota.*

### 🧪 **一键诊断测试 (One-Click Diagnostics)**
Dashboard 内置完整测试 Prompt，一键复制粘贴到聊天框，自动验证全部 **8 项功能**（7个 MCP 工具 + 1个 Skill），确保一切就绪。

*Built-in test prompt in the Dashboard. One click copies it to chat, auto-verifies all **8 features**, ensuring everything works.*

&nbsp;

---

&nbsp;

## ⚡ 快速开始 (Quick Start)

> ⚠️ **L-Hub 专为 Antigravity IDE 打造并完美适配。**
> *L-Hub is designed exclusively for Antigravity IDE.*

&nbsp;

### **方法一：Antigravity 内安装 (Install from IDE)**
1.  打开扩展面板 (`Ctrl+Shift+X` / `Cmd+Shift+X`)。
2.  搜索 **`L-Hub`**。
3.  点击 **安装**。扩展将自动配置 MCP 并安装路由 Skill。

*Open Extensions view, search for `L-Hub`, click Install. MCP config and Routing Skill are auto-setup.*

&nbsp;

### **命令行安装 (Install via CLI)**
```bash
# Using Antigravity IDE Extension CLI
/Applications/Antigravity.app/Contents/Resources/app/bin/antigravity --install-extension readysteadyscience.l-hub
```

&nbsp;

### **配置 API 密钥 (Configure API Keys)**
1.  按 `Cmd/Ctrl + Shift + P` 打开命令面板。
2.  输入并选择 **`L-Hub: Open Dashboard`**。
3.  在 Dashboard 中，为你需要的模型添加并填入 API Key。

*Open Command Palette, run `L-Hub: Open Dashboard`, add your API keys.*

&nbsp;

### **(可选) 设置 CLI 代理 (Optional: Setup CLI Agents)**
```bash
# For ChatGPT subscription quota
npm install -g @openai/codex
codex login
# Follow the OAuth flow in your browser

# For Gemini subscription quota
npm install -g @google/gemini-cli
gemini
# Follow the OAuth flow
```

&nbsp;

### **验证安装 (Verify Installation)**
安装后，你的工具面板应出现以下 L-Hub 工具：

*After installation, you should see these L-Hub tools in your tool panel:*
```
lhub / ai_ask          # 通用问答路由
lhub / ai_consensus    # 多模型投票
lhub / ai_codex_task   # Codex CLI 任务
lhub / ai_gemini_task  # Gemini CLI 任务
```

&nbsp;

### **运行测试 (Run the Test)**
在 Dashboard 中点击 **🧪 测试** 按钮，复制生成的 Prompt，粘贴到 Antigravity 聊天框并发送。等待完整的诊断报告。

*Click the **🧪 Test** button in Dashboard, copy the prompt, paste into chat, and send. Await the full diagnostic report.*

&nbsp;

---

&nbsp;

## 📖 工作原理 (How It Works)

L-Hub 充当 **MCP (Model Context Protocol) 服务器**，在您的 IDE 和多个 AI 模型之间建立智能桥梁。

1.  **拦截与分析 (Intercept & Analyze):** 当您在 Antigravity 中提出复杂请求时，L-Hub 的调度 Skill 会介入，将请求分解为逻辑子任务。
2.  **智能路由 (Smart Routing):** 基于任务类型、复杂度和预设的成本规则，每个子任务被路由到最合适的模型（例如：代码审查 -> Codex CLI (GPT-5.4)，辅助信息整理 -> DeepSeek V3，而主控逻辑留给原生 Claude 4.6/Gemini 3.1 Pro）。
3.  **聚合返回 (Aggregate & Return):** 所有子任务的结果被收集、整合，并作为一个连贯的响应返回给主模型，再由主模型呈现给您。
4.  **透明可控 (Transparent & Controllable):** 整个过程在后台进行，但您可以在需要时通过特定工具（如 `ai_consensus`）进行手动干预。

&nbsp;

---

&nbsp;

## 🛠️ 为开发者打造 (Built for Developers)

| 场景 (Scenario) | L-Hub 如何帮助 (How L-Hub Helps) |
| :--- | :--- |
| **辅助生成 (Auxiliary Gen)** | 前端样式问题路由给 Gemini 3.1 Flash，大规模文档翻译或注释路由给 DeepSeek V3，架构推演留给原生 Claude 4.6。 |
| **代码审查 (Code Review)** | 自动将审查任务发给本地文件读取专精的**Codex CLI (GPT-5.4)**，节省主模型额度同时避免漏改文件。 |
| **技术写作 (Tech Writing)** | 研究摘要用 MiniMax，初稿用 Qwen 3.5，最后由您的主模型 (原生 Claude 4.6/Gemini 3.1 Pro) 综合吸收输出最终结果。 |
| **学习新框架 (Learning New Frameworks)** | 基础概念问答用低成本模型，复杂示例和最佳实践用高级模型。 |

&nbsp;

---

&nbsp;

## 🤝 社区与支持 (Community & Support)

L-Hub 是 **走起智造 (Ready Steady Science)** — Linglan Realm 旗下的免费开源项目。我们相信工具应该提升效率，而非增加复杂度。

**有问题或建议？**
*Questions or suggestions?*

-   **[GitHub Issues](https://github.com/readysteadyscience/L-Hub/issues/new):** 报告 Bug 或请求新功能。
-   **[Discord](https://discord.gg/gurEPMnn52):** 加入我们的社区，与其他开发者交流。
-   **给项目点个 Star ⭐:** 这是对我们最大的支持，也帮助更多开发者发现这个工具。

&nbsp;

---

&nbsp;

<div align="center">

## 🚀 立即安装，开启智能路由之旅！

**🚀 Like L-Hub? Support our open-source journey with a ⭐ on GitHub!**

[![Star Us on GitHub](https://img.shields.io/badge/Give%20us%20a%20Star-%E2%AD%90%20Star%20L--Hub-yellow?style=for-the-badge&logo=github)](https://github.com/readysteadyscience/L-Hub/stargazers)

**走起智造 · Ready Steady Science** — Building Tools for Smarter Creation.

</div>
