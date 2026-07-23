import { beforeEach, describe, expect, it } from 'vitest'

import { createInitialProgress } from '../engine/initialState'
import { SAVE_KEY, loadSave } from './saveRepository'

describe('saveRepository character names', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('兼容旧版存档，并为缺失的角色命名信息补默认值', () => {
    const legacySave = {
      schemaVersion: 1,
      progress: createInitialProgress('act2_meeting'),
      unlockedEndings: ['train-gone'],
      settings: {
        soundEnabled: false,
        masterVolume: 0.45,
        textSpeed: 'normal',
        reducedMotion: false,
      },
    }

    localStorage.setItem(SAVE_KEY, JSON.stringify(legacySave))

    expect(loadSave().characterNames).toEqual({
      protagonist: '小丑',
      heroine: '小美',
    })
  })
})
