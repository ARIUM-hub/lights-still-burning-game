import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createInitialProgress, createInitialSave } from '../engine/initialState'
import type { SaveData } from '../engine/types'
import { SAVE_KEY, writeSave } from '../state/saveRepository'
import { story } from '../story'
import { GameProvider, useGame } from './GameContext'

function wrapper({ children }: PropsWithChildren) {
  return <GameProvider>{children}</GameProvider>
}

function saveAt(nodeId: string, lineIndex = 0): SaveData {
  return {
    ...createInitialSave(),
    progress: {
      ...createInitialProgress(nodeId),
      lineIndex,
    },
  }
}

function renderGame() {
  return renderHook(() => useGame(), { wrapper })
}

function storedSave(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY)

  return raw === null ? null : (JSON.parse(raw) as SaveData)
}

describe('GameProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('无存档时以空路线开始', () => {
    const { result } = renderGame()

    expect(result.current.save.progress).toBeNull()
    expect(result.current.currentNode).toBeNull()
    expect(result.current.currentLines).toEqual([])
  })

  it('初始状态从本地存档读取', () => {
    const stored = saveAt('act2_meeting', 2)
    stored.unlockedEndings = ['train-gone']
    writeSave(stored)

    const { result } = renderGame()

    expect(result.current.save).toEqual(stored)
    expect(result.current.currentNode?.id).toBe('act2_meeting')
  })

  it('开始新游戏后进入第一幕开场', () => {
    const { result } = renderGame()

    act(() => result.current.startNewGame())

    expect(result.current.save.progress).toMatchObject({
      nodeId: 'act1_opening',
      lineIndex: 0,
    })
    expect(result.current.currentNode?.title).toBe('高架桥下的灯')
  })

  it('推进时先移动到当前节点的下一行', () => {
    writeSave(saveAt('act1_opening'))
    const { result } = renderGame()

    act(() => result.current.advance())

    expect(result.current.save.progress?.nodeId).toBe('act1_opening')
    expect(result.current.save.progress?.lineIndex).toBe(1)
  })

  it('当前行结束后沿 next 进入下一节点首行', () => {
    writeSave(saveAt('act1_opening', story.act1_opening.lines.length - 1))
    const { result } = renderGame()

    act(() => result.current.advance())

    expect(result.current.save.progress).toMatchObject({
      nodeId: 'act1_cover_shift',
      lineIndex: 0,
    })
  })

  it('当前节点存在选择时推进不会跳过选择', () => {
    writeSave(
      saveAt(
        'act1_cover_shift',
        story.act1_cover_shift.lines.length - 1,
      ),
    )
    const { result } = renderGame()

    act(() => result.current.advance())

    expect(result.current.save.progress).toMatchObject({
      nodeId: 'act1_cover_shift',
      lineIndex: story.act1_cover_shift.lines.length - 1,
    })
  })

  it('选择会应用真实效果并进入目标节点', () => {
    writeSave(saveAt('act1_cover_shift'))
    const { result } = renderGame()

    act(() => result.current.choose('refuse-shift'))

    expect(result.current.save.progress).toMatchObject({
      nodeId: 'act1_customer',
      lineIndex: 0,
      stats: { courage: 2 },
    })
  })

  it('非法选择不改变进度并暴露可恢复错误', () => {
    const original = saveAt('act1_cover_shift')
    writeSave(original)
    const { result } = renderGame()

    act(() => result.current.choose('missing-choice'))

    expect(result.current.save.progress).toEqual(original.progress)
    expect(result.current.recoverableError).toBe(
      '当前节点不存在选择 missing-choice',
    )

    act(() => result.current.clearError())
    expect(result.current.recoverableError).toBeNull()
  })

  it('跨幕时记录已完成幕且不会重复', () => {
    const save = saveAt('act1_dazhuang')
    save.progress!.completedActs = [1]
    writeSave(save)
    const { result } = renderGame()

    act(() => result.current.choose('admit-tired'))

    expect(result.current.save.progress?.nodeId).toBe('act2_meeting')
    expect(result.current.save.progress?.completedActs).toEqual([1])
  })

  it('首次跨幕时加入刚完成的幕', () => {
    writeSave(saveAt('act1_dazhuang'))
    const { result } = renderGame()

    act(() => result.current.choose('say-fine'))

    expect(result.current.save.progress?.completedActs).toEqual([1])
  })

  it('进入结局解析节点时解析并解锁真实结局', () => {
    const save = saveAt('act5_platform')
    writeSave(save)
    const { result } = renderGame()

    act(() => result.current.choose('trust-and-go'))

    expect(result.current.save.progress?.nodeId).toBe('act5_resolve')
    expect(result.current.currentEnding).toBe('next-city')
    expect(result.current.save.unlockedEndings).toEqual(['next-city'])
  })

  it('已解锁的结局不会重复写入收藏', () => {
    const save = saveAt('act5_platform')
    save.unlockedEndings = ['next-city']
    writeSave(save)
    const { result } = renderGame()

    act(() => result.current.choose('trust-and-go'))

    expect(result.current.save.unlockedEndings).toEqual(['next-city'])
  })

  it('动作后自动把 context 存档写入 localStorage', async () => {
    const { result } = renderGame()

    act(() => result.current.startNewGame())
    act(() => result.current.advance())

    await waitFor(() => {
      expect(storedSave()).toEqual(result.current.save)
    })
  })

  it('只合并指定的设置字段', () => {
    const save = saveAt('act3_photo')
    save.settings.soundEnabled = true
    writeSave(save)
    const { result } = renderGame()

    act(() => result.current.updateSettings({ masterVolume: 0.8 }))

    expect(result.current.save.settings).toEqual({
      soundEnabled: true,
      masterVolume: 0.8,
      textSpeed: 'normal',
      reducedMotion: false,
    })
    expect(result.current.save.progress?.nodeId).toBe('act3_photo')
  })

  it('清除当前路线时保留收藏与设置', () => {
    const save = saveAt('act3_photo')
    save.unlockedEndings = ['unanswered']
    save.settings.textSpeed = 'instant'
    writeSave(save)
    const { result } = renderGame()

    act(() => result.current.clearRoute())

    expect(result.current.save.progress).toBeNull()
    expect(result.current.save.unlockedEndings).toEqual(['unanswered'])
    expect(result.current.save.settings.textSpeed).toBe('instant')
  })

  it('清除全部进度时清空路线和收藏但保留设置', () => {
    const save = saveAt('act4_invitation')
    save.unlockedEndings = ['train-gone', 'unanswered']
    save.settings.masterVolume = 0.7
    writeSave(save)
    const { result } = renderGame()

    act(() => result.current.clearAllProgress())

    expect(result.current.save.progress).toBeNull()
    expect(result.current.save.unlockedEndings).toEqual([])
    expect(result.current.save.settings.masterVolume).toBe(0.7)
  })

  it('离开结局时清除路线并保留收藏', () => {
    const save = saveAt('act5_resolve')
    save.progress!.flags = ['startedJourney']
    save.unlockedEndings = ['next-city']
    writeSave(save)
    const { result } = renderGame()

    expect(result.current.currentEnding).toBe('next-city')
    act(() => result.current.leaveEnding())

    expect(result.current.save.progress).toBeNull()
    expect(result.current.save.unlockedEndings).toEqual(['next-city'])
  })

  it('可从任一幕重玩并预填此前已完成幕', () => {
    const { result } = renderGame()
    const entries = [
      [1, 'act1_opening'],
      [2, 'act2_meeting'],
      [3, 'act3_photo'],
      [4, 'act4_invitation'],
      [5, 'act5_phone'],
    ] as const

    for (const [actNumber, nodeId] of entries) {
      act(() => result.current.restartFromAct(actNumber))
      expect(result.current.save.progress).toMatchObject({
        nodeId,
        lineIndex: 0,
        completedActs: Array.from(
          { length: actNumber - 1 },
          (_, index) => index + 1,
        ),
      })
    }
  })

  it('非法幕不改变状态并设置可恢复错误', () => {
    writeSave(saveAt('act3_photo', 2))
    const { result } = renderGame()
    const original = result.current.save.progress

    act(() => result.current.restartFromAct(6))

    expect(result.current.save.progress).toEqual(original)
    expect(result.current.recoverableError).toBe('无法从第 6 幕重新开始')
  })

  it('继续游戏在无路线时开始新游戏，有路线时保留进度', () => {
    const { result } = renderGame()

    act(() => result.current.continueGame())
    expect(result.current.save.progress?.nodeId).toBe('act1_opening')

    act(() => result.current.advance())
    const progressed = result.current.save.progress
    act(() => result.current.continueGame())
    expect(result.current.save.progress).toEqual(progressed)
  })
})

describe('useGame', () => {
  it('在 GameProvider 外使用时抛出明确错误', () => {
    expect(() => renderHook(() => useGame())).toThrow(
      'useGame 必须在 GameProvider 内使用',
    )
  })
})
