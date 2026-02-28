<div align="center">

![L-Hub Logo](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/logo.png)

# L-Hub: The MCP AI Bridge
**Multi-Model Collaboration & Smart Routing**

*Let your Coordinator Model delegate tasks to the specialized Expert Models it deserves.*

[![Version](https://img.shields.io/badge/version-0.0.8-blue?style=for-the-badge&logo=visualstudiocode)](https://github.com/ReadySteadyScience/l-hub)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](https://github.com/ReadySteadyScience/l-hub)
[![Brand](https://img.shields.io/badge/走启智造-ReadySteadyScience-orange?style=for-the-badge)](https://github.com/ReadySteadyScience)
[![Universe](https://img.shields.io/badge/产品线-Linglan%20Realm-blueviolet?style=for-the-badge)](https://github.com/ReadySteadyScience)

> **L-Hub** is part of the [Linglan Realm](https://github.com/ReadySteadyScience) product universe, under the brand **走启智造 (ReadySteadyScience)**.

</div>

<div align="center">
  <a href="#english-version">🇬🇧 English</a> | <a href="#chinese-version">🇨🇳 简体中文</a>
</div>

---

<h2 id="english-version">🇬🇧 English</h2>

## 💡 What is L-Hub?

In modern AI workflows, you often rely on a **Coordinator Model** (such as Antigravity) to analyze your overall intent and break down complex problems.

However, a single model isn't always the best at every task.  
**L-Hub is an MCP AI Bridge** that sits between your Coordinator Model and a pool of specialized API endpoints.

When your Coordinator Model executes a task, it routes the request through L-Hub. L-Hub then uses **Smart Routing** to dynamically assign each sub-task to the most capable model — for example, sending heavy coding tasks to a fast & cost-effective coder, and broad architectural planning to a high-reasoning engine.

> ⚠️ **Currently only tested with Antigravity.** Compatibility with Cursor, VS Code + Cline, or other MCP clients has not yet been verified.

![L-Hub Architecture Diagram](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture.png)

### 🌟 How it works in practice

- **The Coordinator plans**: Your primary AI (e.g. Antigravity) breaks down the user request.
- **L-Hub routes the sub-tasks**:
  - Large-scale refactoring? → **Architecture Expert**
  - Fast code generation? → **Coding Expert**
  - Documentation & translation? → **Translation Expert**
  - UI design & frontend? → **Vision/UI Expert**

**Real-world screenshot** — What it looks like in Antigravity when L-Hub dispatches tasks to multiple models in parallel:

![Antigravity MCP dispatching in action](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/screenshot_antigravity.png)

> In the screenshot above, Antigravity simultaneously triggers `ai_codex_task` (full codebase scan) and `ai_ask` (Minimax planning) through the MCP bridge — each expert handles what it does best.

---

## ⚙️ Key Features

### 1. Visual Configuration Dashboard
Open the command palette (`Cmd/Ctrl + Shift + P`) and run `> L-Hub: Open Dashboard` to configure your expert model branches — no JSON editing needed.

### 2. Multi-Model Synergies
Split the workload across specialized models. Your coordinator orchestrates; the right expert executes. Better results at lower cost.

### 3. Built-in Analytics & History Console
Every request is logged: prompt content, response time, token usage, and which expert model handled it.

---

## 🛠️ Connection Setup (Antigravity)

Add the following to your Antigravity MCP settings:

```json
{
  "mcpServers": {
    "l-hub": {
      "command": "node",
      "args": ["${env:HOME}/.vscode/extensions/readysteadyscience.l-hub-0.0.8/dist/cli.js"]
    }
  }
}
```

---

## 🤝 Support & Community

L-Hub is a free, open-source tool from **走启智造 (ReadySteadyScience)**.

- ⭐ **Star us on GitHub** — [ReadySteadyScience/l-hub](https://github.com/ReadySteadyScience/l-hub)
- 💬 **Feedback & Issues** — open a GitHub issue anytime

### ☕ Support the Author
Your support keeps the routing engine evolving! ❤️  
*(Sponsorship link coming soon)*

---

<h2 id="chinese-version">🇨🇳 简体中文</h2>

## 💡 什么是 L-Hub？

在 AI 开发工作流中，我们常常使用 **Antigravity** 等工具内的模型作为**"主控模型 (Coordinator)"**，由它们负责分析你的总体需求并拆解任务。

然而，单一模型并非在所有领域都是最优秀的。  
**L-Hub 是一个 MCP AI 桥接器 (Bridge)**，它位于你的主控模型和众多大模型 API 之间。

当主控模型执行任务时，它会将请求发送给 L-Hub。L-Hub 进行**智能任务分配 (Smart Routing)**，将特定的子任务交给最擅长的专家模型完成——就好比一个项目经理，把活儿分给最合适的人。

> ⚠️ **目前仅在 Antigravity 中经过验证。** 与 Cursor、VS Code + Cline 等其他 MCP 客户端的兼容性尚未测试。

![L-Hub 中文架构图](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/architecture_zh.png)

### 🌟 实际工作流程

- **主控模型统筹规划**：你的主力 AI（如 Antigravity）拆解用户的需求指令。
- **L-Hub 负责分配执行**：
  - 跨文件重构？→ **后端架构专家**
  - 高性价比代码生成？→ **代码编程专家**
  - 文档翻译与 API 阅读？→ **文档翻译专家**
  - 页面样式与前端组件？→ **前端设计专家**

**实际运行截图** — 在 Antigravity 中，L-Hub 并行向多个模型分发任务时的真实视觉效果：

![Antigravity MCP 并行调度截图](https://raw.githubusercontent.com/readysteadyscience/l-hub/main/images/screenshot_antigravity.png)

> 截图中，Antigravity 通过 MCP Bridge 同时触发了 `ai_codex_task`（Codex 全库扫描）和 `ai_ask`（Minimax 路线规划），两路专家并行响应，各司其职。

---

## ⚙️ 核心功能

### 1. 可视化配置面板 (Dashboard)
使用快捷键 `Cmd/Ctrl + Shift + P`，执行 `> L-Hub: Open Dashboard`，以图形化方式为各专家模型分支配置 API Key，无需手动编辑 JSON。

### 2. 多模型协同作业
按任务类型分配工作负载，高智商的主控模型负责思考与调度，性价比更高的垂直专精模型负责执行。质量不降，成本大幅下降。

### 3. AI 调用分析台 (History Console)
每一次 MCP 请求都被记录：Prompt 内容、响应耗时、Token 消耗量，以及最终由哪个专家模型处理。

---

## 🛠️ 安装与连接配置 (Antigravity)

在 Antigravity 的 MCP 配置中添加以下内容：

```json
{
  "mcpServers": {
    "l-hub": {
      "command": "node",
      "args": ["${env:HOME}/.vscode/extensions/readysteadyscience.l-hub-0.0.8/dist/cli.js"]
    }
  }
}
```

---

## 🤝 致谢与支持

L-Hub 是 **走启智造 (ReadySteadyScience)** 旗下 **Linglan Realm** 产品宇宙中的一个免费开源工具。

- ⭐ **给我们点个 Star** — [ReadySteadyScience/l-hub](https://github.com/ReadySteadyScience/l-hub)
- 💬 **反馈与建议** — 欢迎在 GitHub Issues 提出

### ☕ 请作者喝杯咖啡
持续跟进新模型、优化路由算法需要大量时间。您的支持是最大的动力！❤️  
*(赞助链接即将上线)*
