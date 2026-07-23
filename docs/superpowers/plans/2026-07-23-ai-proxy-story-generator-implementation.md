# AI Proxy Story Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development when explicitly needed for independent tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为《灯火未熄》的 AI 故事工坊新增本地 Node 代理服务，改为从 `.env.local` 读取模型配置，并移除前端里的接口配置表单。

**Architecture:** 新增一个轻量 `server/` 目录，使用原生 Node HTTP 服务暴露 `POST /api/ai-story`，从环境变量读取 `AI_BASE_URL / AI_MODEL / AI_API_KEY`，转发到上游兼容 `chat/completions` 接口，并复用现有 JSON 提取与故事结构校验逻辑。前端只保留“主角名字 / 整体基调 / 故事需求”输入，调用本地代理；公开静态站点请求不到代理时，显示“请先启动本地 AI 服务。”。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Node 22、原生 HTTP、tsx

---

## 文件结构

```text
.
├── .env.example                              # 本地代理需要的环境变量示例
├── .gitignore                                # 忽略 .env.local
├── package.json                              # 增加 dev:server 与 tsx 依赖
├── server/
│   ├── index.ts                              # 启动本地 HTTP 服务
│   ├── config.ts                             # 读取并校验环境变量
│   ├── config.test.ts                        # 覆盖环境变量校验
│   ├── aiClient.ts                           # 调用上游 chat/completions
│   ├── aiClient.test.ts                      # 覆盖上游请求与错误处理
│   ├── aiStoryRoute.ts                       # 处理 POST /api/ai-story
│   └── aiStoryRoute.test.ts                  # 覆盖路由校验与响应
└── src/
    ├── ai/storyClient.ts                     # 改为调用本地代理
    ├── ai/storyClient.test.ts                # 覆盖本地代理不可达与成功路径
    ├── ai/repository.ts                      # 移除浏览器侧 config 存储并兼容旧存档
    ├── ai/types.ts                           # 去掉 AiConnectionConfig，收窄 AiWorkshopState
    ├── App.tsx                               # 删除 config 相关状态修改
    ├── App.workshop.test.tsx                 # 断言工坊不再显示接口配置输入
    ├── screens/AiWorkshopScreen.tsx          # 移除 API 配置表单并加本地服务说明
    └── styles/global.css                     # 如需要，补说明文案样式
```

## Task 1: 先用测试锁定后端代理契约和前端新界面

**Files:**
- Create: `server/config.test.ts`
- Create: `server/aiClient.test.ts`
- Create: `server/aiStoryRoute.test.ts`
- Modify: `src/ai/storyClient.test.ts`
- Modify: `src/App.workshop.test.tsx`

- [ ] **Step 1: 在 `server/config.test.ts` 先写环境变量校验失败测试**

创建文件：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadAiServerConfig } from './config'

describe('loadAiServerConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('缺少必要环境变量时抛出统一中文错误', () => {
    vi.stubEnv('AI_BASE_URL', '')
    vi.stubEnv('AI_MODEL', '')
    vi.stubEnv('AI_API_KEY', '')

    expect(() => loadAiServerConfig()).toThrowError(
      '本地 AI 服务缺少必要配置，请检查 .env.local。',
    )
  })

  it('使用默认端口 8787', () => {
    vi.stubEnv('AI_BASE_URL', 'https://example.com/v1')
    vi.stubEnv('AI_MODEL', 'test-model')
    vi.stubEnv('AI_API_KEY', 'secret')
    vi.stubEnv('AI_SERVER_PORT', '')

    expect(loadAiServerConfig().port).toBe(8787)
  })
})
```

- [ ] **Step 2: 在 `server/aiClient.test.ts` 先写上游请求失败与成功测试**

创建文件：

```ts
import { describe, expect, it, vi } from 'vitest'

import { requestAiStoryCompletion } from './aiClient'

const config = {
  baseUrl: 'https://example.com/v1',
  model: 'test-model',
  apiKey: 'secret',
  port: 8787,
}

describe('requestAiStoryCompletion', () => {
  it('上游 HTTP 失败时返回中文错误', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: vi.fn().mockResolvedValue('bad gateway'),
    })

    await expect(
      requestAiStoryCompletion(
        config,
        {
          brief: '写一个雨夜故事',
          protagonistName: '周岚',
          tone: '克制',
        },
        fetchMock as typeof fetch,
      ),
    ).rejects.toThrow('AI 请求失败（HTTP 502）：bad gateway')
  })

  it('成功时返回 message.content 文本', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"title":"雨夜","subtitle":"副题","premise":"前提","startNodeId":"opening","nodes":[]}',
            },
          },
        ],
      }),
    })

    await expect(
      requestAiStoryCompletion(
        config,
        {
          brief: '写一个雨夜故事',
          protagonistName: '周岚',
          tone: '克制',
        },
        fetchMock as typeof fetch,
      ),
    ).resolves.toContain('"title":"雨夜"')
  })
})
```

- [ ] **Step 3: 在 `server/aiStoryRoute.test.ts` 先写路由契约测试**

创建文件：

```ts
import { describe, expect, it, vi } from 'vitest'

import { handleAiStoryRequest } from './aiStoryRoute'

describe('handleAiStoryRequest', () => {
  it('brief 为空时返回 400 和中文错误', async () => {
    const response = await handleAiStoryRequest(
      {
        method: 'POST',
        body: JSON.stringify({ brief: '', protagonistName: '周岚', tone: '克制' }),
      },
      {
        loadConfig: vi.fn(),
        requestCompletion: vi.fn(),
        validateStory: vi.fn(),
      },
    )

    expect(response.status).toBe(400)
    expect(response.body).toContain('请先填写故事需求')
  })

  it('代理不可用错误会透传给前端', async () => {
    const response = await handleAiStoryRequest(
      {
        method: 'POST',
        body: JSON.stringify({ brief: '写一个雨夜故事', protagonistName: '周岚', tone: '克制' }),
      },
      {
        loadConfig: vi.fn(() => {
          throw new Error('本地 AI 服务缺少必要配置，请检查 .env.local。')
        }),
        requestCompletion: vi.fn(),
        validateStory: vi.fn(),
      },
    )

    expect(response.status).toBe(500)
    expect(response.body).toContain('本地 AI 服务缺少必要配置')
  })
})
```

- [ ] **Step 4: 更新 `src/ai/storyClient.test.ts`，改为测试本地代理调用**

把现有传 `config` 的测试改为以下两个核心用例：

```ts
it('本地代理不可达时提示先启动本地 AI 服务', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

  await expect(
    generateAiStory(
      {
        brief: '写一个雨夜故事',
        protagonistName: '周岚',
        tone: '克制',
      },
      fetchMock as typeof fetch,
    ),
  ).rejects.toThrow('请先启动本地 AI 服务。')
})

it('调用本地代理成功后返回故事对象', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      title: '雨夜',
      subtitle: '副题',
      premise: '前提',
      startNodeId: 'opening',
      nodes: [],
    }),
  })

  const story = await generateAiStory(
    {
      brief: '写一个雨夜故事',
      protagonistName: '周岚',
      tone: '克制',
    },
    fetchMock as typeof fetch,
  )

  expect(fetchMock).toHaveBeenCalledWith(
    'http://127.0.0.1:8787/api/ai-story',
    expect.objectContaining({ method: 'POST' }),
  )
  expect(story.title).toBe('雨夜')
})
```

- [ ] **Step 5: 更新 `src/App.workshop.test.tsx`，锁定新工坊界面**

把当前断言：

```tsx
expect(screen.getByLabelText('API 基础地址')).toBeInTheDocument()
```

改为：

```tsx
expect(screen.queryByLabelText('API 基础地址')).not.toBeInTheDocument()
expect(screen.queryByLabelText('模型名称')).not.toBeInTheDocument()
expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
expect(
  screen.getByText('生成新故事需要先启动本地 AI 服务。'),
).toBeInTheDocument()
```

- [ ] **Step 6: 运行局部测试，确认它们先失败**

Run:

```powershell
npm test -- server/config.test.ts server/aiClient.test.ts server/aiStoryRoute.test.ts src/ai/storyClient.test.ts src/App.workshop.test.tsx
```

Expected:

- `server/*.test.ts` 报错找不到实现文件
- `src/ai/storyClient.test.ts` 因签名和请求路径未改而失败
- `src/App.workshop.test.tsx` 因仍显示接口配置表单而失败

- [ ] **Step 7: 提交纯测试变更**

```powershell
git add server/config.test.ts server/aiClient.test.ts server/aiStoryRoute.test.ts src/ai/storyClient.test.ts src/App.workshop.test.tsx
git commit -m "test: lock local ai proxy contract"
```

## Task 2: 实现本地 Node 代理与环境变量读取

**Files:**
- Modify: `.gitignore`
- Create: `.env.example`
- Modify: `package.json`
- Create: `server/config.ts`
- Create: `server/aiClient.ts`
- Create: `server/aiStoryRoute.ts`
- Create: `server/index.ts`

- [ ] **Step 1: 增加本地环境文件忽略和示例文件**

`.gitignore` 追加：

```gitignore
.env.local
```

新建 `.env.example`：

```env
AI_BASE_URL=https://your-openai-compatible-endpoint.example/v1
AI_MODEL=your-model-name
AI_API_KEY=your-api-key
AI_SERVER_PORT=8787
```

- [ ] **Step 2: 在 `package.json` 增加本地代理运行依赖和脚本**

追加 `tsx` 到 `devDependencies`，并新增脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "node --env-file=.env.local --import tsx server/index.ts",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "tsx": "^4.20.3"
  }
}
```

- [ ] **Step 3: 实现 `server/config.ts`**

写入：

```ts
export interface AiServerConfig {
  baseUrl: string
  model: string
  apiKey: string
  port: number
}

export function loadAiServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiServerConfig {
  const baseUrl = env.AI_BASE_URL?.trim() ?? ''
  const model = env.AI_MODEL?.trim() ?? ''
  const apiKey = env.AI_API_KEY?.trim() ?? ''
  const rawPort = env.AI_SERVER_PORT?.trim() ?? ''

  if (baseUrl.length === 0 || model.length === 0 || apiKey.length === 0) {
    throw new Error('本地 AI 服务缺少必要配置，请检查 .env.local。')
  }

  const port = rawPort.length === 0 ? 8787 : Number.parseInt(rawPort, 10)

  return {
    baseUrl,
    model,
    apiKey,
    port: Number.isFinite(port) ? port : 8787,
  }
}
```

- [ ] **Step 4: 实现 `server/aiClient.ts`**

写入最小实现：

```ts
import type { AiStoryDraft } from '../src/ai/types'
import type { AiServerConfig } from './config'

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/chat/completions')
    ? trimmed
    : `${trimmed}/chat/completions`
}

function buildMessages(options: AiStoryDraft) {
  const protagonistName = options.protagonistName.trim() || '主角'
  const tone = options.tone.trim() || '都市雨夜、克制、遗憾、没有完美结局'

  return [
    {
      role: 'system',
      content: [
        '你是一名互动小说编剧。',
        '请生成一个受《灯火未熄》气质启发的中文分支故事。',
        '要求：都市雨夜、情感错位、2到3个结局、没有绝对圆满结局、文本克制、场景具体。',
        '请只返回 JSON，不要输出解释或 Markdown。',
        'JSON 结构必须包含：title、subtitle、premise、startNodeId、nodes。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `故事需求：${options.brief.trim()}`,
        `主角名字：${protagonistName}`,
        `整体基调：${tone}`,
      ].join('\n'),
    },
  ]
}

export async function requestAiStoryCompletion(
  config: AiServerConfig,
  draft: AiStoryDraft,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(normalizeBaseUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.9,
      messages: buildMessages(draft),
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      detail.trim().length === 0
        ? `AI 请求失败（HTTP ${response.status}）`
        : `AI 请求失败（HTTP ${response.status}）：${detail.trim()}`,
    )
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('AI 没有返回可解析的故事内容。')
  }

  return content
}
```

- [ ] **Step 5: 实现 `server/aiStoryRoute.ts` 和 `server/index.ts`**

`server/aiStoryRoute.ts`：

```ts
import { validateGeneratedStory } from '../src/ai/storySchema'
import type { AiStoryDraft } from '../src/ai/types'
import { requestAiStoryCompletion } from './aiClient'
import { loadAiServerConfig } from './config'

function extractJson(content: string): string {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return fencedMatch ? fencedMatch[1].trim() : content.trim()
}

export async function handleAiStoryRequest(input: {
  method: string
  body: string
}) {
  if (input.method !== 'POST') {
    return { status: 405, body: JSON.stringify({ error: '请求方法不支持。' }) }
  }

  let draft: AiStoryDraft
  try {
    draft = JSON.parse(input.body) as AiStoryDraft
  } catch {
    return { status: 400, body: JSON.stringify({ error: '请求体不是合法 JSON。' }) }
  }

  if (draft.brief.trim().length === 0) {
    return { status: 400, body: JSON.stringify({ error: '请先填写故事需求' }) }
  }

  try {
    const config = loadAiServerConfig()
    const content = await requestAiStoryCompletion(config, draft)
    const parsed = JSON.parse(extractJson(content))
    const validation = validateGeneratedStory(parsed)

    if (!validation.ok) {
      return {
        status: 502,
        body: JSON.stringify({ error: `AI 返回的故事结构无效：${validation.reason}` }),
      }
    }

    return { status: 200, body: JSON.stringify(validation.story) }
  } catch (error) {
    return {
      status: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : '生成故事时发生未知错误。',
      }),
    }
  }
}
```

`server/index.ts`：

```ts
import { createServer } from 'node:http'

import { loadAiServerConfig } from './config'
import { handleAiStoryRequest } from './aiStoryRoute'

const { port } = loadAiServerConfig()

createServer(async (request, response) => {
  if (request.url !== '/api/ai-story') {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ error: '接口不存在。' }))
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const result = await handleAiStoryRequest({
    method: request.method ?? 'GET',
    body: Buffer.concat(chunks).toString('utf8'),
  })

  response.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(result.body)
}).listen(port, '127.0.0.1')
```

- [ ] **Step 6: 运行局部测试，确认后端从红转绿**

Run:

```powershell
npm test -- server/config.test.ts server/aiClient.test.ts server/aiStoryRoute.test.ts
```

Expected:

- 三组后端测试 PASS

- [ ] **Step 7: 提交代理服务基础实现**

```powershell
git add .gitignore .env.example package.json package-lock.json server
git commit -m "feat: add local ai proxy server"
```

## Task 3: 改前端为只填故事内容并接本地代理

**Files:**
- Modify: `src/ai/types.ts`
- Modify: `src/ai/repository.ts`
- Modify: `src/ai/storyClient.ts`
- Modify: `src/screens/AiWorkshopScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.workshop.test.tsx`

- [ ] **Step 1: 从 `src/ai/types.ts` 中移除浏览器侧连接配置类型**

把：

```ts
export interface AiConnectionConfig {
  baseUrl: string
  apiKey: string
  model: string
}
```

以及：

```ts
config: AiConnectionConfig
```

从 `AiWorkshopState` 中删掉，更新为：

```ts
export interface AiWorkshopState {
  schemaVersion: 1
  draft: AiStoryDraft
  latestStory: GeneratedStory | null
  progress: GeneratedStoryProgress | null
  lastEndingId: string | null
}
```

- [ ] **Step 2: 更新 `src/ai/repository.ts`，移除 config 存储并兼容旧存档**

把初始状态改成：

```ts
export function createInitialAiWorkshopState(): AiWorkshopState {
  return {
    schemaVersion: 1,
    draft: defaultDraft(),
    latestStory: null,
    progress: null,
    lastEndingId: null,
  }
}
```

读取旧存档时忽略 `parsed.config`，只保留 `draft / latestStory / progress / lastEndingId`。这样旧浏览器数据不会炸，但以后不会再使用浏览器侧连接配置。

- [ ] **Step 3: 改写 `src/ai/storyClient.ts`，固定请求本地代理**

将函数签名从：

```ts
export async function generateAiStory(
  config: AiConnectionConfig,
  options: GenerateAiStoryOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<GeneratedStory>
```

改为：

```ts
const LOCAL_AI_PROXY_URL = 'http://127.0.0.1:8787/api/ai-story'

export async function generateAiStory(
  options: GenerateAiStoryOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<GeneratedStory> {
  if (options.brief.trim().length === 0) {
    throw new Error('请先填写故事需求')
  }

  let response: Response
  try {
    response = await fetchImpl(LOCAL_AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    })
  } catch {
    throw new Error('请先启动本地 AI 服务。')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : '生成故事时发生未知错误。'
    throw new Error(message)
  }

  return validateGeneratedStory(await response.json()).story
}
```

实现时如果直接写 `validateGeneratedStory(await response.json()).story` 不够安全，要按校验结果分支处理，但行为必须等价于“合法返回则给前端，非法则报中文错误”。

- [ ] **Step 4: 更新 `src/screens/AiWorkshopScreen.tsx`，移除接口配置表单**

从 props 中删除：

```ts
config: AiConnectionConfig
onConfigChange(patch: Partial<AiConnectionConfig>): void
```

删除整个 “AI连接” 面板，改成在头部或故事种子前加说明：

```tsx
<p className="ai-workshop-screen__intro">
  先完整体验《灯火未熄》，再用一次低频 AI 请求生成同类气质的新分支故事。
</p>
<p className="ai-workshop-screen__hint">
  生成新故事需要先启动本地 AI 服务。
</p>
```

其余保留：

- 主角名字
- 整体基调
- 故事需求
- 最近生成
- 试玩最近生成

- [ ] **Step 5: 更新 `src/App.tsx`，删掉 config 修改路径**

需要改三处：

1. 删除 `AiWorkshopScreen` 里的 `config` 和 `onConfigChange` 传参。
2. `handleGenerateStory()` 改为：

```ts
const story = await generateAiStory({
  brief: workshopState.draft.brief,
  protagonistName: workshopState.draft.protagonistName,
  tone: workshopState.draft.tone,
})
```

3. 保留 `workshopState` 的 `draft / latestStory / progress / lastEndingId` 持久化逻辑，不再维护 `config`。

- [ ] **Step 6: 运行前端相关测试**

Run:

```powershell
npm test -- src/ai/storyClient.test.ts src/App.workshop.test.tsx
```

Expected:

- 本地代理调用逻辑 PASS
- 工坊页面不再显示接口配置表单

- [ ] **Step 7: 提交前端接代理改造**

```powershell
git add src/ai/types.ts src/ai/repository.ts src/ai/storyClient.ts src/ai/storyClient.test.ts src/screens/AiWorkshopScreen.tsx src/App.tsx src/App.workshop.test.tsx
git commit -m "feat: route ai workshop through local proxy"
```

## Task 4: 全量回归与本地启动说明

**Files:**
- Modify only if checks reveal defects

- [ ] **Step 1: 运行全量自动化验证**

Run:

```powershell
npm test
npm run build
```

Expected:

- `vitest` 全部 PASS
- `vite build` PASS

- [ ] **Step 2: 检查编码与中文转义**

Run:

```powershell
$utf8 = [System.Text.UTF8Encoding]::new($false, $true)
Get-ChildItem server,src -Recurse -File | Where-Object Extension -in '.ts','.tsx','.css' | ForEach-Object { $null = $utf8.GetString([IO.File]::ReadAllBytes($_.FullName)) }
rg -n "\\\\u[0-9a-fA-F]{4}" server src
if ($LASTEXITCODE -eq 1) { Write-Output 'NO_UNICODE_ESCAPES_FOUND'; exit 0 }
```

Expected:

- UTF-8 解码无异常
- 无中文 `\uXXXX` 转义

- [ ] **Step 3: 手工检查本地启动说明**

最终交付说明必须明确：

1. 在项目根目录创建 `.env.local`
2. 填入：

```env
AI_BASE_URL=...
AI_MODEL=...
AI_API_KEY=...
AI_SERVER_PORT=8787
```

3. 分别运行：

```powershell
npm run dev
npm run dev:server
```

4. 公开试玩链接上若未启动本地服务，点击生成会提示：
   `请先启动本地 AI 服务。`

- [ ] **Step 4: 检查工作区并记录最近提交**

Run:

```powershell
git status --short
git diff --check
git log --oneline -5
```

Expected:

- 无空白错误
- 最近提交中可见测试、代理服务、前端接入三类提交
- 如果检查阶段没有发现新问题，不创建空提交
