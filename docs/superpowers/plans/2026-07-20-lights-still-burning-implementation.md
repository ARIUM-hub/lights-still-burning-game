# 《灯火未熄》互动恋爱游戏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一款手机优先、断网可玩的《灯火未熄》固定剧情视觉小说，包含约 10 次隐藏状态选择、5 个宿命悲剧结局、自动存档、结局收藏、专属插画与程序化环境音。

**Architecture:** 使用 Vite + React + TypeScript 构建纯静态单页应用；结构化剧情节点只描述内容与影响，纯函数剧情引擎负责节点解析、隐藏状态和结局判定，React Context 负责会话状态与自动存档。插画打包为本地 WebP，环境音由 Web Audio API 在浏览器本地生成，任何素材或音频失败都不得阻塞剧情。

**Tech Stack:** React 19、TypeScript 5、Vite 7、原生 CSS、Vitest、React Testing Library、Playwright、Sharp

---

## 文件结构

```text
.
├── .npmrc                              # 国内 npm 镜像
├── .gitignore                          # 忽略依赖、构建与设计伴侣临时目录
├── package.json                        # 脚本与依赖
├── tsconfig.json
├── vite.config.ts                      # Vite/Vitest 配置
├── playwright.config.ts
├── index.html
├── art/source/                         # AI 原始插画，不由页面直接加载
├── public/images/scenes/               # 优化后的 WebP 场景图
├── scripts/optimize-images.mjs         # PNG → WebP
├── src/
│   ├── main.tsx
│   ├── App.tsx                         # 页面路由与顶层组合
│   ├── app/GameContext.tsx             # reducer、动作与自动保存
│   ├── app/GameContext.test.tsx
│   ├── engine/types.ts                 # 剧情领域类型
│   ├── engine/initialState.ts          # 初始状态
│   ├── engine/storyEngine.ts           # 选择、节点和结局解析纯函数
│   ├── engine/storyEngine.test.ts
│   ├── engine/validateStory.ts          # 剧情图静态检查
│   ├── engine/validateStory.test.ts
│   ├── story/act1.ts ... act5.ts       # 五幕剧情节点
│   ├── story/endings.ts                # 五个结局与隐藏独白
│   ├── story/index.ts                  # 合并并导出剧情图
│   ├── state/saveRepository.ts         # 版本化 localStorage
│   ├── state/saveRepository.test.ts
│   ├── audio/AudioDirector.ts           # 程序化雨声、门铃、车流、列车声
│   ├── audio/AudioDirector.test.ts
│   ├── components/StoryStage.tsx
│   ├── components/DialogueBox.tsx
│   ├── components/ChoicePanel.tsx
│   ├── components/TopBar.tsx
│   ├── components/SettingsSheet.tsx
│   ├── components/TypewriterText.tsx
│   ├── screens/TitleScreen.tsx
│   ├── screens/GameScreen.tsx
│   ├── screens/EndingScreen.tsx
│   ├── screens/MemoryScreen.tsx
│   ├── styles/tokens.css
│   ├── styles/global.css
│   └── test/setup.ts
└── e2e/game.spec.ts
```

## Task 1：建立可测试的 Vite React 工程

**Files:**
- Create: `.npmrc`
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`

- [ ] **Step 1：写入国内镜像和工程配置**

`.npmrc`：

```ini
registry=https://registry.npmmirror.com/
fund=false
audit=false
```

`.gitignore`：

```gitignore
node_modules/
dist/
coverage/
test-results/
playwright-report/
.superpowers/
```

`package.json`：

```json
{
  "name": "lights-still-burning",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "optimize:images": "node scripts/optimize-images.mjs"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.54.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "@vitejs/plugin-react": "^4.6.0",
    "jsdom": "^26.1.0",
    "sharp": "^0.34.3",
    "typescript": "^5.8.3",
    "vite": "^7.0.4",
    "vitest": "^3.2.4"
  }
}
```

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`：

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

- [ ] **Step 2：安装依赖**

Run: `npm install`

Expected: 退出码为 `0`，生成 `package-lock.json`，依赖从 `registry.npmmirror.com` 下载。

- [ ] **Step 3：先写失败的应用冒烟测试**

`src/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest';
```

`src/App.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('显示作品标题和开始按钮', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '灯火未熄' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始故事' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4：运行测试确认失败**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL，提示无法找到 `./App` 或页面中没有“灯火未熄”。

- [ ] **Step 5：实现最小应用入口**

`index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#070d17" />
    <title>灯火未熄</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/App.tsx`：

```tsx
export default function App() {
  return (
    <main>
      <h1>灯火未熄</h1>
      <p>有些人不是离开了才失去。</p>
      <button type="button">开始故事</button>
    </main>
  );
}
```

`src/main.tsx`：

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

- [ ] **Step 6：运行测试和构建**

Run: `npm test -- src/App.test.tsx && npm run build`

Expected: 1 个测试 PASS；Vite 生成 `dist/`。

- [ ] **Step 7：提交工程基础**

```powershell
git add .npmrc .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.tsx src/App.tsx src/App.test.tsx src/test/setup.ts
git commit -m "chore: 初始化视觉小说工程"
```

## Task 2：定义剧情状态并实现纯函数剧情引擎

**Files:**
- Create: `src/engine/types.ts`
- Create: `src/engine/initialState.ts`
- Create: `src/engine/storyEngine.ts`
- Create: `src/engine/storyEngine.test.ts`

- [ ] **Step 1：写剧情引擎失败测试**

`src/engine/storyEngine.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { applyChoice, resolveEnding } from './storyEngine';
import { createInitialProgress } from './initialState';

describe('applyChoice', () => {
  it('同时更新隐藏属性、关系、标记和节点', () => {
    const next = applyChoice(createInitialProgress(), {
      id: 'accept-shoes',
      label: '接过鞋盒',
      next: 'act2_after_shoes',
      effects: {
        stats: { attachment: 2, selfDenial: -1 },
        relations: { xiaomeiTrust: 1 },
        flags: ['acceptedShoes'],
      },
    });
    expect(next.nodeId).toBe('act2_after_shoes');
    expect(next.stats).toEqual({ courage: 0, attachment: 2, selfDenial: -1 });
    expect(next.relations.xiaomeiTrust).toBe(1);
    expect(next.flags).toContain('acceptedShoes');
  });
});

describe('resolveEnding', () => {
  it.each([
    [['startedJourney'], 'next-city'],
    [['arrivedBeforeNine', 'doubtedAtPlatform'], 'platform-divide'],
    [['explicitlyRefused'], 'better-person'],
    [['arrivedAfterDeparture'], 'train-gone'],
    [[], 'unanswered'],
  ] as const)('按关键行为优先解析 %j', (flags, ending) => {
    const progress = createInitialProgress();
    progress.flags = [...flags];
    expect(resolveEnding(progress)).toBe(ending);
  });
});
```

- [ ] **Step 2：运行测试确认失败**

Run: `npm test -- src/engine/storyEngine.test.ts`

Expected: FAIL，提示 `storyEngine` 和 `initialState` 不存在。

- [ ] **Step 3：定义完整领域类型**

`src/engine/types.ts`：

```ts
export type StatKey = 'courage' | 'attachment' | 'selfDenial';
export type RelationKey = 'xiaomeiTrust' | 'dazhuangOpenness' | 'xiaoliAdvice';
export type EndingId = 'train-gone' | 'unanswered' | 'better-person' | 'platform-divide' | 'next-city';
export type SceneId = 'cafe' | 'apartment' | 'store' | 'riverside' | 'warehouse' | 'street' | 'station';
export type AmbienceId = 'rain' | 'cafe' | 'store' | 'city' | 'warehouse' | 'train';

export interface DialogueLine {
  speaker?: '小丑' | '小美' | '大壮' | '小丽' | '小帅';
  text: string;
}

export interface Effects {
  stats?: Partial<Record<StatKey, number>>;
  relations?: Partial<Record<RelationKey, number>>;
  flags?: string[];
}

export interface Choice {
  id: string;
  label: string;
  next: string;
  effects?: Effects;
}

export interface Condition {
  flagsAll?: string[];
  flagsNone?: string[];
  statMin?: Partial<Record<StatKey, number>>;
  statMax?: Partial<Record<StatKey, number>>;
}

export interface NodeVariant {
  when: Condition;
  lines: DialogueLine[];
}

export interface StoryNode {
  id: string;
  act: 1 | 2 | 3 | 4 | 5;
  title: string;
  scene: SceneId;
  ambience: AmbienceId;
  lines: DialogueLine[];
  variants?: NodeVariant[];
  choices?: Choice[];
  next?: string;
  resolveEnding?: boolean;
}

export interface StoryProgress {
  nodeId: string;
  lineIndex: number;
  stats: Record<StatKey, number>;
  relations: Record<RelationKey, number>;
  flags: string[];
  completedActs: number[];
}

export interface Settings {
  soundEnabled: boolean;
  masterVolume: number;
  textSpeed: 'slow' | 'normal' | 'instant';
  reducedMotion: boolean;
}

export interface SaveData {
  schemaVersion: 1;
  progress: StoryProgress | null;
  unlockedEndings: EndingId[];
  settings: Settings;
}
```

`src/engine/initialState.ts`：

```ts
import type { SaveData, StoryProgress } from './types';

export function createInitialProgress(nodeId = 'act1_opening'): StoryProgress {
  return {
    nodeId,
    lineIndex: 0,
    stats: { courage: 0, attachment: 0, selfDenial: 0 },
    relations: { xiaomeiTrust: 0, dazhuangOpenness: 0, xiaoliAdvice: 0 },
    flags: [],
    completedActs: [],
  };
}

export function createInitialSave(): SaveData {
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    schemaVersion: 1,
    progress: null,
    unlockedEndings: [],
    settings: {
      soundEnabled: false,
      masterVolume: 0.45,
      textSpeed: 'normal',
      reducedMotion: prefersReducedMotion,
    },
  };
}
```

- [ ] **Step 4：实现纯函数引擎**

`src/engine/storyEngine.ts`：

```ts
import type { Choice, Condition, EndingId, StoryNode, StoryProgress } from './types';

const addRecord = <K extends string>(base: Record<K, number>, delta: Partial<Record<K, number>> = {}) =>
  Object.fromEntries(Object.entries(base).map(([key, value]) => [key, value + (delta[key as K] ?? 0)])) as Record<K, number>;

export function applyChoice(progress: StoryProgress, choice: Choice): StoryProgress {
  return {
    ...progress,
    nodeId: choice.next,
    lineIndex: 0,
    stats: addRecord(progress.stats, choice.effects?.stats),
    relations: addRecord(progress.relations, choice.effects?.relations),
    flags: [...new Set([...progress.flags, ...(choice.effects?.flags ?? [])])],
  };
}

export function matches(progress: StoryProgress, condition: Condition): boolean {
  const flags = new Set(progress.flags);
  return (condition.flagsAll ?? []).every((flag) => flags.has(flag))
    && (condition.flagsNone ?? []).every((flag) => !flags.has(flag))
    && Object.entries(condition.statMin ?? {}).every(([key, value]) => progress.stats[key as keyof typeof progress.stats] >= value!)
    && Object.entries(condition.statMax ?? {}).every(([key, value]) => progress.stats[key as keyof typeof progress.stats] <= value!);
}

export function linesFor(node: StoryNode, progress: StoryProgress) {
  return node.variants?.find((variant) => matches(progress, variant.when))?.lines ?? node.lines;
}

export function resolveEnding(progress: StoryProgress): EndingId {
  const flags = new Set(progress.flags);
  if (flags.has('startedJourney')) return 'next-city';
  if (flags.has('arrivedBeforeNine') && flags.has('doubtedAtPlatform')) return 'platform-divide';
  if (flags.has('explicitlyRefused')) return 'better-person';
  if (flags.has('arrivedAfterDeparture')) return 'train-gone';
  return 'unanswered';
}
```

- [ ] **Step 5：运行测试**

Run: `npm test -- src/engine/storyEngine.test.ts`

Expected: 所有引擎测试 PASS。

- [ ] **Step 6：提交领域模型**

```powershell
git add src/engine
git commit -m "feat: 添加隐藏状态剧情引擎"
```

## Task 3：编写五幕剧情、五个结局并校验剧情图

**Files:**
- Create: `src/story/act1.ts`
- Create: `src/story/act2.ts`
- Create: `src/story/act3.ts`
- Create: `src/story/act4.ts`
- Create: `src/story/act5.ts`
- Create: `src/story/endings.ts`
- Create: `src/story/index.ts`
- Create: `src/engine/validateStory.ts`
- Create: `src/engine/validateStory.test.ts`

- [ ] **Step 1：先写剧情图失败测试**

`src/engine/validateStory.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { story } from '../story';
import { validateStory } from './validateStory';

describe('完整剧情图', () => {
  it('不存在重复节点、无效后继或意外死路', () => {
    expect(validateStory(story)).toEqual([]);
  });

  it('包含五幕、至少十个选择点和唯一结局解析点', () => {
    const nodes = Object.values(story);
    expect(new Set(nodes.map((node) => node.act))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(nodes.filter((node) => node.choices?.length).length).toBeGreaterThanOrEqual(10);
    expect(nodes.filter((node) => node.resolveEnding)).toHaveLength(1);
  });
});
```

- [ ] **Step 2：运行测试确认失败**

Run: `npm test -- src/engine/validateStory.test.ts`

Expected: FAIL，提示 `../story` 或 `validateStory` 不存在。

- [ ] **Step 3：实现剧情图校验器**

`src/engine/validateStory.ts`：

```ts
import type { StoryNode } from './types';

export function validateStory(story: Record<string, StoryNode>): string[] {
  const errors: string[] = [];
  for (const [key, node] of Object.entries(story)) {
    if (key !== node.id) errors.push(`${key}: 节点键与 id 不一致`);
    const targets = [node.next, ...(node.choices?.map((choice) => choice.next) ?? [])].filter(Boolean) as string[];
    for (const target of targets) {
      if (!story[target]) errors.push(`${node.id}: 后继节点 ${target} 不存在`);
    }
    if (!node.next && !node.choices?.length && !node.resolveEnding) {
      errors.push(`${node.id}: 非结局节点没有后继`);
    }
  }
  return errors;
}
```

- [ ] **Step 4：按已确认文案创建五幕节点**

每个文件导出 `StoryNode[]`。必须直接写正常中文，不使用 `\uXXXX`。以下节点表是实现清单，节点 ID、选择 ID、影响和后继必须逐项一致：

| 幕 | 节点 | 关键内容 | 选择 ID 及影响 |
|---|---|---|---|
| 1 | `act1_opening` | A 市深夜、高架与咖啡店 | 自动进入 `act1_cover_shift` |
| 1 | `act1_cover_shift` | 同事请求替班 | `refuse-shift`：勇气 +2；`accept-shift`：自我否定 +2；`ask-reason`：勇气 +1 |
| 1 | `act1_customer` | 客人打翻热咖啡 | `apologize`：自我否定 +1；`protect-self`：勇气 +2 |
| 1 | `act1_dazhuang` | 楼道啤酒对话 | `admit-tired`：大壮开放 +2；`say-fine`：自我否定 +1 |
| 2 | `act2_meeting` | 便利店捡硬币与热牛奶 | `accept-care`：依恋 +1；`avoid-care`：自我否定 +1 |
| 2 | `act2_shoes` | 小美送球鞋 | `ask-why-shoes`：勇气 +2、信任 +2；`thank-silently`：依恋 +2；`refuse-shoes`：自我否定 +2 |
| 3 | `act3_photo` | 小帅的江边照片 | `ask-xiaomei`：勇气 +2、信任 +1；`stay-silent`：自我否定 +2；`withdraw`：依恋 -1 |
| 3 | `act3_rose` | 小丽递白玫瑰 | `take-rose`：勇气 +2、小丽建议 +1；`return-rose`：自我否定 +1；`discard-rose`：依恋 -1 |
| 4 | `act4_invitation` | 小美邀请同行 | `say-yes`：勇气 +3、设 `saidYes`；`say-better-person`：设 `explicitlyRefused`；`ask-time`：设 `askedForTime` |
| 5 | `act5_phone` | 仓库时钟与来电 | `answer-phone`：勇气 +2、设 `answeredPhone`；`ignore-phone`：自我否定 +2；`send-message`：勇气 +1 |
| 5 | `act5_departure` | 是否离开商场 | `leave-before-nine`：设 `leftBeforeNine`；`run-after-nine`：设 `leftLate`；`stay-warehouse`：设 `stayedWarehouse` |
| 5 | `act5_platform` | 准时抵达后的最后对话 | `trust-and-go`：设 `startedJourney`；`question-xiaoshuai`：设 `arrivedBeforeNine`、`doubtedAtPlatform` |
| 5 | `act5_late_station` | 迟到的空站台 | 设 `arrivedAfterDeparture` 后进入解析点 |
| 5 | `act5_resolve` | 无展示文本 | `resolveEnding: true` |

每个选择节点前后至少写 4–8 句原作风格旁白或对白；共享节点可用 `variants` 根据 `acceptedShoes`、`askedXiaomei`、`broughtRose` 和隐藏属性提供不同文本。结局路由规则必须是：

字数预算必须落实到剧情文件：第一至第四幕每幕单路线 900–1200 个中文字符，第五幕加结局每条路线 1000–1500 个中文字符；自动化遍历得到的最短完整路线不少于 4500 个中文字符，以保证正常阅读和停顿后的 20–30 分钟体验。

```ts
// act5_departure 中的选择目标
const departureChoices = [
  { id: 'leave-before-nine', label: '现在就走', next: 'act5_platform', effects: { flags: ['leftBeforeNine', 'arrivedBeforeNine'] } },
  { id: 'run-after-nine', label: '九点二十，冲出去', next: 'act5_late_station', effects: { flags: ['leftLate', 'arrivedAfterDeparture'] } },
  { id: 'stay-warehouse', label: '把手机翻过去', next: 'act5_resolve', effects: { flags: ['stayedWarehouse'] } },
];
```

`act5_platform` 只有在玩家选择同行时写入 `startedJourney`；否则写入 `doubtedAtPlatform`。若第四幕已写入 `explicitlyRefused` 且玩家没有到站，解析器进入《更好的人》。

- [ ] **Step 5：定义结局内容和合并入口**

`src/story/endings.ts`：

```ts
import type { EndingId } from '../engine/types';

export interface Ending {
  id: EndingId;
  number: string;
  title: string;
  summary: string;
  epilogue: string[];
}

export const endings: Record<EndingId, Ending> = {
  'train-gone': { id: 'train-gone', number: '01', title: '列车已经开走', summary: '他终于向前跑，却还是晚了一步。', epilogue: ['站台空空荡荡。', '手机里只有一句：我等到列车开走。', '很多年后，他仍坐在最亮的便利店里，等一个不会再亮起的名字。'] },
  unanswered: { id: 'unanswered', number: '02', title: '无人接听', summary: '他让时钟替自己作出了选择。', epilogue: ['九点二十，手机终于安静下来。', '他没有离开仓库，也没有再问那列车开往哪里。', '余生最漫长的声音，是那晚没有接起的铃声。'] },
  'better-person': { id: 'better-person', number: '03', title: '更好的人', summary: '他把恐惧说成了成全。', epilogue: ['小美没有再等。', '他曾以为这是体面，后来才明白，那只是替自卑找到了一句好听的话。', '所谓更好的人，从来不是她想要的答案。'] },
  'platform-divide': { id: 'platform-divide', number: '04', title: '站台两端', summary: '他准时到了，却没能相信她。', epilogue: ['车门关闭前，小美最后看了他一眼。', '他们之间只隔着一层玻璃，却像隔着整座城市。', '这一次，他没有迟到；他只是仍旧没有伸手。'] },
  'next-city': { id: 'next-city', number: '05', title: '下一座城市', summary: '握住一次手，不等于学会相信。', epilogue: ['他们抵达了南方，也短暂拥有过一间能照进阳光的房子。', '小丑仍把所有委屈藏起来，把牺牲当成爱。', '多年后小美离开时说：我等过你很多次，不只是在南站。'] },
};

export const hiddenMonologue = '后来我终于明白，真正让我失去她的，从来不是那一班列车。是每一次有人伸手时，我都先替她决定，我不值得。';
```

`src/story/index.ts`：

```ts
import type { StoryNode } from '../engine/types';
import { act1 } from './act1';
import { act2 } from './act2';
import { act3 } from './act3';
import { act4 } from './act4';
import { act5 } from './act5';

export const story = Object.fromEntries(
  [...act1, ...act2, ...act3, ...act4, ...act5].map((node) => [node.id, node]),
) as Record<string, StoryNode>;
```

- [ ] **Step 6：运行剧情图和引擎测试**

Run: `npm test -- src/engine/validateStory.test.ts src/engine/storyEngine.test.ts`

Expected: 所有测试 PASS；剧情图错误数组为空；至少 10 个选择节点。

- [ ] **Step 7：提交完整剧情数据**

```powershell
git add src/story src/engine/validateStory.ts src/engine/validateStory.test.ts
git commit -m "feat: 编写五幕分支剧情与五个结局"
```

## Task 4：实现版本化自动存档与损坏恢复

**Files:**
- Create: `src/state/saveRepository.ts`
- Create: `src/state/saveRepository.test.ts`

- [ ] **Step 1：写失败测试**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialSave } from '../engine/initialState';
import { clearCurrentRoute, loadSave, writeSave } from './saveRepository';

beforeEach(() => localStorage.clear());

describe('saveRepository', () => {
  it('往返保存 UTF-8 剧情进度', () => {
    const save = createInitialSave();
    save.unlockedEndings = ['train-gone'];
    writeSave(save);
    expect(loadSave().unlockedEndings).toEqual(['train-gone']);
  });

  it('损坏存档时恢复默认值', () => {
    localStorage.setItem('lights-still-burning.save', '{坏掉');
    expect(loadSave()).toEqual(createInitialSave());
  });

  it('只清除当前路线并保留结局收藏', () => {
    const save = createInitialSave();
    save.progress = { nodeId: 'act3_photo', lineIndex: 0, stats: { courage: 1, attachment: 2, selfDenial: 0 }, relations: { xiaomeiTrust: 1, dazhuangOpenness: 0, xiaoliAdvice: 0 }, flags: [], completedActs: [1, 2] };
    save.unlockedEndings = ['unanswered'];
    expect(clearCurrentRoute(save)).toMatchObject({ progress: null, unlockedEndings: ['unanswered'] });
  });
});
```

- [ ] **Step 2：运行测试确认失败**

Run: `npm test -- src/state/saveRepository.test.ts`

Expected: FAIL，提示 `saveRepository` 不存在。

- [ ] **Step 3：实现仓储**

```ts
import { createInitialSave } from '../engine/initialState';
import type { SaveData } from '../engine/types';

const KEY = 'lights-still-burning.save';

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createInitialSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.unlockedEndings)) return createInitialSave();
    return parsed;
  } catch {
    return createInitialSave();
  }
}

export function writeSave(save: SaveData): void {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function clearCurrentRoute(save: SaveData): SaveData {
  return { ...save, progress: null };
}

export function clearCollection(save: SaveData): SaveData {
  return { ...save, progress: null, unlockedEndings: [] };
}
```

- [ ] **Step 4：运行测试并提交**

Run: `npm test -- src/state/saveRepository.test.ts`

Expected: 3 个测试 PASS。

```powershell
git add src/state
git commit -m "feat: 添加版本化本地存档"
```

## Task 5：建立 GameContext、推进动作与自动保存

**Files:**
- Create: `src/app/GameContext.tsx`
- Create: `src/app/GameContext.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1：写 Provider 失败测试**

```tsx
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameProvider, useGame } from './GameContext';

beforeEach(() => localStorage.clear());

describe('GameProvider', () => {
  it('开始故事、推进文本并应用选择', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <GameProvider>{children}</GameProvider>;
    const { result } = renderHook(() => useGame(), { wrapper });
    act(() => result.current.startNewGame());
    expect(result.current.save.progress?.nodeId).toBe('act1_opening');
    act(() => result.current.advance());
    expect(result.current.save.progress?.lineIndex).toBe(1);
  });
});
```

- [ ] **Step 2：运行测试确认失败**

Run: `npm test -- src/app/GameContext.test.tsx`

Expected: FAIL，提示 `GameContext` 不存在。

- [ ] **Step 3：实现 reducer 与公开动作**

`GameContext.tsx` 必须导出以下稳定接口：

```ts
interface GameApi {
  save: SaveData;
  currentNode: StoryNode | null;
  currentLines: DialogueLine[];
  currentEnding: EndingId | null;
  startNewGame(): void;
  continueGame(): void;
  advance(): void;
  choose(choiceId: string): void;
  restartFromAct(act: number): void;
  updateSettings(patch: Partial<Settings>): void;
  clearRoute(): void;
  clearAllProgress(): void;
  leaveEnding(): void;
}
```

Reducer 规则：

```ts
// advance
// 1. 当前行不是最后一行：lineIndex + 1
// 2. 节点有 choices：保持原位，等待 choose
// 3. 节点有 next：进入 next，lineIndex = 0
// 4. 节点 resolveEnding：调用 resolveEnding，写入 unlockedEndings
// 5. 从第 N 幕进入第 N+1 幕时，把 N 去重写入 completedActs

// choose
// 1. 在 currentNode.choices 中按 id 查找
// 2. 找不到时保持原状态并设置 recoverableError
// 3. 找到时调用 applyChoice
// 4. 每次 reducer 状态变化后 useEffect(writeSave)
```

章节重玩起点固定映射：

```ts
const ACT_STARTS: Record<number, string> = {
  1: 'act1_opening',
  2: 'act2_meeting',
  3: 'act3_photo',
  4: 'act4_invitation',
  5: 'act5_phone',
};
```

- [ ] **Step 4：在 App 顶层挂载 Provider**

```tsx
import { GameProvider } from './app/GameContext';

export default function App() {
  return <GameProvider><AppRouter /></GameProvider>;
}
```

`AppRouter` 暂时根据 `save.progress` 与 `currentEnding` 返回标题占位、游戏占位或结局占位；后续任务替换为真实 screen。

- [ ] **Step 5：运行测试并提交**

Run: `npm test -- src/app/GameContext.test.tsx src/engine`

Expected: Provider 与引擎测试全部 PASS。

```powershell
git add src/app src/App.tsx
git commit -m "feat: 添加游戏会话与自动保存"
```

## Task 6：实现逐字对白、场景舞台与关键选择

**Files:**
- Create: `src/components/TypewriterText.tsx`
- Create: `src/components/DialogueBox.tsx`
- Create: `src/components/ChoicePanel.tsx`
- Create: `src/components/StoryStage.tsx`
- Create: `src/components/StoryStage.test.tsx`
- Create: `src/screens/GameScreen.tsx`

- [ ] **Step 1：写交互失败测试**

```tsx
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StoryStage } from './StoryStage';

describe('StoryStage', () => {
  it('显示角色、对白并把选择 ID 传回引擎', async () => {
    const onChoose = vi.fn();
    render(<StoryStage scene="store" title="第二幕" line={{ speaker: '小美', text: '你的鞋湿了。' }} choices={[{ id: 'take-milk', label: '接过热牛奶', next: 'next' }]} onAdvance={vi.fn()} onChoose={onChoose} textSpeed="instant" reducedMotion={false} />);
    expect(screen.getByText('小美')).toBeInTheDocument();
    expect(screen.getByText('你的鞋湿了。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '接过热牛奶' }));
    expect(onChoose).toHaveBeenCalledWith('take-milk');
  });
});
```

- [ ] **Step 2：运行测试确认失败**

Run: `npm test -- src/components/StoryStage.test.tsx`

Expected: FAIL，提示 `StoryStage` 不存在。

- [ ] **Step 3：实现逐字文本**

`TypewriterText` 接口和时序：

```tsx
interface Props { text: string; speed: 'slow' | 'normal' | 'instant'; onDone(): void }
const intervalBySpeed = { slow: 55, normal: 32, instant: 0 } as const;
```

组件在 `text` 变化时重置；`instant` 直接显示全文；其他速度用 `setInterval` 每次增加一个 Unicode 字符，卸载时清理定时器。外层对话框第一次点击调用 `revealAll()`，第二次才调用 `onAdvance()`，避免误跳文本。

- [ ] **Step 4：实现语义化选择和舞台**

`ChoicePanel.tsx`：

```tsx
import type { Choice } from '../engine/types';

export function ChoicePanel({ choices, onChoose }: { choices: Choice[]; onChoose(id: string): void }) {
  return (
    <fieldset className="choice-panel">
      <legend className="sr-only">请选择你的回答</legend>
      {choices.map((choice, index) => (
        <button key={choice.id} type="button" className="choice-button" onClick={() => onChoose(choice.id)}>
          <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span>{choice.label}</span>
        </button>
      ))}
    </fieldset>
  );
}
```

`StoryStage` 使用 `<section aria-label="剧情场景">`，背景路径固定为 `/images/scenes/${scene}.webp`，并设置 CSS 自定义属性 `--scene-image`。图片加载失败时加上 `scene-fallback` 类，显示 CSS 渐变。仅当当前行已完整显示时渲染 `ChoicePanel`。

- [ ] **Step 5：实现 GameScreen 组合**

`GameScreen` 从 `useGame()` 读取当前节点、当前行、设置和动作；若节点不存在，调用 `clearRoute()` 并显示“存档已恢复到本章起点”的 `role="status"` 提示。键盘规则：空格/Enter 推进，数字键 1–3 选择，Escape 打开或关闭设置。

- [ ] **Step 6：运行测试并提交**

Run: `npm test -- src/components/StoryStage.test.tsx src/app/GameContext.test.tsx`

Expected: 所有交互测试 PASS。

```powershell
git add src/components src/screens/GameScreen.tsx
git commit -m "feat: 实现剧情阅读与选择交互"
```

## Task 7：实现标题页、顶部栏和设置面板

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/SettingsSheet.tsx`
- Create: `src/components/SettingsSheet.test.tsx`
- Create: `src/screens/TitleScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1：写设置面板失败测试**

```tsx
it('修改声音、文字速度并二次确认清除路线', async () => {
  const onSettings = vi.fn();
  const onClear = vi.fn();
  render(<SettingsSheet open settings={{ soundEnabled: false, masterVolume: 0.45, textSpeed: 'normal', reducedMotion: false }} onClose={vi.fn()} onSettings={onSettings} onClearRoute={onClear} onClearAll={vi.fn()} />);
  await userEvent.click(screen.getByRole('checkbox', { name: '开启声音' }));
  expect(onSettings).toHaveBeenCalledWith({ soundEnabled: true });
  await userEvent.click(screen.getByRole('button', { name: '清除当前路线' }));
  expect(screen.getByRole('button', { name: '确认清除当前路线' })).toBeInTheDocument();
});
```

- [ ] **Step 2：实现设置面板**

使用原生 `<dialog>` 或具备 `role="dialog" aria-modal="true"` 的面板。字段包括：开启声音、总音量、文字速度、减少动态效果。清除当前路线与清除全部收藏分别弹出独立二次确认；按 Escape 关闭并把焦点还给打开按钮。

- [ ] **Step 3：实现标题页**

标题页显示“灯火未熄”“有些人不是离开了才失去。”；无存档时主按钮为“开始故事”，有存档时为“继续雨夜”，并提供“从头开始”和“雨夜回忆”。声音开关不得在用户点击前创建 AudioContext。

- [ ] **Step 4：替换 AppRouter 占位**

```tsx
function AppRouter() {
  const { save, currentEnding } = useGame();
  if (currentEnding) return <EndingScreen />;
  if (save.progress) return <GameScreen />;
  return <TitleScreen />;
}
```

- [ ] **Step 5：验证与提交**

Run: `npm test -- src/components/SettingsSheet.test.tsx src/App.test.tsx`

Expected: 设置与标题页测试 PASS。

```powershell
git add src/components/TopBar.tsx src/components/SettingsSheet.tsx src/components/SettingsSheet.test.tsx src/screens/TitleScreen.tsx src/App.tsx
git commit -m "feat: 添加标题页与无障碍设置"
```

## Task 8：实现结局页、“雨夜回忆”和隐藏独白

**Files:**
- Create: `src/screens/EndingScreen.tsx`
- Create: `src/screens/MemoryScreen.tsx`
- Create: `src/screens/MemoryScreen.test.tsx`
- Modify: `src/app/GameContext.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1：写收藏失败测试**

```tsx
it('隐藏未解锁结局并在集齐后显示独白', () => {
  const { rerender } = render(<MemoryScreen unlocked={['train-gone']} onReplay={vi.fn()} onBack={vi.fn()} />);
  expect(screen.getByText('列车已经开走')).toBeInTheDocument();
  expect(screen.queryByText('下一座城市')).not.toBeInTheDocument();
  expect(screen.queryByText(/真正让我失去她/)).not.toBeInTheDocument();
  rerender(<MemoryScreen unlocked={['train-gone', 'unanswered', 'better-person', 'platform-divide', 'next-city']} onReplay={vi.fn()} onBack={vi.fn()} />);
  expect(screen.getByText(/真正让我失去她/)).toBeInTheDocument();
});
```

- [ ] **Step 2：实现结局页**

`EndingScreen` 显示结局编号、标题、summary、三段 epilogue，并提供“收下这张残票”“重回雨夜”按钮。进入结局时 Provider 已去重写入 `unlockedEndings`；离开结局只清空当前路线，不删除收藏。

- [ ] **Step 3：实现车票收藏**

`MemoryScreen` 按 `endings` 固定顺序渲染 5 张票。未解锁项的可访问名称统一为“尚未抵达”，不泄露标题；已解锁项显示标题和概要。重玩按钮提供第一至第五幕，只有 `completedActs` 曾包含该幕或至少通关一次时启用。

- [ ] **Step 4：接入 App 状态**

在 `App` 内增加轻量页面状态 `view: 'title' | 'memory' | 'game' | 'ending'`；存档中的 `progress` 只决定是否可继续，不替代页面状态。刷新时：存在进行中路线进入 game；否则进入 title。

- [ ] **Step 5：测试并提交**

Run: `npm test -- src/screens/MemoryScreen.test.tsx src/app/GameContext.test.tsx`

Expected: 收藏隐藏、全集解锁和章节重玩测试 PASS。

```powershell
git add src/screens/EndingScreen.tsx src/screens/MemoryScreen.tsx src/screens/MemoryScreen.test.tsx src/app/GameContext.tsx src/App.tsx
git commit -m "feat: 添加悲剧结局与雨夜回忆"
```

## Task 9：实现不依赖外部文件的程序化环境音

**Files:**
- Create: `src/audio/AudioDirector.ts`
- Create: `src/audio/AudioDirector.test.ts`
- Modify: `src/app/GameContext.tsx`
- Modify: `src/screens/GameScreen.tsx`

- [ ] **Step 1：写音频降级失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import { AudioDirector } from './AudioDirector';

function fakeAudioContext({ stop }: { stop: () => void }): AudioContext {
  const param = { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  const node = { connect: vi.fn(), disconnect: vi.fn() };
  return {
    state: 'running', currentTime: 0, sampleRate: 44100, destination: node,
    resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => ({ ...node, gain: { ...param } })),
    createBiquadFilter: vi.fn(() => ({ ...node, frequency: { ...param }, type: 'lowpass' })),
    createOscillator: vi.fn(() => ({ ...node, frequency: { ...param }, type: 'sine', start: vi.fn(), stop })),
    createBuffer: vi.fn(() => ({ getChannelData: () => new Float32Array(44100) })),
    createBufferSource: vi.fn(() => ({ ...node, buffer: null, loop: false, start: vi.fn(), stop })),
  } as unknown as AudioContext;
}

describe('AudioDirector', () => {
  it('浏览器拒绝 AudioContext 时保持静音且不抛错', async () => {
    const director = new AudioDirector(() => { throw new Error('blocked'); });
    await expect(director.enable()).resolves.toBe(false);
    expect(director.isEnabled()).toBe(false);
  });

  it('切换场景前停止旧声音层', async () => {
    const stop = vi.fn();
    const director = new AudioDirector(() => fakeAudioContext({ stop }));
    await director.enable();
    director.playAmbience('rain');
    director.playAmbience('train');
    expect(stop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2：实现 AudioDirector**

公开接口固定为：

```ts
export class AudioDirector {
  constructor(factory: () => AudioContext = () => new AudioContext()) {}
  async enable(): Promise<boolean> {}
  isEnabled(): boolean {}
  setVolume(value: number): void {}
  playAmbience(id: AmbienceId): void {}
  playDoorChime(): void {}
  stopAll(): void {}
  dispose(): void {}
}
```

实现规则：雨声用白噪声经过低通滤波，城市声使用更低频的滤波噪声，列车声使用 45–70Hz 缓慢扫频叠加噪声，门铃使用两个短促正弦振荡器。每次 `playAmbience` 先在 250ms 内淡出旧 master gain，再创建新层；`reducedMotion` 不影响音频。任何 Web Audio 异常都捕获并返回静音状态。

- [ ] **Step 3：按场景接入声音**

`GameScreen` 在 `currentNode.ambience` 变化且 `soundEnabled` 为真时调用 `playAmbience`。从便利店首次进入时播放一次门铃。标题页声音按钮的点击事件调用 `enable()`，成功后才把 `soundEnabled` 存为 true。

- [ ] **Step 4：测试并提交**

Run: `npm test -- src/audio/AudioDirector.test.ts`

Expected: 音频启用、切层和失败降级测试 PASS。

```powershell
git add src/audio src/app/GameContext.tsx src/screens/GameScreen.tsx
git commit -m "feat: 添加程序化雨夜环境音"
```

## Task 10：生成并优化七张电影感场景插画

**Files:**
- Create: `art/source/title.png`
- Create: `art/source/cafe.png`
- Create: `art/source/apartment.png`
- Create: `art/source/store.png`
- Create: `art/source/riverside.png`
- Create: `art/source/warehouse.png`
- Create: `art/source/station.png`
- Create: `scripts/optimize-images.mjs`
- Create: `public/images/scenes/*.webp`

- [ ] **Step 1：读取并使用 imagegen 技能**

所有图片使用同一视觉母提示词：

```text
电影感现实主义二维数字绘景，中国现代大城市 A 市的深夜雨季，深蓝黑与雾灰为主色，只有克制的琥珀灯光，潮湿空气、玻璃反射、雨丝和远处散景，孤独但不赛博朋克，不出现文字、标志、水印或清晰正脸，16:9 横向构图，主体居中偏上，底部 35% 保留暗色低细节区域供视觉小说对白框覆盖，所有场景保持同一镜头语言和色彩分级。
```

逐张追加以下场景描述并保存为对应文件：

- `title.png`：雨夜高架桥，车流像悬空的河，一个穿深色外套的年轻人背影站在商场后门。
- `cafe.png`：连锁咖啡店打烊后，空桌、翻倒的纸杯、操作台冷光，年轻店员独自清洁。
- `apartment.png`：旧公寓楼道尽头，两个人坐在窗边喝廉价啤酒，窗外只有空调外机。
- `store.png`：深夜便利店靠窗座位，一杯热牛奶、雨水模糊的灯、自动门暖光。
- `riverside.png`：江边远望城市灯火，风与雨掠过栏杆，人物保持遥远剪影。
- `warehouse.png`：商场仓库，墙上时钟接近九点，手机在纸箱旁发亮，空间压抑。
- `station.png`：南站末班车离开后的空站台，雨水痕迹、被踩脏的车票残角、远处尾灯。

- [ ] **Step 2：实现确定性的图片优化脚本**

`scripts/optimize-images.mjs`：

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceDir = path.resolve('art/source');
const outputDir = path.resolve('public/images/scenes');
const files = ['title', 'cafe', 'apartment', 'store', 'riverside', 'warehouse', 'station'];
await fs.mkdir(outputDir, { recursive: true });

for (const name of files) {
  await sharp(path.join(sourceDir, `${name}.png`))
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(outputDir, `${name}.webp`));
}
```

- [ ] **Step 3：运行优化并检查产物**

Run: `npm run optimize:images`

Expected: `public/images/scenes/` 下生成 7 个 1920×1080 WebP，每张小于 600KB。

- [ ] **Step 4：视觉检查**

逐张打开 WebP，确认没有乱码文字、水印、畸形人物或突兀亮区；在 375×812 裁切下，底部对白框不遮挡关键主体。任何不合格图片使用相同母提示词重新生成，不用 CSS 修补素材缺陷。

- [ ] **Step 5：提交插画与优化脚本**

```powershell
git add art/source public/images/scenes scripts/optimize-images.mjs
git commit -m "feat: 添加雨夜电影感场景插画"
```

## Task 11：完成电影感样式、响应式布局与无障碍

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Modify: `src/main.tsx`
- Modify: all files under `src/components/` and `src/screens/`

- [ ] **Step 1：定义语义设计令牌**

`src/styles/tokens.css`：

```css
:root {
  color-scheme: dark;
  --color-bg: #070d17;
  --color-surface: rgba(8, 14, 24, 0.88);
  --color-surface-solid: #111b2a;
  --color-text: #f1f5f9;
  --color-muted: #a9b5c6;
  --color-accent: #d8a15d;
  --color-accent-strong: #f0b96f;
  --color-border: rgba(216, 161, 93, 0.42);
  --color-focus: #f8cf91;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --radius-sm: 0.25rem;
  --duration-fast: 160ms;
  --duration-normal: 260ms;
  --font-literary: "Noto Serif SC", "Songti SC", STSong, serif;
  --font-ui: Inter, "Microsoft YaHei", system-ui, sans-serif;
}
```

- [ ] **Step 2：实现全局布局和状态样式**

`global.css` 必须包含：`box-sizing` 重置、100dvh 舞台、底部安全区 `env(safe-area-inset-bottom)`、最大正文行宽 42rem、选择按钮最小高度 52px、可见 `:focus-visible`、`.sr-only`、场景渐变降级、逐字光标、dialog 遮罩、车票残角、375px/768px/1100px 三档布局。

减少动态效果规则必须明确覆盖：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3：接入样式并完成组件语义检查**

在 `src/main.tsx` 中按顺序导入 `tokens.css` 和 `global.css`。逐个确认：按钮使用 `<button>`；设置字段有 `<label>`；装饰图片 `aria-hidden="true"`；场景名和角色名不靠颜色区分；所有 icon-only 按钮都有 `aria-label`；焦点顺序与视觉顺序一致。

- [ ] **Step 4：运行组件测试和生产构建**

Run: `npm test && npm run build`

Expected: 所有单元/组件测试 PASS；TypeScript 无错误；生产构建成功。

- [ ] **Step 5：人工响应式检查并提交**

Run: `npm run dev -- --host 127.0.0.1`

检查 375×812、768×1024、1440×900；确保对白不溢出、按钮不被安全区遮挡、桌面正文不超过 42rem、减少动态效果时没有雨幕位移动画。

```powershell
git add src/styles src/main.tsx src/components src/screens
git commit -m "style: 完成电影感响应式界面"
```

## Task 12：端到端验证五个结局、续玩与离线构建

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/game.spec.ts`
- Modify: `package.json` if the local Chrome channel needs adjustment

- [ ] **Step 1：配置 Playwright 使用本机 Chrome**

`playwright.config.ts`：

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
```

- [ ] **Step 2：写首周目和续玩测试**

`e2e/game.spec.ts` 使用可访问名称点击，不使用脆弱 CSS 选择器：

```ts
import { expect, test } from '@playwright/test';

test('刷新后从同一选择继续且首周目没有回退', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始故事' }).click();
  await page.getByRole('button', { name: /答应替班/ }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /第一幕/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /上一步|回退/ })).toHaveCount(0);
});
```

- [ ] **Step 3：为五个结局建立路线表**

在同一测试文件定义每条路线的 choice ID 序列，通过页面按钮的 `data-choice-id` 执行：

```ts
const routes = {
  'train-gone': ['accept-shift', 'apologize', 'say-fine', 'accept-care', 'thank-silently', 'stay-silent', 'take-rose', 'ask-time', 'ignore-phone', 'run-after-nine'],
  unanswered: ['accept-shift', 'apologize', 'say-fine', 'avoid-care', 'refuse-shoes', 'withdraw', 'discard-rose', 'ask-time', 'ignore-phone', 'stay-warehouse'],
  'better-person': ['ask-reason', 'protect-self', 'admit-tired', 'accept-care', 'ask-why-shoes', 'ask-xiaomei', 'take-rose', 'say-better-person', 'send-message', 'stay-warehouse'],
  'platform-divide': ['refuse-shift', 'protect-self', 'admit-tired', 'accept-care', 'thank-silently', 'stay-silent', 'take-rose', 'ask-time', 'answer-phone', 'leave-before-nine', 'question-xiaoshuai'],
  'next-city': ['refuse-shift', 'protect-self', 'admit-tired', 'accept-care', 'ask-why-shoes', 'ask-xiaomei', 'take-rose', 'say-yes', 'answer-phone', 'leave-before-nine', 'trust-and-go'],
} as const;
```

对每条路线清除 `localStorage`、重新开始、依序点击，断言对应结局标题可见并出现在“雨夜回忆”。若路线 ID 与 Task 3 内容不一致，必须修改剧情节点使其与此表一致，不能在测试里绕过真实交互。

- [ ] **Step 4：测试全集解锁和隐藏独白**

完成五条路线后断言收藏显示 `5 / 5`，并出现“真正让我失去她的，从来不是那一班列车”。同时拦截所有网络请求，除当前站点资源外全部 abort，证明游戏不依赖第三方网络。

- [ ] **Step 5：执行完整验证**

Run: `npm test`

Expected: 全部 Vitest 测试 PASS。

Run: `npm run build`

Expected: TypeScript 与 Vite 构建成功，`dist/` 包含所有本地插画。

Run: `npm run test:e2e`

Expected: mobile 与 desktop 项目中，首周目、续玩、5 个结局、全集收藏和离线网络拦截全部 PASS。

- [ ] **Step 6：最终人工验收**

按设计文档逐项确认：一次常规路线为 20–30 分钟；约 10 个关键选择；隐藏属性从未显示；声音首次由用户开启且随时可静音；插画失败有 CSS 降级；清除操作需二次确认；键盘和 375px 触控均可完成整局。

- [ ] **Step 7：提交端到端验收**

```powershell
git add playwright.config.ts e2e package.json package-lock.json
git commit -m "test: 覆盖五结局与离线游玩流程"
```

## Task 13：最终质量审查与交付

**Files:**
- Modify only files found defective during the checks below

- [ ] **Step 1：运行全量验证并记录真实结果**

Run: `npm test && npm run build && npm run test:e2e`

Expected: 三条命令退出码均为 `0`，不得用旧日志或单项测试替代。

- [ ] **Step 2：检查编码和未完成标记**

```powershell
$utf8 = [System.Text.UTF8Encoding]::new($false, $true)
Get-ChildItem src,docs -Recurse -File | Where-Object Extension -in '.ts','.tsx','.css','.md','.json' | ForEach-Object { $null = $utf8.GetString([IO.File]::ReadAllBytes($_.FullName)) }
$unfinished = @('T' + 'BD', 'T' + 'ODO', 'FIX' + 'ME', '\\u[0-9a-fA-F]{4}') -join '|'
rg -n $unfinished src docs
```

Expected: UTF-8 解码无异常；`rg` 无未完成标记和中文 Unicode 转义。

- [ ] **Step 3：检查工作区与差异**

Run: `git status --short && git diff --check`

Expected: 只有有意保留的 `.superpowers/` 可视化临时目录未跟踪；没有空白错误或意外修改。

- [ ] **Step 4：修复检查发现的问题并重新运行相关测试**

每个修复先增加能复现问题的测试，再写最小修复，最后运行该测试与全量测试。不得只改实现而没有回归覆盖。

- [ ] **Step 5：提交最终修复**

```powershell
git diff --name-only | ForEach-Object { git add -- $_ }
git commit -m "fix: 完成交付前质量审查"
```

若 Step 4 没有发现任何问题，则不创建空提交。
