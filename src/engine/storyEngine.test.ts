import { describe, expect, it } from 'vitest'

import { createInitialProgress, createInitialSave } from './initialState'
import { applyChoice, linesFor, matches, resolveEnding } from './storyEngine'
import type { Choice, Condition, StoryNode } from './types'

describe('applyChoice', () => {
  it('叠加选择效果并进入下一节点', () => {
    const choice: Choice = {
      id: 'accept-shoes',
      label: '接过鞋盒',
      next: 'act2_after_shoes',
      effects: {
        stats: { attachment: 2, selfDenial: -1 },
        relations: { xiaomeiTrust: 1 },
        flags: ['acceptedShoes'],
      },
    }

    const result = applyChoice(createInitialProgress(), choice)

    expect(result.nodeId).toBe('act2_after_shoes')
    expect(result.lineIndex).toBe(0)
    expect(result.stats).toEqual({
      courage: 0,
      attachment: 2,
      selfDenial: -1,
    })
    expect(result.relations).toEqual({
      xiaomeiTrust: 1,
      dazhuangOpenness: 0,
      xiaoliAdvice: 0,
    })
    expect(result.flags).toEqual(['acceptedShoes'])
  })

  it('不修改输入进度并去除重复旗标', () => {
    const progress = {
      ...createInitialProgress(),
      lineIndex: 3,
      stats: { courage: 1, attachment: 2, selfDenial: 3 },
      relations: {
        xiaomeiTrust: 1,
        dazhuangOpenness: 2,
        xiaoliAdvice: 3,
      },
      flags: ['acceptedShoes'],
      completedActs: [1, 2],
    }
    const snapshot = structuredClone(progress)
    const choice: Choice = {
      id: 'accept-again',
      label: '再次接过鞋盒',
      next: 'act2_after_shoes',
      effects: {
        stats: { courage: 2 },
        relations: { dazhuangOpenness: -1 },
        flags: ['acceptedShoes', 'acceptedShoes'],
      },
    }

    const result = applyChoice(progress, choice)

    expect(progress).toEqual(snapshot)
    expect(result).not.toBe(progress)
    expect(result.stats).not.toBe(progress.stats)
    expect(result.relations).not.toBe(progress.relations)
    expect(result.flags).toEqual(['acceptedShoes'])
    expect(result.completedActs).toEqual([1, 2])
  })

  it('没有选择效果时仍安全进入下一节点', () => {
    const progress = {
      ...createInitialProgress(),
      lineIndex: 2,
      flags: ['keptFlag'],
    }

    const result = applyChoice(progress, {
      id: 'continue',
      label: '继续',
      next: 'next-node',
    })

    expect(result.nodeId).toBe('next-node')
    expect(result.lineIndex).toBe(0)
    expect(result.stats).toEqual(progress.stats)
    expect(result.relations).toEqual(progress.relations)
    expect(result.flags).toEqual(['keptFlag'])
  })
})

describe('matches', () => {
  const progress = {
    ...createInitialProgress(),
    stats: { courage: 1, attachment: 2, selfDenial: -1 },
    flags: ['acceptedShoes', 'spokeHonestly'],
  }

  it.each<{
    name: string
    condition: Condition
    expected: boolean
  }>([
    {
      name: 'flagsAll 中的旗标全部存在时匹配',
      condition: { flagsAll: ['acceptedShoes', 'spokeHonestly'] },
      expected: true,
    },
    {
      name: 'flagsAll 中有旗标缺失时不匹配',
      condition: { flagsAll: ['acceptedShoes', 'missing'] },
      expected: false,
    },
    {
      name: 'flagsNone 中的旗标全部不存在时匹配',
      condition: { flagsNone: ['missing'] },
      expected: true,
    },
    {
      name: 'flagsNone 中有旗标存在时不匹配',
      condition: { flagsNone: ['spokeHonestly'] },
      expected: false,
    },
    {
      name: '属性等于 statMin 边界时匹配',
      condition: { statMin: { attachment: 2 } },
      expected: true,
    },
    {
      name: '属性低于 statMin 边界时不匹配',
      condition: { statMin: { attachment: 3 } },
      expected: false,
    },
    {
      name: '属性等于 statMax 边界时匹配',
      condition: { statMax: { selfDenial: -1 } },
      expected: true,
    },
    {
      name: '属性高于 statMax 边界时不匹配',
      condition: { statMax: { courage: 0 } },
      expected: false,
    },
  ])('$name', ({ condition, expected }) => {
    expect(matches(progress, condition)).toBe(expected)
  })

  it('要求所有条件同时满足', () => {
    expect(
      matches(progress, {
        flagsAll: ['acceptedShoes'],
        flagsNone: ['missing'],
        statMin: { courage: 1 },
        statMax: { attachment: 2 },
      }),
    ).toBe(true)
  })
})

describe('linesFor', () => {
  const node: StoryNode = {
    id: 'test-node',
    act: 2,
    title: '测试节点',
    scene: 'cafe',
    ambience: 'rain',
    lines: [{ text: '基础台词' }],
    variants: [
      {
        when: { flagsAll: ['acceptedShoes'] },
        lines: [{ speaker: '小美', text: '第一个匹配变体' }],
      },
      {
        when: { statMin: { attachment: 0 } },
        lines: [{ speaker: '小帅', text: '第二个匹配变体' }],
      },
    ],
  }

  it('返回第一个匹配变体的台词', () => {
    const progress = {
      ...createInitialProgress(),
      flags: ['acceptedShoes'],
    }

    expect(linesFor(node, progress)).toBe(node.variants?.[0].lines)
  })

  it('没有变体匹配时返回基础台词', () => {
    const progress = {
      ...createInitialProgress(),
      stats: { courage: -1, attachment: -1, selfDenial: -1 },
    }

    expect(linesFor(node, progress)).toBe(node.lines)
  })
})

describe('resolveEnding', () => {
  it.each([
    [['startedJourney'], 'next-city'],
    [['arrivedBeforeNine', 'doubtedAtPlatform'], 'platform-divide'],
    [['explicitlyRefused'], 'better-person'],
    [['arrivedAfterDeparture'], 'train-gone'],
    [[], 'unanswered'],
  ] as const)('旗标 %j 对应结局 %s', (flags, expected) => {
    const progress = { ...createInitialProgress(), flags: [...flags] }

    expect(resolveEnding(progress)).toBe(expected)
  })

  it('startedJourney 在组合旗标中拥有最高优先级', () => {
    const progress = {
      ...createInitialProgress(),
      flags: [
        'arrivedAfterDeparture',
        'explicitlyRefused',
        'doubtedAtPlatform',
        'arrivedBeforeNine',
        'startedJourney',
      ],
    }

    expect(resolveEnding(progress)).toBe('next-city')
  })
})

describe('createInitialSave', () => {
  it('matchMedia 不存在时安全返回默认设置', () => {
    const originalMatchMedia = window.matchMedia

    try {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: undefined,
      })

      expect(() => createInitialSave()).not.toThrow()
      expect(createInitialSave()).toEqual({
        schemaVersion: 1,
        progress: null,
        unlockedEndings: [],
        settings: {
          soundEnabled: false,
          masterVolume: 0.45,
          textSpeed: 'normal',
          reducedMotion: false,
        },
      })
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      })
    }
  })

  it('matchMedia 匹配减少动态效果时启用 reducedMotion', () => {
    const originalMatchMedia = window.matchMedia

    try {
      window.matchMedia = (() => ({ matches: true }) as MediaQueryList)

      expect(createInitialSave().settings.reducedMotion).toBe(true)
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      })
    }
  })
})
