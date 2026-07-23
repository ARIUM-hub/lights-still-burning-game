# Railway 公网 AI 代理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development when explicitly needed for independent tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留现有 GitHub Pages 游戏链接不变，并把 AI 故事工坊改造成通过固定 Railway 公网代理地址为所有手机用户生成新故事。

**Architecture:** 前端继续使用 GitHub Pages 承载现有 Vite 单页应用，AI 工坊通过构建时注入的 `VITE_AI_PROXY_URL` 调用 Railway 上的 Node 代理。后端继续复用 `server/` 目录中的故事生成逻辑，但补上 Railway 所需的端口读取、CORS、健康检查和生产启动脚本。

**Tech Stack:** React 19、TypeScript、Vite 7、Vitest 3、Node.js HTTP Server、GitHub Actions、GitHub Pages、Railway

---

## File Structure

### Frontend

- Create: `src/ai/proxyUrl.ts`
  - 统一解析 AI 代理地址，优先读 `import.meta.env.VITE_AI_PROXY_URL`，缺失时回退到本地 `http://127.0.0.1:8787/api/ai-story`
- Create: `src/ai/proxyUrl.test.ts`
  - 覆盖构建注入地址与本地回退地址
- Modify: `src/ai/storyClient.ts`
  - 使用 `proxyUrl.ts` 提供的地址，不再写死本地 URL；网络错误改成公网服务提示
- Modify: `src/ai/storyClient.test.ts`
  - 断言请求地址来自代理地址解析逻辑；网络错误文案改成公网版
- Modify: `src/screens/AiWorkshopScreen.tsx`
  - 顶部说明从“启动本地 AI 服务”改成公网可用文案
- Modify: `src/App.workshop.test.tsx`
  - 断言 AI 工坊仍不出现接口配置字段，并显示新的工坊说明

### Backend

- Create: `server/httpApp.ts`
  - 把 Node HTTP 路由逻辑抽成可测试的纯应用层，统一处理 `OPTIONS`、`GET /health`、`POST /api/ai-story`、404 和 CORS 头
- Create: `server/httpApp.test.ts`
  - 覆盖跨域允许、预检请求、健康检查、故事路由转发和 404
- Modify: `server/index.ts`
  - 改成只负责 `createServer()` + 读取配置 + 监听 `0.0.0.0`
- Modify: `server/config.ts`
  - 统一读取 `PORT` / `AI_SERVER_PORT`，错误文案改成服务端环境变量语义，并暴露允许的来源列表
- Modify: `server/config.test.ts`
  - 覆盖 Railway `PORT` 优先级、本地端口回退和来源白名单
- Modify: `server/aiStoryRoute.test.ts`
  - 错误文案从“本地 AI 服务”改为“AI 服务”

### Deployment

- Modify: `package.json`
  - 新增 Railway 使用的 `start:server` 脚本
- Modify: `.github/workflows/deploy-pages.yml`
  - 在 Pages 构建步骤注入 `VITE_AI_PROXY_URL: ${{ vars.AI_PROXY_URL }}`
- Create: `src/deployment/pagesWorkflow.test.ts`
  - 断言 workflow 已为 Pages 构建注入 `VITE_AI_PROXY_URL`
- Create: `docs/railway-ai-proxy-deployment.md`
  - 记录 Railway 服务创建、环境变量、Start Command、GitHub Pages 仓库变量配置和手机验收步骤

### Validation

- Run: `npm test -- src/ai/proxyUrl.test.ts src/ai/storyClient.test.ts src/App.workshop.test.tsx server/config.test.ts server/httpApp.test.ts server/aiStoryRoute.test.ts src/deployment/pagesWorkflow.test.ts`
- Run: `npm test`
- Run: `npm run build`
- Run: `npm run build:pages`

---

### Task 1: 前端接入构建时注入的 Railway 代理地址

**Files:**
- Create: `src/ai/proxyUrl.ts`
- Create: `src/ai/proxyUrl.test.ts`
- Modify: `src/ai/storyClient.ts`
- Modify: `src/ai/storyClient.test.ts`

- [ ] **Step 1: 先写失败测试，锁定代理地址解析与默认回退**

```ts
import { describe, expect, it } from 'vitest'

import { resolveAiProxyUrl } from './proxyUrl'

describe('resolveAiProxyUrl', () => {
  it('优先返回构建时注入的 Railway 代理地址', () => {
    expect(
      resolveAiProxyUrl({
        VITE_AI_PROXY_URL:
          'https://story-proxy.up.railway.app/api/ai-story',
      }),
    ).toBe('https://story-proxy.up.railway.app/api/ai-story')
  })

  it('缺少构建变量时回退到本地代理地址', () => {
    expect(resolveAiProxyUrl({})).toBe('http://127.0.0.1:8787/api/ai-story')
  })
})
```

在 `src/ai/storyClient.test.ts` 增加一条新的 URL 断言，让它期待 Railway 地址：

```ts
expect(fetchMock).toHaveBeenCalledWith(
  'https://story-proxy.up.railway.app/api/ai-story',
  expect.objectContaining({ method: 'POST' }),
)
```

- [ ] **Step 2: 运行测试，确认它先因为缺少实现而失败**

Run: `npm test -- src/ai/proxyUrl.test.ts src/ai/storyClient.test.ts`

Expected:
- `src/ai/proxyUrl.test.ts` 失败并提示 `Cannot find module './proxyUrl'`
- `src/ai/storyClient.test.ts` 失败并显示实际请求 URL 仍是 `http://127.0.0.1:8787/api/ai-story`

- [ ] **Step 3: 写最小实现，让前端通过统一入口解析代理地址**

创建 `src/ai/proxyUrl.ts`：

```ts
interface ProxyEnv {
  VITE_AI_PROXY_URL?: string
}

const LOCAL_PROXY_URL = 'http://127.0.0.1:8787/api/ai-story'

export function resolveAiProxyUrl(
  env: ProxyEnv = import.meta.env,
): string {
  const configuredUrl = env.VITE_AI_PROXY_URL?.trim() ?? ''
  return configuredUrl.length > 0 ? configuredUrl : LOCAL_PROXY_URL
}
```

修改 `src/ai/storyClient.ts`：

```ts
import { resolveAiProxyUrl } from './proxyUrl'
import { validateGeneratedStory } from './storySchema'
import type { GeneratedStory } from './types'

interface GenerateAiStoryOptions {
  brief: string
  protagonistName?: string
  tone?: string
}

export async function generateAiStory(
  options: GenerateAiStoryOptions,
  fetchImpl: typeof fetch = fetch,
  proxyUrl: string = resolveAiProxyUrl(),
): Promise<GeneratedStory> {
  if (options.brief.trim().length === 0) {
    throw new Error('请先填写故事需求')
  }

  let response: Response
  try {
    response = await fetchImpl(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })
  } catch {
    throw new Error('AI 故事服务暂时不可用，请稍后再试。')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      payload !== null &&
      typeof payload === 'object' &&
      typeof payload.error === 'string'
        ? payload.error
        : '生成故事时发生未知错误。'
    throw new Error(message)
  }

  const payload = await response.json()
  const validation = validateGeneratedStory(payload)

  if (!validation.ok) {
    throw new Error(`AI 返回的故事结构无效：${validation.reason}`)
  }

  return validation.story
}
```

同步更新 `src/ai/storyClient.test.ts` 的调用方式：

```ts
const story = await generateAiStory(
  {
    brief: '写一个雨夜故事',
    protagonistName: '周岚',
    tone: '克制',
  },
  fetchMock as typeof fetch,
  'https://story-proxy.up.railway.app/api/ai-story',
)
```

- [ ] **Step 4: 重新运行测试，确认地址解析和客户端请求都转绿**

Run: `npm test -- src/ai/proxyUrl.test.ts src/ai/storyClient.test.ts`

Expected:
- `src/ai/proxyUrl.test.ts` 2 个用例通过
- `src/ai/storyClient.test.ts` 2 个用例通过

- [ ] **Step 5: 提交这一组前端代理地址改动**

```bash
git add src/ai/proxyUrl.ts src/ai/proxyUrl.test.ts src/ai/storyClient.ts src/ai/storyClient.test.ts
git commit -m "feat: resolve ai proxy url from build config"
```

---

### Task 2: 调整 AI 工坊文案与公网错误提示

**Files:**
- Modify: `src/screens/AiWorkshopScreen.tsx`
- Modify: `src/App.workshop.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定新的工坊提示文案**

修改 `src/App.workshop.test.tsx`，把原本对“本地 AI 服务”的断言改为：

```ts
expect(
  screen.getByText('生成新故事后可直接开始试玩。'),
).toBeInTheDocument()
```

保留以下断言不变：

```ts
expect(screen.queryByLabelText('API 基础地址')).not.toBeInTheDocument()
expect(screen.queryByLabelText('模型名称')).not.toBeInTheDocument()
expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
```

- [ ] **Step 2: 运行页面测试，确认当前文案确实还是旧的**

Run: `npm test -- src/App.workshop.test.tsx`

Expected:
- 用例失败，并提示找不到文本 `生成新故事后可直接开始试玩。`

- [ ] **Step 3: 修改 AI 工坊页面文案**

更新 `src/screens/AiWorkshopScreen.tsx` 顶部提示：

```tsx
<p className="ai-workshop-screen__hint">
  生成新故事后可直接开始试玩。
</p>
```

不要恢复任何接口配置输入框，保留现有三个故事字段：

```tsx
<label className="ai-workshop-screen__field">
  <span>主角名字</span>
  <input aria-label="主角名字" type="text" value={draft.protagonistName} />
</label>
<label className="ai-workshop-screen__field">
  <span>整体基调</span>
  <input aria-label="整体基调" type="text" value={draft.tone} />
</label>
<label className="ai-workshop-screen__field">
  <span>故事需求</span>
  <textarea aria-label="故事需求" rows={6} value={draft.brief} />
</label>
```

- [ ] **Step 4: 运行页面测试，确认 AI 工坊展示切到公网语义**

Run: `npm test -- src/App.workshop.test.tsx`

Expected:
- `AI 故事工坊入口` 用例通过

- [ ] **Step 5: 提交工坊文案改动**

```bash
git add src/screens/AiWorkshopScreen.tsx src/App.workshop.test.tsx
git commit -m "feat: update ai workshop copy for public proxy"
```

---

### Task 3: 让服务端配置兼容 Railway 端口和生产启动

**Files:**
- Modify: `server/config.ts`
- Modify: `server/config.test.ts`
- Modify: `server/aiStoryRoute.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 先写失败测试，锁定 `PORT` 优先级和新的错误文案**

在 `server/config.test.ts` 新增用例：

```ts
it('优先使用 Railway 注入的 PORT', () => {
  vi.stubEnv('AI_BASE_URL', 'https://example.com/v1')
  vi.stubEnv('AI_MODEL', 'test-model')
  vi.stubEnv('AI_API_KEY', 'secret')
  vi.stubEnv('PORT', '4312')
  vi.stubEnv('AI_SERVER_PORT', '8787')

  expect(loadAiServerConfig().port).toBe(4312)
})

it('暴露固定来源白名单', () => {
  vi.stubEnv('AI_BASE_URL', 'https://example.com/v1')
  vi.stubEnv('AI_MODEL', 'test-model')
  vi.stubEnv('AI_API_KEY', 'secret')

  expect(loadAiServerConfig().allowedOrigins).toEqual([
    'https://arium-hub.github.io',
    'http://localhost:5173',
  ])
})
```

把原始错误断言改成：

```ts
expect(() => loadAiServerConfig()).toThrowError(
  'AI 服务缺少必要配置，请检查服务端环境变量。',
)
```

在 `server/aiStoryRoute.test.ts` 里把透传错误断言也改为新的服务端文案：

```ts
throw new Error('AI 服务缺少必要配置，请检查服务端环境变量。')
```

- [ ] **Step 2: 运行服务配置相关测试，确认它们先失败**

Run: `npm test -- server/config.test.ts server/aiStoryRoute.test.ts`

Expected:
- `server/config.test.ts` 失败，因为当前没有 `allowedOrigins` 且 `PORT` 不会优先读取
- `server/aiStoryRoute.test.ts` 失败，因为旧错误文案仍是“本地 AI 服务”

- [ ] **Step 3: 更新配置对象和 Railway 启动脚本**

修改 `server/config.ts`：

```ts
export interface AiServerConfig {
  baseUrl: string
  model: string
  apiKey: string
  port: number
  allowedOrigins: string[]
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://arium-hub.github.io',
  'http://localhost:5173',
]

export function loadAiServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiServerConfig {
  const baseUrl = env.AI_BASE_URL?.trim() ?? ''
  const model = env.AI_MODEL?.trim() ?? ''
  const apiKey = env.AI_API_KEY?.trim() ?? ''
  const rawPort = env.PORT?.trim() ?? env.AI_SERVER_PORT?.trim() ?? ''

  if (baseUrl.length === 0 || model.length === 0 || apiKey.length === 0) {
    throw new Error('AI 服务缺少必要配置，请检查服务端环境变量。')
  }

  const parsedPort =
    rawPort.length === 0 ? 8787 : Number.parseInt(rawPort, 10)

  return {
    baseUrl,
    model,
    apiKey,
    port: Number.isFinite(parsedPort) ? parsedPort : 8787,
    allowedOrigins: DEFAULT_ALLOWED_ORIGINS,
  }
}
```

在 `package.json` 增加 Railway 启动脚本：

```json
"scripts": {
  "dev": "vite",
  "dev:server": "node --env-file=.env.local --import tsx server/index.ts",
  "start:server": "node --import tsx server/index.ts",
  "build": "tsc --noEmit && vite build",
  "build:pages": "tsc --noEmit && vite build --base=/lights-still-burning-game/"
}
```

- [ ] **Step 4: 运行配置测试，确认 Railway 端口与错误文案都就位**

Run: `npm test -- server/config.test.ts server/aiStoryRoute.test.ts`

Expected:
- `server/config.test.ts` 全部通过
- `server/aiStoryRoute.test.ts` 全部通过

- [ ] **Step 5: 提交 Railway 配置与启动脚本改动**

```bash
git add server/config.ts server/config.test.ts server/aiStoryRoute.test.ts package.json
git commit -m "feat: prepare ai proxy config for railway"
```

---

### Task 4: 抽出可测试的 HTTP 应用层，补齐 CORS、健康检查和公网监听

**Files:**
- Create: `server/httpApp.ts`
- Create: `server/httpApp.test.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 先写失败测试，锁定健康检查、预检请求和允许来源**

创建 `server/httpApp.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'

import { createHttpApp } from './httpApp'

describe('createHttpApp', () => {
  it('对 GET /health 返回 200 和 ok:true', async () => {
    const app = createHttpApp({
      allowedOrigins: ['https://arium-hub.github.io'],
      handleAiStory: vi.fn(),
    })

    const response = await app({
      method: 'GET',
      url: '/health',
      origin: 'https://arium-hub.github.io',
      body: '',
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe(JSON.stringify({ ok: true }))
    expect(response.headers['Access-Control-Allow-Origin']).toBe(
      'https://arium-hub.github.io',
    )
  })

  it('对 OPTIONS /api/ai-story 返回 204 预检响应', async () => {
    const app = createHttpApp({
      allowedOrigins: ['https://arium-hub.github.io'],
      handleAiStory: vi.fn(),
    })

    const response = await app({
      method: 'OPTIONS',
      url: '/api/ai-story',
      origin: 'https://arium-hub.github.io',
      body: '',
    })

    expect(response.status).toBe(204)
    expect(response.headers['Access-Control-Allow-Methods']).toContain('POST')
  })
})
```

再补一个故事路由转发用例：

```ts
it('对 POST /api/ai-story 转发给故事处理器', async () => {
  const handleAiStory = vi.fn().mockResolvedValue({
    status: 200,
    body: JSON.stringify({ title: '雨夜' }),
  })
  const app = createHttpApp({
    allowedOrigins: ['https://arium-hub.github.io'],
    handleAiStory,
  })

  const response = await app({
    method: 'POST',
    url: '/api/ai-story',
    origin: 'https://arium-hub.github.io',
    body: '{"brief":"写一个雨夜故事"}',
  })

  expect(handleAiStory).toHaveBeenCalledWith({
    method: 'POST',
    body: '{"brief":"写一个雨夜故事"}',
  })
  expect(response.status).toBe(200)
})
```

- [ ] **Step 2: 运行测试，确认新的 HTTP 应用层还不存在**

Run: `npm test -- server/httpApp.test.ts`

Expected:
- 失败并提示 `Cannot find module './httpApp'`

- [ ] **Step 3: 实现纯应用层并让 Node 入口只负责 listen**

创建 `server/httpApp.ts`：

```ts
import { handleAiStoryRequest } from './aiStoryRoute'

interface HttpRequest {
  method: string
  url: string
  origin?: string
  body: string
}

interface HttpResponse {
  status: number
  headers: Record<string, string>
  body: string
}

interface CreateHttpAppOptions {
  allowedOrigins: string[]
  handleAiStory?: typeof handleAiStoryRequest
}

function createCorsHeaders(
  origin: string | undefined,
  allowedOrigins: string[],
): Record<string, string> {
  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export function createHttpApp({
  allowedOrigins,
  handleAiStory = handleAiStoryRequest,
}: CreateHttpAppOptions) {
  return async function app(request: HttpRequest): Promise<HttpResponse> {
    const headers = createCorsHeaders(request.origin, allowedOrigins)

    if (request.method === 'OPTIONS') {
      return {
        status: 204,
        headers,
        body: '',
      }
    }

    if (request.url === '/health' && request.method === 'GET') {
      return {
        status: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      }
    }

    if (request.url === '/api/ai-story') {
      const result = await handleAiStory({
        method: request.method,
        body: request.body,
      })

      return {
        status: result.status,
        headers,
        body: result.body,
      }
    }

    return {
      status: 404,
      headers,
      body: JSON.stringify({ error: '接口不存在。' }),
    }
  }
}
```

修改 `server/index.ts`：

```ts
import { createServer } from 'node:http'

import { loadAiServerConfig } from './config'
import { createHttpApp } from './httpApp'

const { port, allowedOrigins } = loadAiServerConfig()
const app = createHttpApp({ allowedOrigins })

createServer(async (request, response) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const result = await app({
    method: request.method ?? 'GET',
    url: request.url ?? '/',
    origin:
      typeof request.headers.origin === 'string'
        ? request.headers.origin
        : undefined,
    body: Buffer.concat(chunks).toString('utf8'),
  })

  response.writeHead(result.status, result.headers)
  response.end(result.body)
}).listen(port, '0.0.0.0')
```

- [ ] **Step 4: 运行服务层测试，确认公网 HTTP 行为通过**

Run: `npm test -- server/httpApp.test.ts server/config.test.ts server/aiStoryRoute.test.ts`

Expected:
- `server/httpApp.test.ts` 通过
- `server/config.test.ts` 与 `server/aiStoryRoute.test.ts` 继续通过

- [ ] **Step 5: 提交 HTTP 应用层与公网监听改动**

```bash
git add server/httpApp.ts server/httpApp.test.ts server/index.ts
git commit -m "feat: add railway-ready http app for ai proxy"
```

---

### Task 5: 注入 GitHub Pages 构建变量并补 Railway 部署文档

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Create: `src/deployment/pagesWorkflow.test.ts`
- Create: `docs/railway-ai-proxy-deployment.md`

- [ ] **Step 1: 先写失败测试，锁定 Pages workflow 必须注入 `VITE_AI_PROXY_URL`**

创建 `src/deployment/pagesWorkflow.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

import workflowSource from '../../.github/workflows/deploy-pages.yml?raw'

describe('GitHub Pages workflow', () => {
  it('为 build:pages 注入 Railway 代理地址变量', () => {
    expect(workflowSource).toContain('VITE_AI_PROXY_URL: ${{ vars.AI_PROXY_URL }}')
    expect(workflowSource).toContain('run: npm run build:pages')
  })
})
```

- [ ] **Step 2: 运行 workflow 测试，确认当前还没有注入构建变量**

Run: `npm test -- src/deployment/pagesWorkflow.test.ts`

Expected:
- 用例失败，并提示 workflow 内容中不存在 `VITE_AI_PROXY_URL: ${{ vars.AI_PROXY_URL }}`

- [ ] **Step 3: 修改 workflow 并补部署说明**

更新 `.github/workflows/deploy-pages.yml` 的构建步骤：

```yml
      - name: Build Pages artifact
        env:
          VITE_AI_PROXY_URL: ${{ vars.AI_PROXY_URL }}
        run: npm run build:pages
```

创建 `docs/railway-ai-proxy-deployment.md`：

```md
# Railway AI 代理部署说明

## 1. 在 Railway 创建服务

- 从 GitHub 连接仓库 `ARIUM-hub/lights-still-burning-game`
- 选择 Node 服务
- Start Command 填：

```bash
npm run start:server
```

## 2. 配置 Railway 环境变量

```env
AI_BASE_URL=https://你的兼容接口地址/v1
AI_MODEL=你的模型名称
AI_API_KEY=你的密钥
```

`PORT` 由 Railway 自动注入，不需要手动填写。

## 3. 配置 GitHub Pages 构建变量

在 GitHub 仓库 Variables 中新增：

```text
AI_PROXY_URL=https://你的-railway-域名/api/ai-story
```

## 4. 发布与验收

- 推送到 `codex/lights-still-burning-game`
- 等待 `Deploy GitHub Pages` 工作流完成
- 手机打开公开链接并通关
- 进入 AI 故事工坊，输入故事需求后点击 `生成新故事`
```

- [ ] **Step 4: 运行 workflow 测试与构建测试，确认发布链路配置齐全**

Run: `npm test -- src/deployment/pagesWorkflow.test.ts src/deployment/pagesBuild.test.ts`

Expected:
- `src/deployment/pagesWorkflow.test.ts` 通过
- `src/deployment/pagesBuild.test.ts` 继续通过

- [ ] **Step 5: 提交 Pages 注入与 Railway 部署说明**

```bash
git add .github/workflows/deploy-pages.yml src/deployment/pagesWorkflow.test.ts docs/railway-ai-proxy-deployment.md
git commit -m "docs: document railway ai proxy deployment"
```

---

### Task 6: 做最终回归验证并整理交付说明

**Files:**
- Verify only:
  - `src/ai/proxyUrl.ts`
  - `src/ai/storyClient.ts`
  - `src/screens/AiWorkshopScreen.tsx`
  - `server/config.ts`
  - `server/httpApp.ts`
  - `server/index.ts`
  - `.github/workflows/deploy-pages.yml`
  - `docs/railway-ai-proxy-deployment.md`

- [ ] **Step 1: 运行这一轮改动的聚焦测试**

Run:

```bash
npm test -- src/ai/proxyUrl.test.ts src/ai/storyClient.test.ts src/App.workshop.test.tsx server/config.test.ts server/httpApp.test.ts server/aiStoryRoute.test.ts src/deployment/pagesWorkflow.test.ts
```

Expected:
- 所有与 Railway 公网代理相关的测试通过

- [ ] **Step 2: 运行完整单元测试，确认没有破坏原游戏流程**

Run: `npm test`

Expected:
- 全量 Vitest 通过

- [ ] **Step 3: 运行生产构建与 Pages 构建**

Run:

```bash
npm run build
npm run build:pages
```

Expected:
- 两个构建命令都成功
- `dist/` 正常输出 GitHub Pages 子路径资源

- [ ] **Step 4: 检查差异与格式问题**

Run:

```bash
git status --short
git diff --check
```

Expected:
- `git diff --check` 无格式错误
- `git status --short` 只显示本轮预期文件

- [ ] **Step 5: 最终提交**

```bash
git add src/ai/proxyUrl.ts src/ai/proxyUrl.test.ts src/ai/storyClient.ts src/ai/storyClient.test.ts src/screens/AiWorkshopScreen.tsx src/App.workshop.test.tsx server/config.ts server/config.test.ts server/httpApp.ts server/httpApp.test.ts server/index.ts server/aiStoryRoute.test.ts package.json .github/workflows/deploy-pages.yml src/deployment/pagesWorkflow.test.ts docs/railway-ai-proxy-deployment.md
git commit -m "feat: deploy ai story proxy for public mobile use"
```
