# L-Hub 发布 & 更新完整流程

> 适用于：首次发布 + 后续每次版本更新

---

## 一、一次性准备（只做一次）

### 1. 获取 VS Code Marketplace PAT
1. 打开 [dev.azure.com](https://dev.azure.com) → 用 `readysteadyscience@outlook.com` 登录
2. 右上角头像 → **User Settings → Personal Access Tokens**
3. New Token：
   - **Organization**: All accessible organizations
   - **Scopes**: `Marketplace → Manage`
   - Expiry: 1 year
4. 复制 PAT，保存到安全地方（只显示一次）

### 2. 登录 vsce
```bash
cd /Users/sunbinhe/Desktop/ReadySteadyScience/l-hub
npx vsce login readysteadyscience
# 粘贴上面的 PAT
```

### 3. 设置 GitHub Secret（用于 CI/CD 自动发布）
1. GitHub → `readysteadyscience/l-hub` → **Settings → Secrets → Actions**
2. 新建 secret：`VSCE_PAT` = 上面的 PAT
3. （可选）Discord Webhook：`DISCORD_WEBHOOK_URL` = Discord Server Webhook URL

---

## 二、首次发布（手动）

```bash
cd /Users/sunbinhe/Desktop/ReadySteadyScience/l-hub

# 1. 确认版本号（package.json）
# 当前：0.1.0

# 2. 编译打包
npm run compile
yes | npx vsce package

# 3. 发布到 Marketplace
npx vsce publish

# 4. 推送到 GitHub
git add -A
git commit -m "release: v0.1.0 - initial public release"
git tag v0.1.0
git push origin main --tags
```

发布后在这里查看：https://marketplace.visualstudio.com/items?itemName=readysteadyscience.l-hub

---

## 三、后续每次更新流程（标准 SOP）

### Step 1：本地修改 + 测试
```bash
# 修改代码
# 用 MCP AI Bridge 测试所有 6 个 provider
# mcp_l-hub_ai_ask: deepseek / glm / qwen / minimax / gemini / codex
```

### Step 2：更新版本号
```bash
# 小版本（bug fix）
npx vsce version patch   # 0.1.0 → 0.1.1

# 中版本（新功能）
npx vsce version minor   # 0.1.x → 0.2.0

# 大版本（重大改版）
npx vsce version major   # 0.x.x → 1.0.0
```

### Step 3：更新 CHANGELOG.md
在文件顶部追加：
```markdown
## [0.1.1] - 2026-03-XX
### Fixed
- 修复 XXX 问题

### Added
- 新增 XXX 功能
```

### Step 4：一键发布
```bash
git add -A
git commit -m "release: v$(node -p "require('./package.json').version")"
git tag "v$(node -p "require('./package.json').version")"
git push origin main --tags
```
→ GitHub Actions 自动触发：**编译 → 打包 → 发布到 Marketplace → Discord 通知**

---

## 四、GitHub Actions 自动化（.github/workflows/release.yml）

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run compile
      - name: Publish to Marketplace
        run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
      - name: Notify Discord
        if: success()
        run: |
          VERSION=$(node -p "require('./package.json').version")
          curl -s -X POST ${{ secrets.DISCORD_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d "{\"embeds\":[{\"title\":\"🚀 L-Hub v${VERSION} 已发布！\",\"description\":\"[在 Marketplace 查看](https://marketplace.visualstudio.com/items?itemName=readysteadyscience.l-hub)\",\"color\":5814783}]}"
```

---

## 五、版本验收 Checklist

每次发布前必须全部打勾：

| 检查项 | 命令/方式 |
|-------|---------|
| ✅ MCP 6 个 provider 全部连通 | `mcp_l-hub_ai_ask` 各 provider 返回 OK |
| ✅ package.json 版本号已更新 | `cat package.json \| grep version` |
| ✅ CHANGELOG.md 已更新 | 人工检查顶部条目日期和内容 |
| ✅ 编译无报错 | `npm run compile` |
| ✅ 打包成功 | `vsce package` 输出 DONE |
| ✅ 图标和 README 显示正常 | `vsce ls` 确认 images/logo.png 已打包 |

---

## 六、Marketplace 管理

- **控制台**: https://marketplace.visualstudio.com/manage/publishers/readysteadyscience
- **插件主页**: https://marketplace.visualstudio.com/items?itemName=readysteadyscience.l-hub
- **评分/评论**: 在控制台 → Reviews 查看用户反馈
- **下架**: `npx vsce unpublish readysteadyscience.l-hub`

---

## 七、用户自动更新

用户安装后，VS Code / Antigravity **每天自动检查 Marketplace 更新**，
有新版本时会在通知栏提示「Extension Update Available」，一键更新即可。
**无需用户手动操作。**

---

## 八、Discord 社区通知模板

每次发布后在 Discord 公告：
```
🚀 **L-Hub vX.X.X 发布！**

**本次更新：**
• XXX 新功能
• 修复 XXX 问题

**安装/更新：**
在 Antigravity (VS Code) 扩展商店搜索「L-Hub」即可自动更新

[📦 Marketplace 主页](https://marketplace.visualstudio.com/items?itemName=readysteadyscience.l-hub)
[📝 完整更新日志](https://github.com/readysteadyscience/l-hub/blob/main/CHANGELOG.md)
```
