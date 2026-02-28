# L-Hub (MCP Nexus) - 开发移交文档 (Handover)

欢迎来到 **L-Hub** 项目的全新工作区！由于切换了 VS Code 文件夹，之前的对话状态已经被收起，这份文档将帮助你（无论是自己开发还是让接下来的 AI 助手）快速接手并继续这个项目的开发。

## 🌟 项目当前状态 (Current Status)

目前我们已经完成了 **核心 MVP (最小可行性产品)** 的开发，具体包括：

1. **整体基建与打包**：
   - 彻底完成了从 "Linglan Bridges" 到 "L-Hub" 的全部命名重构。
   - 配置了无缝的 Webpack 双端构建流（同时编译 VS Code Extension 的 Node 代码和 Webview 的 React 代码）。
   - 成功打出了可安装的 `.vsix` 包。

2. **前端 UI (Webview / React)**：
   - 使用 React 构建了漂亮的 Dashboard。
   - **Settings Panel**：用于配置各个平台（DeepSeek, GLM, Qwen, MiniMax 等）的 API Key。
   - **History Console**：一个类似浏览器 Network 面板的“AI 提示词调试器”，用于查看左侧的请求列表和右侧的 JSON-RPC 请求/响应详情。

3. **后端存储与 Extension Host**：
   - **`SettingsManager`**：接入了 `vscode.secrets`，安全存储用户的 API Key，不再明文落盘。
   - **`HistoryStorage`**：接入了 `better-sqlite3`，在 VS Code 插件全局存储目录下建立了本地 SQLite 数据库，用于实现高性能的历史记录与 Token 统计，并带有自我清理机制。
   - **WebSocket Bridge**：实现了 `dist/cli.js` 作为标准输入输出（stdio）代理端，通过 WebSocket (`ws`) 与 Extension 主进程的 `LinglanMcpServer` 跨进程通信。

---

## 📂 核心代码目录指南

为了方便接下来的开发，请参考以下目录结构：

- **`src/` (VS Code Extension 后端代码)**
  - `extension.ts`: 插件的入口文件，负责拉起 Webview 面板和启动 MCP Server 后端服务。
  - `ws-server.ts`: 核心的 WebSocket 服务！负责接收从 `cli.js` 转发过来的 MCP stdio 数据，并将其存入 SQLite。**（接下来的核心逻辑开发将在这里）**。
  - `cli.ts`: 透明代理脚本，Cline 或其他客户端将执行这个脚本。它会通过标准输入输出读取 JSON-RPC 协议流，并通过 WebSocket 疯狂转发给 VS Code 插件。
  - `storage.ts`: 基于 `better-sqlite3` 的本地数据库操作类。
  - `settings.ts`: 基于 `vscode.secrets` 的系统安全凭据管理。
  - `webview-provider.ts`: 负责将编译好的 React 代码内嵌展示到 VS Code 的页面里。

- **`webview/` (React 前端代码)**
  - `App.tsx` / `index.tsx`: React 前端主入口。
  - `vscode-api.ts`: 在浏览器环境中模拟或获取 `acquireVsCodeApi()` 的封装。
  - `components/Dashboard.tsx`: 顶部带有 Tab 切换的容器组件。
  - `components/ConfigPanel.tsx`: API Key 的表单组件。
  - `components/HistoryConsole.tsx`: 历史记录的可视化组件。

---

## 🚀 后续开发计划 (Next Steps)

这个项目已经完成了骨架，接下来的 AI 助手（或者你自己）需要重点完善以下功能才能实现 100% 的业务闭环：

### 1. 接入真正的 `@modelcontextprotocol/sdk`
目前的 `src/ws-server.ts` 里，当收到 Cline 发过来的请求时，我们仅仅是把它原封不动存到了 SQLite 里并 mock 返回了一个结果（`{ _bridged: true }`）。
**下一步任务**：需要在此处实例化真正的 `@modelcontextprotocol/sdk` 中的 `Server` 类，处理工具列表（`tools/list`）、工具调用（`tools/call`），并将不同的任务根据配置智能分发给 Python 层的真实国产大模型。

### 2. 丰富 UI 界面与交互细节
- 目前的历史记录面板（`HistoryConsole.tsx`）是基于基础的 `div` 写的，可以接入 VS Code 官方的 UI 组件库 (`@vscode/webview-ui-toolkit`)，让表单、按钮和列表看起来更像原生的 VS Code 界面。
- **Token 计算**：当真实的 MCP 工具调用返回数据时，在 SQLite `storage.ts` 里补全 `inputTokens` 和 `outputTokens` 的落盘统计，并在前端展示每条请求的具体花费。

### 3. 配置智能路由逻辑 (Smart Routing)
- 在 `settings.ts` 里增加高级配置，例如：“遇到代码问题自动分发给 DeepSeek-V3，遇到跨文件长架构梳理分发给 GLM-5”。

---

## 🛠️ 如何在当前文件夹继续开发和调试

打开 `L-Hub` 目录后：
1. **安装依赖**：如果依赖丢失了，跑一次 `npm install`。
2. **实时编译**：在终端里运行 **`npm run watch`**，它会在你修改扩展端或 Webview React 代码时自动热更新。
3. **F5 本地调试**：在 VS Code 里直接按 `F5`，会弹出一个新的“扩展开发主机”窗口。在那个新窗口里输入命令 `L-Hub: Open Dashboard`，你就可以边改代码边看效果了！

祝你打造出全网最强的 MCP 网关工具！有任何问题，随时召唤新的我！
