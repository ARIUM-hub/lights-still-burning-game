import { beforeEach, describe, expect, it } from 'vitest'

import { createInitialSave } from '../engine/initialState'
import type { SaveData, StoryProgress } from '../engine/types'
import {
  SAVE_KEY,
  clearCollection,
  clearCurrentRoute,
  loadSave,
  writeSave,
} from './saveRepository'

const progress: StoryProgress = {
  nodeId: 'act3_photo',
  lineIndex: 2,
  stats: {
    courage: 3,
    attachment: -1,
    selfDenial: 2,
  },
  relations: {
    xiaomeiTrust: 2,
    dazhuangOpenness: 1,
    xiaoliAdvice: -1,
  },
  flags: ['收好小美的合照'],
  completedActs: [1, 2],
}

describe('saveRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('写入后可完整加载存档，并以正常中文 JSON 保存', () => {
    const save: SaveData = {
      ...createInitialSave(),
      progress,
      unlockedEndings: ['train-gone'],
      settings: {
        soundEnabled: true,
        masterVolume: 0.8,
        textSpeed: 'instant',
        reducedMotion: true,
      },
    }

    writeSave(save)

    expect(loadSave()).toEqual(save)
    const stored = localStorage.getItem(SAVE_KEY)
    expect(stored).not.toBeNull()
    expect(stored).toContain('收好小美的合照')
    expect(JSON.parse(stored!)).toEqual(save)
  })

  it('JSON 损坏时不抛错并恢复默认存档', () => {
    localStorage.setItem(SAVE_KEY, '{坏掉')

    expect(() => loadSave()).not.toThrow()
    expect(loadSave()).toEqual(createInitialSave())
  })

  it.each([
    ['schemaVersion 非 1', { ...createInitialSave(), schemaVersion: 2 }],
    [
      '缺少 unlockedEndings',
      (({ unlockedEndings: _omitted, ...rest }) => rest)(createInitialSave()),
    ],
    [
      'settings 字段类型错误',
      {
        ...createInitialSave(),
        settings: { ...createInitialSave().settings, masterVolume: '很响' },
      },
    ],
    [
      'progress 基本结构错误',
      { ...createInitialSave(), progress: { ...progress, lineIndex: '第二行' } },
    ],
    [
      'unlockedEndings 含未知结局',
      { ...createInitialSave(), unlockedEndings: ['不存在的结局'] },
    ],
    [
      'textSpeed 枚举错误',
      {
        ...createInitialSave(),
        settings: { ...createInitialSave().settings, textSpeed: 'fast' },
      },
    ],
    [
      'masterVolume 超出合法范围',
      {
        ...createInitialSave(),
        settings: { ...createInitialSave().settings, masterVolume: 1.1 },
      },
    ],
  ])('%s 时整体恢复默认存档', (_label, invalidSave) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(invalidSave))

    expect(loadSave()).toEqual(createInitialSave())
  })

  it('清除当前路线时仅清空 progress，保留收藏和设置且不修改输入', () => {
    const save: SaveData = {
      ...createInitialSave(),
      progress,
      unlockedEndings: ['train-gone'],
    }
    const original = structuredClone(save)

    const cleared = clearCurrentRoute(save)

    expect(cleared).toEqual({ ...save, progress: null })
    expect(cleared).not.toBe(save)
    expect(cleared.unlockedEndings).not.toBe(save.unlockedEndings)
    expect(save).toEqual(original)
  })

  it('清除收藏时清空 progress 和结局，保留设置且不修改输入', () => {
    const save: SaveData = {
      ...createInitialSave(),
      progress,
      unlockedEndings: ['train-gone', 'next-city'],
    }
    const original = structuredClone(save)

    const cleared = clearCollection(save)

    expect(cleared).toEqual({
      ...save,
      progress: null,
      unlockedEndings: [],
    })
    expect(cleared).not.toBe(save)
    expect(cleared.unlockedEndings).not.toBe(save.unlockedEndings)
    expect(save).toEqual(original)
  })

  it('没有存档 key 时返回默认存档', () => {
    expect(loadSave()).toEqual(createInitialSave())
  })
})
