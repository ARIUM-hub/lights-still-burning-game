import { act, cleanup, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createInitialProgress, createInitialSave } from '../engine/initialState'
import { writeSave } from '../state/saveRepository'
import { GameProvider, useGame } from './GameContext'

function wrapper({ children }: PropsWithChildren) {
  return <GameProvider>{children}</GameProvider>
}

describe('GameContext character names', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('修改男女主名字后会立即替换当前剧情中的称呼', () => {
    const save = createInitialSave()
    save.progress = createInitialProgress('act2_meeting')
    writeSave(save)

    const { result } = renderHook(() => useGame(), { wrapper })

    act(() => {
      result.current.updateCharacterNames({
        protagonist: '周岚',
        heroine: '林灯',
      })
    })

    expect(result.current.save.characterNames).toEqual({
      protagonist: '周岚',
      heroine: '林灯',
    })
    expect(result.current.currentLines.some((line) => line.text.includes('周岚'))).toBe(true)
    expect(
      result.current.currentLines.some((line) => line.speaker === '林灯'),
    ).toBe(true)
    expect(result.current.currentLines.some((line) => line.text.includes('林灯'))).toBe(true)
  })
})
