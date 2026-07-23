# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development when explicitly needed for independent tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将《灯火未熄》发布到长期可访问、支持手机浏览器的 GitHub Pages HTTPS 地址。

**Architecture:** 保持现有 Vite 应用和本地开发入口不变，新增一个专用 `build:pages` 构建脚本，为仓库子路径写入正确的静态资源前缀。GitHub Actions 在功能分支和 `master` 推送时构建 `dist/`，再通过 GitHub 官方 Pages 动作发布；仓库可见性与 Pages 开关由 GitHub CLI 低频配置。

**Tech Stack:** React 19、TypeScript、Vite 7、Vitest 3、GitHub Actions、GitHub Pages、GitHub CLI

---

### Task 1: 增加可验证的 Pages 专用构建

**Files:**
- Create: `src/deployment/pagesBuild.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 写入失败的构建脚本契约测试**

创建 `src/deployment/pagesBuild.test.ts`：

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> }

describe('GitHub Pages 构建', () => {
  it('使用仓库子路径构建静态资源', () => {
    expect(packageJson.scripts['build:pages']).toBe(
      'tsc --noEmit && vite build --base=/lights-still-burning-game/',
    )
  })
})
```

- [ ] **Step 2: 运行测试并确认红灯**

Run: `npm test -- src/deployment/pagesBuild.test.ts`

Expected: FAIL，实际值为 `undefined`，证明 Pages 构建脚本尚未存在。

- [ ] **Step 3: 增加最小构建脚本**

在 `package.json` 的 `scripts` 中增加：

```json
"build:pages": "tsc --noEmit && vite build --base=/lights-still-burning-game/"
```

- [ ] **Step 4: 验证测试与 Pages 构建**

Run: `npm test -- src/deployment/pagesBuild.test.ts`

Expected: PASS，1 项测试通过。

Run: `npm run build:pages`

Expected: TypeScript 检查与 Vite 构建成功，生成 `dist/index.html`。

Run:

```powershell
$html = Get-Content dist/index.html -Raw -Encoding UTF8
if ($html -notmatch '/lights-still-burning-game/assets/') {
  throw 'Pages 构建产物缺少仓库子路径前缀'
}
```

Expected: 退出码为 `0`。

- [ ] **Step 5: 提交 Pages 构建脚本**

```powershell
git add -- package.json src/deployment/pagesBuild.test.ts
git commit -m "build: 添加 GitHub Pages 构建脚本"
```

### Task 2: 增加最小权限的 Pages 工作流

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: 创建部署工作流**

创建 `.github/workflows/deploy-pages.yml`：

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - master
      - codex/lights-still-burning-game
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm test
      - name: Build Pages artifact
        run: npm run build:pages
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 检查工作流内容与空白错误**

Run:

```powershell
$workflow = Get-Content .github/workflows/deploy-pages.yml -Raw -Encoding UTF8
$required = @(
  'actions/checkout@v4',
  'actions/setup-node@v4',
  'npm ci',
  'npm test',
  'npm run build:pages',
  'actions/configure-pages@v5',
  'actions/upload-pages-artifact@v3',
  'actions/deploy-pages@v4'
)
foreach ($entry in $required) {
  if (-not $workflow.Contains($entry)) { throw "工作流缺少：$entry" }
}
git diff --check
```

Expected: 所有必需步骤存在，`git diff --check` 退出码为 `0`。

- [ ] **Step 3: 运行全量本地验证**

Run: `npm test`

Expected: 全部 Vitest 测试通过。

Run: `npm run build`

Expected: 本地根路径生产构建成功，证明 Pages 专用脚本没有改变本地构建。

- [ ] **Step 4: 提交部署工作流**

```powershell
git add -- .github/workflows/deploy-pages.yml
git commit -m "ci: 添加 GitHub Pages 自动部署"
```

### Task 3: 公开仓库并启用 Pages

**Files:**
- No local file changes

- [ ] **Step 1: 再次确认工作树与远端**

Run:

```powershell
git status --short --branch
git remote get-url origin
gh repo view ARIUM-hub/lights-still-burning-game --json isPrivate,defaultBranchRef,url
```

Expected: 工作树干净，远端为 `ARIUM-hub/lights-still-burning-game`，默认分支为 `master`。

- [ ] **Step 2: 将仓库改为公开**

Run:

```powershell
gh repo edit ARIUM-hub/lights-still-burning-game `
  --visibility public `
  --accept-visibility-change-consequences
```

Expected: 命令退出码为 `0`。

Run: `gh repo view ARIUM-hub/lights-still-burning-game --json isPrivate,url`

Expected: `isPrivate` 为 `false`。

- [ ] **Step 3: 启用 Actions 类型的 Pages**

Run:

```powershell
$pages = gh api repos/ARIUM-hub/lights-still-burning-game/pages 2>$null
if ($LASTEXITCODE -ne 0) {
  gh api --method POST repos/ARIUM-hub/lights-still-burning-game/pages `
    -f build_type=workflow
}
```

Expected: 返回的 Pages 配置包含 `build_type` 为 `workflow`，站点地址为 `https://arium-hub.github.io/lights-still-burning-game/`。

- [ ] **Step 4: 推送部署提交并触发工作流**

Run: `git push origin codex/lights-still-burning-game`

Expected: 推送成功，现有 PR 自动包含部署提交。

- [ ] **Step 5: 获取并等待单个部署任务**

Run:

```powershell
$run = gh run list `
  --repo ARIUM-hub/lights-still-burning-game `
  --workflow deploy-pages.yml `
  --branch codex/lights-still-burning-game `
  --limit 1 `
  --json databaseId,status,conclusion,url | ConvertFrom-Json
if ($null -eq $run -or $run.Count -eq 0) {
  throw '没有找到 Pages 部署任务'
}
gh run watch $run[0].databaseId `
  --repo ARIUM-hub/lights-still-burning-game `
  --exit-status
```

Expected: 单个工作流运行结束，结论为 `success`。

### Task 4: 验证公网链接与手机布局

**Files:**
- No local file changes

- [ ] **Step 1: 验证 HTTPS 页面和基础内容**

Run:

```powershell
$url = 'https://arium-hub.github.io/lights-still-burning-game/'
$response = Invoke-WebRequest -Uri $url -UseBasicParsing
if ($response.StatusCode -ne 200) { throw "状态码：$($response.StatusCode)" }
if (-not $response.Content.Contains('<title>灯火未熄</title>')) {
  throw '线上页面缺少正确标题'
}
```

Expected: HTTPS 返回 `200`，页面标题为“灯火未熄”。

- [ ] **Step 2: 使用浏览器验证 375×812 手机视口**

使用 `browser:control-in-app-browser` 打开目标地址，将临时视口设为 `375×812`，读取以下指标：

```js
({
  viewportWidth: innerWidth,
  viewportHeight: innerHeight,
  scrollWidth: document.documentElement.scrollWidth,
  title: document.title,
  startButtonVisible: Boolean(
    Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('开始故事'),
    ),
  ),
})
```

Expected: 视口为 `375×812`，`scrollWidth` 不超过 `375`，标题正确，开始按钮存在。

- [ ] **Step 3: 检查线上控制台和静态资源**

读取浏览器错误日志，并检查页面加载的脚本、样式 URL 都位于 `/lights-still-burning-game/` 下。

Expected: 无控制台错误；脚本和样式均从同一 GitHub Pages 站点的仓库子路径加载。

- [ ] **Step 4: 恢复视口并结束浏览器会话**

重置临时视口，关闭用于验证的临时标签页，不保留测试状态。

### Task 5: 记录公开链接并完成交付

**Files:**
- No local file changes

- [ ] **Step 1: 将仓库主页设置为线上地址**

Run:

```powershell
gh repo edit ARIUM-hub/lights-still-burning-game `
  --homepage 'https://arium-hub.github.io/lights-still-burning-game/'
```

Expected: 命令退出码为 `0`。

- [ ] **Step 2: 最终核验仓库、Pages、PR 和工作树**

Run:

```powershell
gh repo view ARIUM-hub/lights-still-burning-game `
  --json isPrivate,homepageUrl,url
gh api repos/ARIUM-hub/lights-still-burning-game/pages
gh pr view 1 --repo ARIUM-hub/lights-still-burning-game `
  --json state,isDraft,url
git status --short --branch
```

Expected: 仓库公开，主页为 Pages 地址，Pages 使用 workflow 构建，PR 保持打开且非草稿，工作树干净并与远端同步。
