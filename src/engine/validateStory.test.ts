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

function terminalCharacterCounts(
  defaultCount: number,
  overrides: Partial<Record<EndingId, number>> = {},
): Record<EndingId, number> {
  return {
    'train-gone': defaultCount,
    unanswered: defaultCount,
    'better-person': defaultCount,
    'platform-divide': defaultCount,
    'next-city': defaultCount,
    ...overrides,
  }
}

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

  it('报告结局解析节点仍设置自动后继', () => {
    const errors = validateStory({
      act1_opening: minimalNode('act1_opening', {
        resolveEnding: true,
        next: 'after-ending',
      }),
      'after-ending': minimalNode('after-ending', {
        resolveEnding: true,
      }),
    })

    expect(errors).toContain(
      '结局解析节点 act1_opening 不能设置 next',
    )
  })

  it('报告结局解析节点仍设置选择后继', () => {
    const errors = validateStory({
      act1_opening: minimalNode('act1_opening', {
        resolveEnding: true,
        choices: [
          {
            id: 'continue-after-ending',
            label: '结局后继续',
            next: 'after-ending',
          },
        ],
      }),
      'after-ending': minimalNode('after-ending', {
        resolveEnding: true,
      }),
    })

    expect(errors).toContain(
      '结局解析节点 act1_opening 不能设置 choices',
    )
  })

  it('报告普通节点同时设置自动后继和选择后继', () => {
    const errors = validateStory({
      act1_opening: minimalNode('act1_opening', {
        next: 'automatic-target',
        choices: [
          {
            id: 'manual-target',
            label: '选择另一条路',
            next: 'choice-target',
          },
        ],
      }),
      'automatic-target': minimalNode('automatic-target', {
        resolveEnding: true,
      }),
      'choice-target': minimalNode('choice-target', {
        resolveEnding: true,
      }),
    })

    expect(errors).toContain(
      '剧情节点 act1_opening 不能同时设置 next 和 choices',
    )
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

  it('无人接听兼容曾接起电话或发过消息后仍留在仓库的路线', () => {
    const unansweredText = [
      endings.unanswered.summary,
      ...endings.unanswered.epilogue,
    ].join('')

    expect(unansweredText).toContain('可能接起过')
    expect(unansweredText).toContain('发过一行字')
    expect(unansweredText).not.toContain('从未接起任何一通')
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
    const terminalCharacters = Object.fromEntries(
      endingIds.map((id) => [
        id,
        endings[id].summary.length + endings[id].epilogue.join('').length,
      ]),
    ) as Record<EndingId, number>
    const counts = enumeratePathCharacterCounts(story, terminalCharacters)

    expect(counts).toHaveLength(23328)
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(4500)
  })

  it('路径统计使用当前状态匹配到的短变体而不是长基础文本', () => {
    const variantStory = buildStory([
      minimalNode('act1_opening', {
        lines: [{ text: '开场' }],
        choices: [
          {
            id: 'choose-short',
            label: '选择短文本',
            next: 'variant-node',
            effects: { flags: ['shortVersion'] },
          },
        ],
      }),
      minimalNode('variant-node', {
        lines: [{ text: '这是一段不会被选中的很长很长基础文本' }],
        variants: [
          {
            when: { flagsAll: ['shortVersion'] },
            lines: [{ text: '短' }],
          },
        ],
        next: 'terminal',
      }),
      minimalNode('terminal', {
        lines: [{ text: '终点' }],
        resolveEnding: true,
      }),
    ])

    expect(
      enumeratePathCharacterCounts(
        variantStory,
        terminalCharacterCounts(7),
      ),
    ).toEqual([12])
  })

  it('不同选择进入同一节点时按各自旗标统计不同文本', () => {
    const branchedStory = buildStory([
      minimalNode('act1_opening', {
        lines: [{ text: '开场' }],
        choices: [
          {
            id: 'choose-short',
            label: '短文本',
            next: 'shared-node',
            effects: { flags: ['shortVersion'] },
          },
          {
            id: 'choose-base',
            label: '基础文本',
            next: 'shared-node',
          },
        ],
      }),
      minimalNode('shared-node', {
        lines: [{ text: '较长的基础文本' }],
        variants: [
          {
            when: { flagsAll: ['shortVersion'] },
            lines: [{ text: '短' }],
          },
        ],
        next: 'terminal',
      }),
      minimalNode('terminal', {
        lines: [{ text: '终点' }],
        resolveEnding: true,
      }),
    ])

    const counts = enumeratePathCharacterCounts(
      branchedStory,
      terminalCharacterCounts(0),
    )

    expect([...counts].sort((left, right) => left - right)).toEqual([5, 11])
  })

  it('解析点按真实结局加入各自的结局字符数', () => {
    const endingStory = buildStory([
      minimalNode('act1_opening', {
        lines: [{ text: '开场' }],
        choices: [
          {
            id: 'arrive-late',
            label: '迟到',
            next: 'terminal',
            effects: { flags: ['arrivedAfterDeparture'] },
          },
          {
            id: 'remain',
            label: '留下',
            next: 'terminal',
          },
        ],
      }),
      minimalNode('terminal', {
        lines: [{ text: '终点' }],
        resolveEnding: true,
      }),
    ])

    const counts = enumeratePathCharacterCounts(
      endingStory,
      terminalCharacterCounts(0, {
        'train-gone': 100,
        unanswered: 10,
      }),
    )

    expect([...counts].sort((left, right) => left - right)).toEqual([14, 104])
  })

  it('路径枚举遇到循环时抛出包含循环节点的错误', () => {
    const cyclicStory = buildStory([
      minimalNode('act1_opening', { next: 'loop-node' }),
      minimalNode('loop-node', { next: 'act1_opening' }),
    ])

    expect(() =>
      enumeratePathCharacterCounts(cyclicStory, terminalCharacterCounts(0)),
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
      terminalCharacterCounts(20),
    )
    const longLabelCounts = enumeratePathCharacterCounts(
      storyWithLabel('这是一段刻意写得很长很长的选择标签'),
      terminalCharacterCounts(20),
    )

    expect(longLabelCounts).toEqual(shortLabelCounts)
  })
})
