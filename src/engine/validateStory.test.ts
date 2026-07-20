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

describe('剧情图', () => {
  it('通过全部结构校验', () => {
    expect(validateStory(story)).toEqual([])
  })

  it('恰好包含五幕、至少十个选择节点和一个结局解析节点', () => {
    expect(new Set(storyNodes.map((node) => node.act))).toEqual(
      new Set([1, 2, 3, 4, 5]),
    )
    expect(storyNodes.filter((node) => node.choices?.length).length).toBeGreaterThanOrEqual(10)
    expect(storyNodes.filter((node) => node.resolveEnding)).toHaveLength(1)
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
})
