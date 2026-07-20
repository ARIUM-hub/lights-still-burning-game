import { describe, expect, it } from 'vitest'

import { endings, hiddenMonologue } from '../story/endings'
import { story, storyNodes } from '../story'
import {
  buildStory,
  enumeratePathCharacterCounts,
  validateStory,
} from './validateStory'
import type { EndingId, StoryNode } from './types'

const endingIds: EndingId[] = [
  'train-gone',
  'unanswered',
  'better-person',
  'platform-divide',
  'next-city',
]

function minimalNode(
  id: string,
  overrides: Partial<StoryNode> = {},
): StoryNode {
  return {
    id,
    act: 1,
    title: id,
    scene: 'cafe',
    ambience: 'rain',
    lines: [{ text: '最小正文' }],
    ...overrides,
  }
}

describe('剧情图', () => {
  it('通过全部结构校验', () => {
    expect(validateStory(story)).toEqual([])
  })

  it('精确包含十七个节点、十一个选择节点和一个结局解析节点', () => {
    expect(storyNodes).toHaveLength(17)
    expect(new Set(storyNodes.map((node) => node.act))).toEqual(
      new Set([1, 2, 3, 4, 5]),
    )
    expect(storyNodes.filter((node) => node.choices?.length)).toHaveLength(11)
    expect(storyNodes.filter((node) => node.resolveEnding)).toHaveLength(1)
  })

  it('报告剧情记录的 key 与节点 ID 不一致', () => {
    const errors = validateStory({
      act1_opening: minimalNode('wrong-opening-id', {
        resolveEnding: true,
      }),
    })

    expect(errors).toContain(
      '节点键 act1_opening 与节点 ID wrong-opening-id 不一致',
    )
  })

  it('报告自动后继指向不存在的节点', () => {
    const errors = validateStory({
      act1_opening: minimalNode('act1_opening', {
        next: 'missing-next',
      }),
    })

    expect(errors).toContain(
      '节点 act1_opening 的后继 missing-next 不存在',
    )
  })

  it('报告选择后继指向不存在的节点', () => {
    const errors = validateStory({
      act1_opening: minimalNode('act1_opening', {
        choices: [
          {
            id: 'missing-choice',
            label: '走向不存在的节点',
            next: 'missing-choice-next',
          },
        ],
      }),
    })

    expect(errors).toContain(
      '节点 act1_opening 的后继 missing-choice-next 不存在',
    )
  })

  it('报告没有后继的非结局死路', () => {
    const errors = validateStory({
      act1_opening: minimalNode('act1_opening'),
    })

    expect(errors).toContain('非结局节点 act1_opening 是死路')
  })

  it('报告从开场无法到达的节点', () => {
    const errors = validateStory({
      act1_opening: minimalNode('act1_opening', {
        resolveEnding: true,
      }),
      hidden_node: minimalNode('hidden_node', { resolveEnding: true }),
    })

    expect(errors).toContain('节点 hidden_node 从 act1_opening 不可达')
  })

  it('所有后继存在、没有非结局死路，且开场可达全部节点', () => {
    const errors = validateStory(story)

    expect(errors.filter((error) => error.includes('后继'))).toEqual([])
    expect(errors.filter((error) => error.includes('死路'))).toEqual([])
    expect(errors.filter((error) => error.includes('不可达'))).toEqual([])
  })

  it('构建剧情时明确拒绝重复节点 ID', () => {
    const duplicate: StoryNode = {
      id: 'duplicate-node',
      act: 1,
      title: '重复节点',
      scene: 'cafe',
      ambience: 'rain',
      lines: [{ text: '重复内容' }],
      resolveEnding: true,
    }

    expect(() => buildStory([duplicate, { ...duplicate }])).toThrowError(
      /duplicate-node/,
    )
  })

  it('收录五个编号、标题和内容完整的悲剧结局', () => {
    expect(Object.keys(endings).sort()).toEqual([...endingIds].sort())
    expect(endingIds.map((id) => endings[id].title)).toEqual([
      '列车已经开走',
      '无人接听',
      '更好的人',
      '站台两端',
      '下一座城市',
    ])
    expect(endingIds.map((id) => endings[id].number)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
    ])
    for (const id of endingIds) {
      expect(endings[id].id).toBe(id)
      expect(endings[id].summary.trim().length).toBeGreaterThan(0)
      expect(endings[id].epilogue.length).toBeGreaterThanOrEqual(5)
      expect(endings[id].epilogue.every((paragraph) => paragraph.trim().length > 0)).toBe(true)
    }
    expect(hiddenMonologue).toContain(
      '真正让我失去她的，从来不是那一班列车',
    )
  })

  it('询问小美但没有带花时也有专属后续文本', () => {
    const afterRose = story.act3_after_rose
    const askedWithoutRose = afterRose.variants?.find(
      (variant) =>
        variant.when.flagsAll?.includes('askedXiaomei') &&
        variant.when.flagsNone?.includes('broughtRose'),
    )

    expect(askedWithoutRose?.lines.length).toBeGreaterThanOrEqual(4)
  })

  it('每条完整路线都有足够支撑二十至三十分钟阅读的正文', () => {
    const terminalCharacters = Math.min(
      ...endingIds.map(
        (id) =>
          endings[id].summary.length + endings[id].epilogue.join('').length,
      ),
    )
    const counts = enumeratePathCharacterCounts(story, terminalCharacters)

    expect(counts.length).toBeGreaterThan(0)
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(4500)
  })

  it('路径枚举遇到循环时抛出包含循环节点的错误', () => {
    const cyclicStory = buildStory([
      minimalNode('act1_opening', { next: 'loop-node' }),
      minimalNode('loop-node', { next: 'act1_opening' }),
    ])

    expect(() =>
      enumeratePathCharacterCounts(cyclicStory, 0),
    ).toThrowError(/循环.*act1_opening/)
  })

  it('路径字符数不计算选择标签', () => {
    const storyWithLabel = (label: string) =>
      buildStory([
        minimalNode('act1_opening', {
          choices: [
            {
              id: 'only-choice',
              label,
              next: 'terminal',
            },
          ],
        }),
        minimalNode('terminal', { resolveEnding: true }),
      ])

    const shortLabelCounts = enumeratePathCharacterCounts(
      storyWithLabel('走'),
      20,
    )
    const longLabelCounts = enumeratePathCharacterCounts(
      storyWithLabel('这是一段刻意写得很长很长的选择标签'),
      20,
    )

    expect(longLabelCounts).toEqual(shortLabelCounts)
  })
})
