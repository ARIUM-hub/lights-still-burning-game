# Naming Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development when explicitly needed for independent tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将《灯火未熄》的“用户自定义男女主名字”流程改为独立命名页，确保手机端从标题页进入剧情前先完成命名确认。

**Architecture:** 在 `App.tsx` 增加命名页视图状态与入口模式状态，让标题页只负责导航，新增 `NamingScreen.tsx` 负责本地输入和确认动作，确认后再通过现有 `updateCharacterNames` 写回存档并进入新开局或继续进度。保留既有角色名替换逻辑和存档兼容逻辑，只重构命名交互的触发时机。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、React Testing Library、原生 CSS

---

## 文件结构

```text
src/
├── App.tsx                                 # 增加命名页视图、入口模式与确认流程
├── App.test.tsx                            # 覆盖开始/继续/返回标题的新流程
├── App.characterNames.test.tsx             # 覆盖命名确认后剧情文本替换
├── screens/TitleScreen.tsx                 # 移除标题页命名输入区
├── screens/TitleScreen.test.tsx            # 更新标题页断言
├── screens/NamingScreen.tsx                # 新增独立命名页
├── screens/NamingScreen.test.tsx           # 覆盖命名页布局、默认值、按钮文案
└── styles/global.css                       # 新增命名页样式，移除标题页命名布局
```

## Task 1: 先用测试锁定新流程

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.characterNames.test.tsx`
- Modify: `src/screens/TitleScreen.test.tsx`
- Create: `src/screens/NamingScreen.test.tsx`

- [ ] **Step 1: 在 `App.test.tsx` 增加“开始故事先进入命名页”的失败测试**

在现有 `describe('App', ...)` 中新增如下用例：

```tsx
it('点击开始故事后先进入命名页，再确认后进入剧情', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: '开始故事' }))

  expect(screen.getByRole('heading', { name: '主角命名' })).toBeInTheDocument()
  expect(screen.getByLabelText('男主名字')).toHaveValue('小丑')
  expect(screen.getByLabelText('女主名字')).toHaveValue('小美')

  await user.clear(screen.getByLabelText('男主名字'))
  await user.type(screen.getByLabelText('男主名字'), '周岚')
  await user.clear(screen.getByLabelText('女主名字'))
  await user.type(screen.getByLabelText('女主名字'), '林灯')
  await user.click(screen.getByRole('button', { name: '带着名字开始故事' }))

  expect(
    screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
  ).toBeInTheDocument()
})
```

- [ ] **Step 2: 在 `App.test.tsx` 增加“继续雨夜也先进入命名页”和“返回标题不保存”的失败测试**

继续在同一文件中增加两个用例：

```tsx
it('点击继续雨夜后先进入命名页，再确认后继续进度', async () => {
  const user = userEvent.setup()
  const save = createInitialSave()
  save.progress = createInitialProgress('act2_meeting')
  save.settings.textSpeed = 'instant'
  writeSave(save)

  render(<App />)

  await user.click(screen.getByRole('button', { name: '继续雨夜' }))

  expect(screen.getByRole('heading', { name: '主角命名' })).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: '带着名字继续雨夜' }),
  ).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '带着名字继续雨夜' }))

  expect(
    screen.getByRole('region', { name: '剧情场景：便利店的热牛奶' }),
  ).toBeInTheDocument()
})

it('命名页返回标题时不会保存未确认的名字修改', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: '开始故事' }))
  await user.clear(screen.getByLabelText('男主名字'))
  await user.type(screen.getByLabelText('男主名字'), '周岚')
  await user.click(screen.getByRole('button', { name: '返回标题' }))

  expect(screen.getByRole('heading', { name: '灯火未熄' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '开始故事' }))
  expect(screen.getByLabelText('男主名字')).toHaveValue('小丑')
})
```

- [ ] **Step 3: 更新 `App.characterNames.test.tsx`，改为通过命名页确认后验证剧情替换**

把现有“直接写入存档后渲染剧情”的路径改成经过命名页确认：

```tsx
it('通过命名页确认自定义名字后会显示替换后的文本', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: '开始故事' }))
  await user.clear(screen.getByLabelText('男主名字'))
  await user.type(screen.getByLabelText('男主名字'), '周岚')
  await user.clear(screen.getByLabelText('女主名字'))
  await user.type(screen.getByLabelText('女主名字'), '林灯')
  await user.click(screen.getByRole('button', { name: '带着名字开始故事' }))

  await user.click(screen.getByRole('button', { name: '推进剧情' }))

  expect(screen.getByTestId('typewriter')).toHaveTextContent('周岚')
})
```

- [ ] **Step 4: 更新 `TitleScreen.test.tsx`，删除标题页可直接编辑名字的断言**

移除当前这段测试：

```tsx
it('允许用户修改男女主名字', async () => {
  const user = userEvent.setup()
  const { props } = renderTitleScreen()

  await user.clear(screen.getByLabelText('男主名字'))
  await user.type(screen.getByLabelText('男主名字'), '周岚')
  await user.clear(screen.getByLabelText('女主名字'))
  await user.type(screen.getByLabelText('女主名字'), '林灯')

  expect(props.onChangeCharacterNames).toHaveBeenCalled()
})
```

并新增“标题页无命名输入”的断言：

```tsx
it('标题页不再直接展示男女主命名输入框', () => {
  renderTitleScreen()

  expect(screen.queryByLabelText('男主名字')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('女主名字')).not.toBeInTheDocument()
})
```

- [ ] **Step 5: 新建 `NamingScreen.test.tsx`，先写失败测试**

创建完整测试文件：

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NamingScreen } from './NamingScreen'

function renderNamingScreen(
  overrides: Partial<React.ComponentProps<typeof NamingScreen>> = {},
) {
  const props: React.ComponentProps<typeof NamingScreen> = {
    mode: 'start',
    initialNames: {
      protagonist: '小丑',
      heroine: '小美',
    },
    onConfirm: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  }

  return { ...render(<NamingScreen {...props} />), props }
}

describe('NamingScreen', () => {
  afterEach(cleanup)

  it('按男主在上女主在下展示预填名字', () => {
    renderNamingScreen()

    const protagonist = screen.getByLabelText('男主名字')
    const heroine = screen.getByLabelText('女主名字')

    expect(protagonist).toHaveValue('小丑')
    expect(heroine).toHaveValue('小美')
    expect(
      protagonist.compareDocumentPosition(heroine) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('根据模式切换主按钮文案', () => {
    renderNamingScreen({ mode: 'continue' })

    expect(
      screen.getByRole('button', { name: '带着名字继续雨夜' }),
    ).toBeInTheDocument()
  })

  it('确认时回传当前输入，返回时触发返回回调', async () => {
    const user = userEvent.setup()
    const { props } = renderNamingScreen()

    await user.clear(screen.getByLabelText('男主名字'))
    await user.type(screen.getByLabelText('男主名字'), '周岚')
    await user.clear(screen.getByLabelText('女主名字'))
    await user.type(screen.getByLabelText('女主名字'), '林灯')
    await user.click(screen.getByRole('button', { name: '带着名字开始故事' }))
    await user.click(screen.getByRole('button', { name: '返回标题' }))

    expect(props.onConfirm).toHaveBeenCalledWith({
      protagonist: '周岚',
      heroine: '林灯',
    })
    expect(props.onBack).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 6: 运行局部测试，确认它们先失败**

Run:

```powershell
npm test -- src/App.test.tsx src/App.characterNames.test.tsx src/screens/TitleScreen.test.tsx src/screens/NamingScreen.test.tsx
```

Expected:

- `src/screens/NamingScreen.test.tsx` 报错找不到 `./NamingScreen`
- `App.test.tsx` 中新用例失败，因为当前点 `开始故事 / 继续雨夜` 会直接进剧情
- `TitleScreen.test.tsx` 失败，因为标题页仍然存在命名输入

- [ ] **Step 7: 提交纯测试变更**

```powershell
git add src/App.test.tsx src/App.characterNames.test.tsx src/screens/TitleScreen.test.tsx src/screens/NamingScreen.test.tsx
git commit -m "test: lock naming flow before implementation"
```

## Task 2: 实现独立命名页与新视图流转

**Files:**
- Create: `src/screens/NamingScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/screens/TitleScreen.tsx`

- [ ] **Step 1: 创建 `NamingScreen.tsx` 的最小实现，让新增测试先能挂载**

写入以下组件骨架：

```tsx
import { useEffect, useRef, useState } from 'react'

import type { CharacterNames } from '../engine/types'

interface NamingScreenProps {
  mode: 'start' | 'continue'
  initialNames: CharacterNames
  onConfirm(names: CharacterNames): void
  onBack(): void
}

export function NamingScreen({
  mode,
  initialNames,
  onConfirm,
  onBack,
}: NamingScreenProps) {
  const protagonistRef = useRef<HTMLInputElement>(null)
  const [names, setNames] = useState<CharacterNames>(initialNames)

  useEffect(() => {
    setNames(initialNames)
  }, [initialNames])

  useEffect(() => {
    protagonistRef.current?.focus()
  }, [])

  return (
    <main className="naming-screen">
      <section className="naming-screen__content" aria-labelledby="naming-screen-title">
        <header className="naming-screen__header">
          <h1 id="naming-screen-title">主角命名</h1>
          <p>先为这场雨夜写下他们的名字。</p>
        </header>

        <div className="naming-screen__fields">
          <label className="naming-screen__field">
            <span>男主名字</span>
            <input
              ref={protagonistRef}
              aria-label="男主名字"
              type="text"
              maxLength={12}
              value={names.protagonist}
              onChange={(event) =>
                setNames((current) => ({
                  ...current,
                  protagonist: event.currentTarget.value,
                }))
              }
            />
          </label>
          <label className="naming-screen__field">
            <span>女主名字</span>
            <input
              aria-label="女主名字"
              type="text"
              maxLength={12}
              value={names.heroine}
              onChange={(event) =>
                setNames((current) => ({
                  ...current,
                  heroine: event.currentTarget.value,
                }))
              }
            />
          </label>
        </div>

        <div className="naming-screen__actions">
          <button type="button" className="naming-screen__primary-action" onClick={() => onConfirm(names)}>
            {mode === 'continue' ? '带着名字继续雨夜' : '带着名字开始故事'}
          </button>
          <button type="button" onClick={onBack}>
            返回标题
          </button>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: 从 `TitleScreen.tsx` 中移除命名相关 props 和输入区**

将接口从：

```tsx
  characterNames: CharacterNames
  onChangeCharacterNames(patch: Partial<CharacterNames>): void
```

改为不再接收它们，并删除整段：

```tsx
<section
  className="title-screen__names"
  aria-labelledby="title-screen-names-title"
>
  ...
</section>
```

保留按钮区逻辑不变。更新后的导入和 props 头部应类似：

```tsx
import type { Ref } from 'react'

interface TitleScreenProps {
  hasProgress: boolean
  recoverableError: string | null
  onStart(): void
  onContinue(): void
  onRestart(): void
  hasMemories: boolean
  onOpenMemory(): void
  soundEnabled: boolean
  onToggleSound(): void
  reducedMotion: boolean
  onOpenSettings(): void
  hasWorkshop?: boolean
  onOpenWorkshop?(): void
  primaryActionRef?: Ref<HTMLButtonElement>
}
```

- [ ] **Step 3: 在 `App.tsx` 中新增命名页视图和入口模式状态**

把 `View` 扩成：

```tsx
type View =
  | 'title'
  | 'naming'
  | 'memory'
  | 'game'
  | 'ending'
  | 'workshop'
  | 'generated-game'
  | 'generated-ending'
```

增加入口模式状态：

```tsx
type NamingMode = 'start' | 'continue'

const [namingMode, setNamingMode] = useState<NamingMode>('start')
```

并新增两个辅助方法：

```tsx
function openNaming(mode: NamingMode) {
  restoreSoundFromGesture()
  setNamingMode(mode)
  setView('naming')
}

function handleConfirmNaming(names: typeof save.characterNames) {
  updateCharacterNames(names)

  if (namingMode === 'continue') {
    continueGame()
  } else {
    startNewGame()
  }

  setView('game')
}
```

- [ ] **Step 4: 用命名页替换标题页的直接开局行为**

在 `TitleScreen` 传参处，把：

```tsx
onStart={handleStart}
onContinue={handleContinue}
onRestart={handleStart}
```

改为：

```tsx
onStart={() => openNaming('start')}
onContinue={() => openNaming('continue')}
onRestart={() => openNaming('start')}
```

新增命名页分支：

```tsx
  } else if (view === 'naming') {
    content = (
      <NamingScreen
        mode={namingMode}
        initialNames={save.characterNames}
        onConfirm={handleConfirmNaming}
        onBack={() => setView('title')}
      />
    )
```

同时移除原先传给 `TitleScreen` 的：

```tsx
characterNames={save.characterNames}
onChangeCharacterNames={updateCharacterNames}
```

- [ ] **Step 5: 运行新增测试，确认视图流转全部通过**

Run:

```powershell
npm test -- src/App.test.tsx src/App.characterNames.test.tsx src/screens/TitleScreen.test.tsx src/screens/NamingScreen.test.tsx
```

Expected:

- `NamingScreen` 组件测试 PASS
- `TitleScreen` 不再渲染命名输入
- `App` 中开始、继续、返回标题路径 PASS
- 如 `App.characterNames.test.tsx` 还因剧情推进步数不稳失败，继续下一任务时再一并修正

- [ ] **Step 6: 提交视图流转实现**

```powershell
git add src/App.tsx src/screens/TitleScreen.tsx src/screens/NamingScreen.tsx
git commit -m "feat: add dedicated naming screen flow"
```

## Task 3: 收口样式与回归测试

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/App.characterNames.test.tsx`

- [ ] **Step 1: 从 `global.css` 中移除标题页命名区样式，并新增命名页样式**

删除这些旧规则：

```css
.title-screen__names {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-5) 0 var(--space-2);
}

.title-screen__name-field {
  display: grid;
  gap: var(--space-2);
}

.title-screen__name-field input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid rgba(216, 161, 93, 0.18);
  border-radius: var(--radius-sm);
  background: rgba(245, 238, 225, 0.08);
  color: var(--color-text);
}
```

新增命名页样式：

```css
.naming-screen {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding:
    max(var(--space-8), env(safe-area-inset-top))
    var(--space-4)
    calc(var(--space-8) + env(safe-area-inset-bottom));
  background:
    linear-gradient(to top, rgba(4, 8, 17, 0.98) 4%, rgba(7, 13, 23, 0.78) 58%, rgba(7, 13, 23, 0.4)),
    radial-gradient(circle at 76% 24%, rgba(240, 185, 111, 0.14), transparent 14rem),
    linear-gradient(150deg, #111d2d, #070d17 60%, #03060c);
}

.naming-screen__content {
  width: min(100%, 30rem);
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  background: linear-gradient(135deg, rgba(8, 14, 24, 0.92), rgba(8, 14, 24, 0.78));
  box-shadow: var(--shadow-dialogue);
  backdrop-filter: blur(12px);
}

.naming-screen__header,
.naming-screen__fields,
.naming-screen__actions {
  display: grid;
  gap: var(--space-3);
}

.naming-screen__header {
  margin-bottom: var(--space-5);
}

.naming-screen__field {
  display: grid;
  gap: var(--space-2);
}

.naming-screen__field input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid rgba(216, 161, 93, 0.18);
  border-radius: var(--radius-sm);
  background: rgba(245, 238, 225, 0.08);
  color: var(--color-text);
}

.naming-screen__actions {
  margin-top: var(--space-5);
}

.naming-screen__primary-action {
  border-color: var(--color-accent);
  color: #120e08;
  background: var(--color-accent);
  font-weight: 700;
}

@media (min-width: 768px) {
  .naming-screen__content {
    padding: var(--space-8);
  }
}
```

- [ ] **Step 2: 把 `App.characterNames.test.tsx` 调整为稳定断言**

将测试写成“通过命名页确认后，首屏正文包含自定义男主名”，避免依赖点到第三句才出现女主发言：

```tsx
it('通过命名页确认自定义名字后会显示替换后的文本', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: '开始故事' }))
  await user.clear(screen.getByLabelText('男主名字'))
  await user.type(screen.getByLabelText('男主名字'), '周岚')
  await user.clear(screen.getByLabelText('女主名字'))
  await user.type(screen.getByLabelText('女主名字'), '林灯')
  await user.click(screen.getByRole('button', { name: '带着名字开始故事' }))

  await user.click(screen.getByRole('button', { name: '推进剧情' }))

  expect(screen.getByTestId('typewriter')).toHaveTextContent('周岚')
})
```

- [ ] **Step 3: 运行这次改造相关的完整回归**

Run:

```powershell
npm test -- src/App.test.tsx src/App.characterNames.test.tsx src/screens/TitleScreen.test.tsx src/screens/NamingScreen.test.tsx
npm test
npm run build
```

Expected:

- 局部相关测试全部 PASS
- 全量 `vitest` PASS
- `vite build` PASS

- [ ] **Step 4: 提交样式与回归修正**

```powershell
git add src/styles/global.css src/App.characterNames.test.tsx
git commit -m "style: polish naming screen for mobile flow"
```

## Task 4: 最终检查并准备衔接 AI 后端代理阶段

**Files:**
- Modify only if checks reveal defects

- [ ] **Step 1: 检查编码与中文文本完整性**

Run:

```powershell
$utf8 = [System.Text.UTF8Encoding]::new($false, $true)
Get-ChildItem src -Recurse -File | Where-Object Extension -in '.ts','.tsx','.css' | ForEach-Object { $null = $utf8.GetString([IO.File]::ReadAllBytes($_.FullName)) }
rg -n "\\\\u[0-9a-fA-F]{4}" src
```

Expected:

- UTF-8 解码无异常
- `rg` 没有命中中文 Unicode 转义

- [ ] **Step 2: 检查工作区差异与空白错误**

Run:

```powershell
git status --short
git diff --check
```

Expected:

- 只有这次独立命名页改造和既有未提交功能改动
- 无空白错误

- [ ] **Step 3: 如检查无问题，准备进入下一轮 AI 后端代理设计与实现**

收尾说明要明确：

- 本轮只完成独立命名页，不碰 AI 工坊接口协议
- 测试与构建已通过
- 下一轮从后端代理接入开始，优先本地可跑再谈部署

- [ ] **Step 4: 记录最终提交**

```powershell
git log --oneline -5
```

Expected:

- 能看到本轮测试、功能、样式相关提交
- 如果检查阶段没有新增修复，不创建空提交
