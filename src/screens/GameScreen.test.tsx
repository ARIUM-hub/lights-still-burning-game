import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { GameProvider } from '../app/GameContext'
import { createInitialProgress, createInitialSave } from '../engine/initialState'
import type { SaveData } from '../engine/types'
import { SAVE_KEY, writeSave } from '../state/saveRepository'
import { story } from '../story'
import { GameScreen } from './GameScreen'

function saveAt(nodeId: string, lineIndex: number): SaveData {
  const save = createInitialSave()
  save.progress = {
    ...createInitialProgress(nodeId),
    lineIndex,
  }
  save.settings.textSpeed = 'instant'
  return save
}

function renderGameScreen(onOpenSettings = vi.fn()) {
  return render(
    <GameProvider>
      <GameScreen onOpenSettings={onOpenSettings} />
    </GameProvider>,
  )
}

describe('GameScreen', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('非末行不把节点选择传给舞台', () => {
    writeSave(saveAt('act1_cover_shift', 0))

    renderGameScreen()

    expect(
      screen.getByRole('heading', { name: '又一次顶班' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /说自己已经连续上了太多夜班/ }),
    ).not.toBeInTheDocument()
  })

  it('显示中文章节和当前节点标题，并可打开设置', () => {
    const onOpenSettings = vi.fn()
    writeSave(saveAt('act1_opening', 0))

    renderGameScreen(onOpenSettings)

    expect(screen.getByText('第一幕')).toBeInTheDocument()
    expect(screen.getAllByText('高架桥下的灯').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: '打开设置' }))
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('真实 Context 中点击末行选择会进入目标节点', () => {
    writeSave(
      saveAt(
        'act1_cover_shift',
        story.act1_cover_shift.lines.length - 1,
      ),
    )
    renderGameScreen()

    fireEvent.click(
      screen.getByRole('button', {
        name: /说自己已经连续上了太多夜班/,
      }),
    )

    expect(
      screen.getByRole('heading', { name: '杯盖没有扣紧' }),
    ).toBeInTheDocument()
  })

  it('以 polite status 呈现可恢复错误', () => {
    const damaged = saveAt('missing-story-node', 0)
    localStorage.setItem(SAVE_KEY, JSON.stringify(damaged))

    renderGameScreen()

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('status')).toHaveTextContent(
      '存档中的剧情节点不存在，已清除当前路线',
    )
  })

  it('当前行不存在时提供调用 clearRoute 的恢复操作', async () => {
    writeSave(saveAt('act1_opening', 999))
    renderGameScreen()

    expect(screen.getByText('当前行无法读取。')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '返回标题' }))

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(SAVE_KEY)!) as SaveData
      expect(stored.progress).toBeNull()
    })
  })
})
