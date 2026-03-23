# L-Hub 发布与更新完整流程

> 适用于：Antigravity IDE 专属插件，仅发布至 Open VSX Registry

---

## 一、一次性初始配置

### 1. 获取 Open VSX PAT
1. 访问 [open-vsx.org](https://open-vsx.org) → 用 GitHub 登录
2. Profile → 用 Eclipse 账号签署 Publisher Agreement
3. **ACCESS TOKENS** → Generate Token → 命名（如 `L-Hub Publish`）
4. **立即复制并妥善保存令牌**，页面关闭后无法再次查看
5. Namespace 已创建：`readysteadyscience`

### 2. 配置 GitHub Actions 密钥
1. GitHub → `readysteadyscience/l-hub` → **Settings → Secrets → Actions**
2. 新建 secret：`OVSX_PAT` = Open VSX PAT
3. （可选）Discord Webhook：`DISCORD_WEBHOOK_URL`

---

## 二、每次更新流程（标准 SOP）

### Step 1：本地修改 + 测试
```bash
# 修改代码
# 用 L-Hub Dashboard 测试所有已配置的模型连通性
# 运行 npm run compile 确保零报错
```

### Step 2：更新版本号
```bash
# 小版本（bug fix）
npm version patch   # 0.3.2 → 0.3.3

# 中版本（新功能）
npm version minor   # 0.3.x → 0.4.0

# 大版本（重大改版）
npm version major   # 0.x.x → 1.0.0
```

### Step 3：更新 CHANGELOG.md
在文件顶部追加当前版本变更内容。

### Step 4：一键发布
```bash
git add -A
git commit -m "release: v$(node -p "require('./package.json').version")"
git tag "v$(node -p "require('./package.json').version")"
git push origin main --tags
```
→ GitHub Actions 自动触发：**编译 → 打包 → 发布到 Open VSX → Discord 通知**

---

## 三、GitHub Actions（.github/workflows/release.yml）

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
      - run: yes | npx vsce package
      - name: Publish to Open VSX
        run: npx ovsx publish *.vsix -p ${{ secrets.OVSX_PAT }}
      - name: Notify Discord
        if: success()
        run: |
          VERSION=$(node -p "require('./package.json').version")
          curl -s -X POST ${{ secrets.DISCORD_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d "{\"embeds\":[{\"title\":\"🚀 L-Hub v${VERSION} 已发布！\",\"description\":\"[在 Open VSX 查看](https://open-vsx.org/extension/readysteadyscience/l-hub)\",\"color\":5814783}]}"
```

---

## 四、版本验收 Checklist

| 检查项 | 命令/方式 |
|-------|---------|
| ✅ 已配置模型全部连通 | L-Hub Dashboard → 测试连通 |
| ✅ package.json 版本号已更新 | `cat package.json \| grep version` |
| ✅ CHANGELOG.md 已更新 | 人工检查顶部条目日期和内容 |
| ✅ 编译无报错 | `npm run compile` |
| ✅ 打包成功 | `npx vsce package` 输出 DONE |
| ✅ 图标和 README 显示正常 | `npx vsce ls` 确认 images/logo.png 已打包 |

---

## 五、Open VSX 管理

- **插件主页**: https://open-vsx.org/extension/readysteadyscience/l-hub
- **管理后台**: https://open-vsx.org/user-settings/extensions

### 手动发布（备用）
```bash
npx ovsx publish releases/l-hub-X.X.X.vsix -p <OVSX_PAT>
```

---

## 六、用户自动更新

用户安装后，Antigravity **每天自动检查 Open VSX 更新**，
有新版本时会在通知栏提示「Extension Update Available」，一键更新即可。
**无需用户手动操作。**

---

## 七、Discord 社区通知模板

```
🚀 **L-Hub vX.X.X 发布！**

**本次更新：**
• XXX 新功能
• 修复 XXX 问题

**安装/更新：**
在 Antigravity 扩展商店搜索「L-Hub」即可自动更新

[📦 Open VSX 主页](https://open-vsx.org/extension/readysteadyscience/l-hub)
[📝 完整更新日志](https://github.com/readysteadyscience/l-hub/blob/main/CHANGELOG.md)
```
