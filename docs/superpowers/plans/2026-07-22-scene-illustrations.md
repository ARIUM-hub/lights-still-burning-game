# 《灯火未熄》场景插画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development when explicitly needed for independent tasks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 低频串行生成并接入七张精美电影感场景插画，验证手机端游戏后部署到 GitHub Pages。

**Architecture:** 即梦只负责生成六张新图并提供已确认的便利店原图，所有原始素材保存在 `art/source/`。项目内使用一个确定性的 Sharp 脚本统一产出 1920×1080 WebP；现有 `StoryStage` 继续按 `SceneId` 自动加载，不改变剧情引擎或组件接口。

**Tech Stack:** 即梦图片 4.0、React 19、TypeScript、Vite、Vitest、Sharp、Playwright、GitHub Actions Pages

---

### Task 1: 固化生成提示词与资产清单

**Files:**
- Create: `art/prompts/scene-prompts.md`

- [ ] **Step 1: 写入统一母提示词**

在 `art/prompts/scene-prompts.md` 写入：

```markdown
# 《灯火未熄》场景插画提示词

生成设置：即梦图片 4.0、图片模式、16:9、高清 2K；每次只生成一张。

## 统一母提示词

只生成一张图片，不生成视频或文案。16:9 横向视觉小说场景插画，达到精细商业叙事插画成片质量。电影感都市现实主义二维数字绘景，现代中国大城市 A 市的深夜雨季。构图具有明确的前景、中景和背景层次，叙事物件清晰但不刻意摆拍；建筑透视准确，人物比例与手部结构自然。深蓝黑与雾灰为主色，只有克制的琥珀暖光；光源方向统一，明暗过渡细腻，暗部保留纹理而不死黑。潮湿空气、细密雨丝、湿润地面倒影、玻璃反射、布料褶皱、墙面与金属材质都具有丰富但克制的细节。远处散景和轻微电影颗粒，35mm 电影镜头，宽容度高、焦点层次自然，安静、孤独、克制而忧伤，不是赛博朋克。人物使用侧后方中远景、侧影或背影，不展示清晰正脸，不直视镜头。主体位于画面中上部，底部约 35% 保留深色低细节区域供游戏对白框覆盖。不要夸张表情，不要僵硬摆拍，不要塑料质感，不要过度锐化，不要高饱和霓虹，不要日漫大眼睛，不要欧美城市，不要文字，不要乱码招牌，不要品牌标志，不要水印，不要边框，不要对白框。所有场景保持一致的镜头语言、人物比例、细节密度、色彩分级和雨夜质感。

## cafe

连锁咖啡店打烊后的空旷内景，玻璃窗外能看见雨夜高架和流动尾灯。操作台冷光、咖啡机白汽、几张空桌和一只翻倒但没有标志的纸杯。一名穿深色旧制服的年轻店员独自弯腰清洁，肩膀略微下沉，只出现侧后方身影。画面重点是疲惫、过度懂事和城市不会为任何人停下。

## apartment

狭窄老旧公寓的楼道尽头，一扇小窗外只有邻楼空调外机，暖黄灯泡与高架车灯从窗缝掠过。两名从小地方来到城市的年轻男人并肩坐在窗边台阶上，各拿一罐最便宜的无标识啤酒；其中一人低头捏皱铝罐。墙面潮湿斑驳，空间逼仄但关系安静，不展示清晰正脸。

## store

复用已确认成图：深夜便利店靠窗吧台，一杯冒着热气的牛奶和一桶泡面，穿浅米色毛衣的年轻女人把硬币放回穿深色旧外套的年轻男人掌心；窗外大雨、城市散景与积水倒影。

## riverside

雨后灰蓝色江面与被风吹斜的芦苇，远处是 A 市克制的灯火和桥梁轮廓。画面像一张被年轻摄影者拍下的照片：一名穿浅色长外套的年轻女人站在江边栏杆附近回头，但距离很远，只保留轮廓和被风带起的衣摆；另一个拍摄者不入镜。整体美丽但疏离，让观看者产生自己不属于画面的感觉。

## warehouse

商场咖啡店后方的狭窄仓库，堆叠纸箱、无标识纸杯箱和金属货架形成压迫透视。墙上指针时钟接近九点，纸箱旁一部手机亮起但屏幕没有文字，一只半藏在更衣柜旁的旧行李袋。年轻店员站在仓库门与货架之间，手搭在行李袋提手上，像正在决定离开还是继续盘点。

## street

医院急诊楼外的雨夜街口与地铁出口，小型花摊的透明塑料雨棚积着水，桶里有一枝略微卷边的白玫瑰；远处救护车红光掠过湿墙和路面，但不出现医院或药店文字。一名栗色头发的年轻女摊主把白玫瑰递向穿深色旧外套的年轻男人，两人保持中远景侧影。场景同时能承接花摊劝告和医院外告别，悲伤但不煽情。

## station

A 市南站末班车离开后的空站台和明亮却冷清的候车空间，远处只有列车尾灯消失在雨幕中。地面有雨水脚印和一张被踩脏的车票残角，不出现可读车次、站名或广告。一名裤脚与鞋都湿透的年轻男人停在站台中央喘息，身体很小，大片空旷空间强调迟到和无法追回。
```

- [ ] **Step 2: 检查 UTF-8 与场景清单**

Run:

```powershell
$p = 'art/prompts/scene-prompts.md'
$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $p))
$hasBom = $bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191
if ($hasBom) { throw '提示词文件不应包含 UTF-8 BOM' }
rg -n '^## (cafe|apartment|store|riverside|warehouse|street|station)$' $p
```

Expected: 输出七个场景标题，命令退出码为 0。

- [ ] **Step 3: 提交提示词**

```powershell
git add art/prompts/scene-prompts.md
git commit -m "docs: 固化场景插画提示词"
```

### Task 2: 先写场景资产验收测试

**Files:**
- Create: `src/assets/sceneAssets.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { stat } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const sceneIds = [
  'cafe',
  'apartment',
  'store',
  'riverside',
  'warehouse',
  'street',
  'station',
] as const

describe.each(sceneIds)('场景插画 %s', (sceneId) => {
  it('是可解码的 1920×1080 WebP 且小于 600KB', async () => {
    const filePath = path.resolve(
      'public',
      'images',
      'scenes',
      `${sceneId}.webp`,
    )
    const [fileStat, metadata] = await Promise.all([
      stat(filePath),
      sharp(filePath).metadata(),
    ])

    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(1920)
    expect(metadata.height).toBe(1080)
    expect(fileStat.size).toBeLessThanOrEqual(600 * 1024)
  })
})
```

- [ ] **Step 2: 运行测试并确认因图片缺失而失败**

Run:

```powershell
npx vitest run src/assets/sceneAssets.test.ts
```

Expected: 7 个测试失败，错误为 `ENOENT`，证明测试确实覆盖尚未存在的七张图片。

- [ ] **Step 3: 提交失败测试**

```powershell
git add src/assets/sceneAssets.test.ts
git commit -m "test: 定义七张场景插画验收标准"
```

### Task 3: 低频串行生成并保存七张 2K 源图

**Files:**
- Create: `art/source/cafe.png`
- Create: `art/source/apartment.png`
- Create: `art/source/store.png`
- Create: `art/source/riverside.png`
- Create: `art/source/warehouse.png`
- Create: `art/source/street.png`
- Create: `art/source/station.png`

- [ ] **Step 1: 保存已确认的便利店 2K 原图**

在现有即梦生成记录中打开 `store` 成图并使用平台下载入口。若出现账号级水印或法律声明设置，不改变开关，暂停并向用户确认。下载完成后通过 Sharp 解码并重新编码为无损 PNG，保存到 `art/source/store.png`；转换只统一容器格式，不裁切、不修饰、也不移除平台要求保留的标识。

- [ ] **Step 2: 逐张生成剩余六个场景**

严格按 `cafe → apartment → riverside → warehouse → street → station` 顺序执行。每张都使用 Task 1 的完整母提示词加对应追加提示词，设置为图片 4.0、16:9、高清 2K、单张生成。每次页面显示“图片生成完成”并通过 Step 3 检查后，才提交下一张；不得同时排队。

- [ ] **Step 3: 每张完成后做画面检查**

每张逐项确认：

```text
比例 16:9；前中后景明确；冷暖光源一致；底部约 35% 为低细节；
关键叙事物件清楚；人物比例和手部自然；无清晰正脸；
无文字、乱码、品牌、水印、塑料质感、过曝高光或死黑暗部。
```

若仅一个缺陷不合格，使用“保留其余构图，只修正该缺陷”的定向提示最多重生成一次。遇到限流、验证码或第二次失败立即停止，不继续提交其余任务。

- [ ] **Step 4: 下载并规范命名源文件**

每张通过后使用平台下载入口保存 2K 原图，再通过 Sharp 解码并重新编码为无损 PNG，依次写入 `art/source/cafe.png`、`art/source/apartment.png`、`art/source/riverside.png`、`art/source/warehouse.png`、`art/source/street.png` 和 `art/source/station.png`。不得通过改扩展名伪装格式，不得删除平台要求保留的标识。

- [ ] **Step 5: 验证七个源文件的像素尺寸**

Run:

```powershell
@'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const scenes = ['cafe', 'apartment', 'store', 'riverside', 'warehouse', 'street', 'station']
for (const scene of scenes) {
  const file = path.resolve('art/source', `${scene}.png`)
  await fs.access(file)
  const metadata = await sharp(file).metadata()
  if ((metadata.width ?? 0) < 1920 || (metadata.height ?? 0) < 1080) {
    throw new Error(`${scene} 源图尺寸不足：${metadata.width}×${metadata.height}`)
  }
  console.log(`${scene}: ${metadata.width}×${metadata.height}`)
}
'@ | node --input-type=module -
```

Expected: 七行尺寸均至少为 1920×1080，退出码为 0。

### Task 4: 实现确定性的 WebP 优化脚本

**Files:**
- Create: `scripts/optimize-images.mjs`
- Modify: `package.json`

- [ ] **Step 1: 创建优化脚本**

```js
import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const scenes = [
  'cafe',
  'apartment',
  'store',
  'riverside',
  'warehouse',
  'street',
  'station',
]
const sourceDir = path.resolve('art/source')
const outputDir = path.resolve('public/images/scenes')
const maximumBytes = 600 * 1024

await fs.mkdir(outputDir, { recursive: true })

for (const scene of scenes) {
  const source = path.join(sourceDir, `${scene}.png`)
  await fs.access(source)
  const pipeline = sharp(source)
    .rotate()
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })

  let output
  let finalQuality = 82

  for (let quality = 82; quality >= 68; quality -= 2) {
    const candidate = await pipeline
      .clone()
      .webp({ quality, effort: 6 })
      .toBuffer()

    output = candidate
    finalQuality = quality
    if (candidate.length <= maximumBytes) break
  }

  if (output.length > maximumBytes) {
    throw new Error(`${scene} 在质量 68 时仍超过 600KB`)
  }

  await fs.writeFile(path.join(outputDir, `${scene}.webp`), output)
  console.log(`${scene}: ${output.length} bytes, quality ${finalQuality}`)
}
```

- [ ] **Step 2: 确认 package script**

`package.json` 已有以下脚本；若内容不同，将其改为：

```json
"optimize:images": "node scripts/optimize-images.mjs"
```

- [ ] **Step 3: 运行优化脚本**

Run:

```powershell
npm run optimize:images
```

Expected: 输出七行场景名、文件大小和最终质量，命令退出码为 0。

- [ ] **Step 4: 重新运行资产测试**

Run:

```powershell
npx vitest run src/assets/sceneAssets.test.ts
```

Expected: 7 tests passed。

- [ ] **Step 5: 提交源图、优化脚本和 WebP**

```powershell
git add art/source scripts/optimize-images.mjs package.json public/images/scenes src/assets/sceneAssets.test.ts
git commit -m "feat: 添加七张电影感场景插画"
```

### Task 5: 在游戏中做桌面与手机视觉验收

**Files:**
- Verify: `src/components/StoryStage.tsx`
- Verify: `src/styles/global.css`
- Verify: `public/images/scenes/*.webp`

- [ ] **Step 1: 启动本地应用**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite 输出本地 URL，页面可打开。

- [ ] **Step 2: 检查七张图的加载路径**

依次进入覆盖 `cafe`、`apartment`、`store`、`riverside`、`street`、`warehouse` 和 `station` 的剧情节点，确认浏览器没有图片 404、解码错误或布局抖动。

- [ ] **Step 3: 检查手机视口**

在 375×812 视口完成至少一条路线，确认：

```text
无横向滚动；标题和对白可读；选择按钮可点击；
主体不被对白框遮挡；关键物件仍在可见区域；
图片加载失败的 CSS 降级路径仍可完整操作。
```

- [ ] **Step 4: 检查桌面视口**

在 1440×900 视口检查同一路线，确认背景覆盖完整、不过度拉伸，暗部仍保留细节。

- [ ] **Step 5: 只在必要时调整图片位置**

如果个别场景在手机裁切中遮挡关键物件，只为该场景新增 `object-position` 规则；不得改变 StoryStage 的资源接口，也不得用 CSS 掩盖图片本身的乱码、畸形或水印。

### Task 6: 全量验证与生产构建

**Files:**
- Verify: all tracked project files

- [ ] **Step 1: 运行全部单元测试**

Run:

```powershell
npm test
```

Expected: 所有测试通过，0 failures。

- [ ] **Step 2: 运行默认生产构建**

Run:

```powershell
npm run build
```

Expected: TypeScript 和 Vite 构建成功，退出码为 0。

- [ ] **Step 3: 运行 Pages 生产构建**

Run:

```powershell
npm run build:pages
```

Expected: `dist/` 使用 `/lights-still-burning-game/` 基础路径构建成功。

- [ ] **Step 4: 检查提交内容和编码**

Run:

```powershell
git diff --check
git status --short
```

Expected: 无空白错误；只包含本功能预期文件。

- [ ] **Step 5: 提交必要的视觉适配**

如果 Task 5 修改了样式或测试：

```powershell
git add src/styles/global.css src/styles/styles.test.ts
git commit -m "style: 优化场景插画移动端构图"
```

若 Task 5 无文件改动则跳过此提交。

### Task 7: 推送并验证 GitHub Pages

**Files:**
- Verify: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: 推送当前分支**

Run:

```powershell
git push origin codex/lights-still-burning-game
```

Expected: 推送成功且远程分支更新到本地最新提交。

- [ ] **Step 2: 低频等待单个 Pages 工作流**

只检查本次推送触发的一次工作流，不循环刷新、不并发查询。等待 `Deploy GitHub Pages` 的 `build` 和 `deploy` 两个 job 完成；若失败，只读取一次失败日志并定位原因。

- [ ] **Step 3: 验证线上链接**

打开：

```text
https://arium-hub.github.io/lights-still-burning-game/
```

确认首页、开始故事、至少三个连续场景、图片请求和手机布局正常。若 Pages 返回权限或 404，停止并报告仓库 Pages 设置状态，不重复部署。

- [ ] **Step 4: 交付**

向用户提供手机可访问链接、七张图片清单、测试与构建结果，以及任何仍存在的视觉限制。
