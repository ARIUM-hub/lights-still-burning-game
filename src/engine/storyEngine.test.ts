import { describe, expect, it, vi } from 'vitest'

import { story } from '../story'
import { endings } from '../story/endings'
import { createInitialProgress, createInitialSave } from './initialState'
import { applyChoice, linesFor, matches, resolveEnding } from './storyEngine'
import type { Choice, Condition, StoryNode } from './types'

function chooseFromCurrent(
  progress: ReturnType<typeof createInitialProgress>,
  choiceId: string,
) {
  const choice = story[progress.nodeId].choices?.find(
    (candidate) => candidate.id === choiceId,
  )
  if (!choice) throw new Error(`节点 ${progress.nodeId} 不存在选择 ${choiceId}`)
  return applyChoice(progress, choice)
}

function storyText(nodeId: string, progress: ReturnType<typeof createInitialProgress>) {
  return linesFor(story[nodeId], progress)
    .map((line) => line.text)
    .join('')
}

describe('跨幕连续性', () => {
  it('道歉路线不会被累计勇气误写成调监控自证', () => {
    let progress = createInitialProgress('act1_cover_shift')
    progress = chooseFromCurrent(progress, 'refuse-shift')
    progress = chooseFromCurrent(progress, 'apologize')

    const text = storyText('act1_dazhuang', progress)
    expect(text).toContain('重新做一杯咖啡')
    expect(text).not.toMatch(/调了监控|把杯盖的事实说清楚/)
  })

  it('保护自己路线仍会回望调监控说明事实', () => {
    let progress = createInitialProgress('act1_customer')
    progress = chooseFromCurrent(progress, 'protect-self')

    const text = storyText('act1_dazhuang', progress)
    expect(text).toMatch(/调了监控|把杯盖的事实说清楚/)
  })

  it('拒绝球鞋后答应同行不会让球鞋凭空回到故事', () => {
    let progress = createInitialProgress('act2_shoes')
    progress = chooseFromCurrent(progress, 'refuse-shoes')
    progress = { ...progress, nodeId: 'act4_invitation' }
    progress = chooseFromCurrent(progress, 'say-yes')

    const invitationText = storyText('act4_after_invitation', progress)
    expect(invitationText).not.toContain('合脚球鞋')
    expect(invitationText).not.toContain('旧鞋')

    progress = { ...progress, nodeId: 'act5_phone' }
    progress = chooseFromCurrent(progress, 'answer-phone')
    progress = chooseFromCurrent(progress, 'leave-before-nine')
    progress = chooseFromCurrent(progress, 'trust-and-go')

    expect(resolveEnding(progress)).toBe('next-city')
    expect(endings['next-city'].epilogue.join('')).not.toContain('磨旧的球鞋')
  })
})

describe('createInitialProgress', () => {
  it('返回完整的默认剧情进度', () => {
    expect(createInitialProgress()).toEqual({
      nodeId: 'act1_opening',
      lineIndex: 0,
      stats: {
        courage: 0,
        attachment: 0,
        selfDenial: 0,
      },
      relations: {
        xiaomeiTrust: 0,
        dazhuangOpenness: 0,
        xiaoliAdvice: 0,
      },
      flags: [],
      completedActs: [],
    })
  })
})

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

  it.each<{
    name: string
    condition: Condition
    openness: number
    expected: boolean
  }>([
    {
      name: '关系值等于 relationMin 边界时匹配',
      condition: { relationMin: { dazhuangOpenness: 2 } },
      openness: 2,
      expected: true,
    },
    {
      name: '关系值低于 relationMin 边界时不匹配',
      condition: { relationMin: { dazhuangOpenness: 2 } },
      openness: 1,
      expected: false,
    },
    {
      name: '关系值等于 relationMax 边界时匹配',
      condition: { relationMax: { dazhuangOpenness: 2 } },
      openness: 2,
      expected: true,
    },
    {
      name: '关系值高于 relationMax 边界时不匹配',
      condition: { relationMax: { dazhuangOpenness: 2 } },
      openness: 3,
      expected: false,
    },
  ])('$name', ({ condition, openness, expected }) => {
    const relationProgress = {
      ...createInitialProgress(),
      relations: {
        ...createInitialProgress().relations,
        dazhuangOpenness: openness,
      },
    }

    expect(matches(relationProgress, condition)).toBe(expected)
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

  const textAfterChoice = (
    choiceNodeId: string,
    choiceId: string,
    targetNodeId: string,
  ) => {
    const choice = story[choiceNodeId].choices?.find(
      (candidate) => candidate.id === choiceId,
    )
    if (!choice) throw new Error(`测试选择不存在：${choiceId}`)

    return linesFor(
      story[targetNodeId],
      applyChoice(createInitialProgress(choiceNodeId), choice),
    )
      .map((line) => line.text)
      .join('')
  }

  it('第一幕勇气与自我否定会改变顾客冲突的内心文本', () => {
    const courageText = textAfterChoice(
      'act1_cover_shift',
      'ask-reason',
      'act1_customer',
    )
    const selfDenialText = textAfterChoice(
      'act1_cover_shift',
      'accept-shift',
      'act1_customer',
    )

    expect(courageText).not.toBe(selfDenialText)
  })

  it('保护自己与先行道歉会改变大壮观察到的状态', () => {
    const protectedText = textAfterChoice(
      'act1_customer',
      'protect-self',
      'act1_dazhuang',
    )
    const apologizedText = textAfterChoice(
      'act1_customer',
      'apologize',
      'act1_dazhuang',
    )

    expect(protectedText).not.toBe(apologizedText)
  })

  it('向大壮承认疲惫会改变便利店相遇时的记忆', () => {
    const admittedText = textAfterChoice(
      'act1_dazhuang',
      'admit-tired',
      'act2_meeting',
    )
    const concealedText = textAfterChoice(
      'act1_dazhuang',
      'say-fine',
      'act2_meeting',
    )

    expect(admittedText).not.toBe(concealedText)
  })

  it('接受热牛奶会改变小美观察鞋子的过程', () => {
    const acceptedText = textAfterChoice(
      'act2_meeting',
      'accept-care',
      'act2_shoes',
    )
    const avoidedText = textAfterChoice(
      'act2_meeting',
      'avoid-care',
      'act2_shoes',
    )

    expect(acceptedText).not.toBe(avoidedText)
  })

  it('接听、忽略和发消息分别产生不同的离店前文本', () => {
    const phoneTexts = ['answer-phone', 'ignore-phone', 'send-message'].map(
      (choiceId) =>
        textAfterChoice('act5_phone', choiceId, 'act5_departure'),
    )

    expect(new Set(phoneTexts).size).toBe(3)
  })

  it('拒绝鞋且没有带花的路线不会凭空出现球鞋或花瓣', () => {
    const progress = {
      ...createInitialProgress('act5_departure'),
      flags: ['refusedShoes'],
    }
    const departureText = linesFor(story.act5_departure, progress)
      .map((line) => line.text)
      .join('')
    const platformText = linesFor(story.act5_platform, {
      ...progress,
      nodeId: 'act5_platform',
    })
      .map((line) => line.text)
      .join('')

    expect(departureText).not.toMatch(/合脚球鞋|白玫瑰花瓣|干花瓣/)
    expect(platformText).toContain('鞋和裤脚')
    expect(platformText).not.toContain('球鞋和裤脚')
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

  it('实际迟到到站优先于此前说过体面拒绝', () => {
    const progress = {
      ...createInitialProgress(),
      flags: ['explicitlyRefused', 'arrivedAfterDeparture'],
    }

    expect(resolveEnding(progress)).toBe('train-gone')
  })

  it('站台怀疑优先于迟到到站和此前体面拒绝', () => {
    const progress = {
      ...createInitialProgress(),
      flags: [
        'arrivedBeforeNine',
        'doubtedAtPlatform',
        'arrivedAfterDeparture',
        'explicitlyRefused',
      ],
    }

    expect(resolveEnding(progress)).toBe('platform-divide')
  })
})

describe('createInitialSave', () => {
  const originalMatchMediaDescriptor = Object.getOwnPropertyDescriptor(
    window,
    'matchMedia',
  )
  const restoreMatchMedia = () => {
    if (originalMatchMediaDescriptor) {
      Object.defineProperty(
        window,
        'matchMedia',
        originalMatchMediaDescriptor,
      )
      return
    }

    Reflect.deleteProperty(window, 'matchMedia')
  }

  it('window 不存在时安全关闭减少动态效果', () => {
    vi.stubGlobal('window', undefined)

    try {
      expect(() => createInitialSave()).not.toThrow()
      expect(createInitialSave().settings.reducedMotion).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('matchMedia 不存在时安全返回默认设置', () => {
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
        characterNames: {
          protagonist: '小丑',
          heroine: '小美',
        },
        settings: {
          soundEnabled: false,
          masterVolume: 0.45,
          textSpeed: 'normal',
          reducedMotion: false,
        },
      })
    } finally {
      restoreMatchMedia()
    }
  })

  it('matchMedia 未匹配减少动态效果时保持 reducedMotion 关闭', () => {
    try {
      window.matchMedia = (() => ({ matches: false }) as MediaQueryList)

      expect(createInitialSave().settings.reducedMotion).toBe(false)
    } finally {
      restoreMatchMedia()
    }
  })

  it('matchMedia 匹配减少动态效果时启用 reducedMotion', () => {
    try {
      window.matchMedia = (() => ({ matches: true }) as MediaQueryList)

      expect(createInitialSave().settings.reducedMotion).toBe(true)
    } finally {
      restoreMatchMedia()
    }
  })

  it('修改 matchMedia 的测试不会改变原始属性描述符', () => {
    expect(Object.getOwnPropertyDescriptor(window, 'matchMedia')).toEqual(
      originalMatchMediaDescriptor,
    )
  })
})
