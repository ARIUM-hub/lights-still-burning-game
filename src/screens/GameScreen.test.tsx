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
import type { AudioDirector } from '../audio/AudioDirector'
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

function renderGameScreen(
  onOpenSettings = vi.fn(),
  audioDirector?: AudioDirector,
) {
  return render(
    <GameProvider audioDirector={audioDirector}>
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

  it('声音开启时播放节点环境音并在首次进入便利店时播放门铃', () => {
    const save = saveAt('act2_meeting', 0)
    save.settings.soundEnabled = true
    writeSave(save)
    const playAmbience = vi.fn()
    const playDoorChime = vi.fn()
    const audioDirector = {
      isEnabled: vi.fn(() => true),
      setVolume: vi.fn(),
      playAmbience,
      playDoorChime,
      stopAll: vi.fn(),
      dispose: vi.fn(),
    } as unknown as AudioDirector

    const view = renderGameScreen(vi.fn(), audioDirector)
    view.rerender(
      <GameProvider audioDirector={audioDirector}>
        <GameScreen onOpenSettings={vi.fn()} />
      </GameProvider>,
    )

    expect(playAmbience).toHaveBeenCalledOnce()
    expect(playAmbience).toHaveBeenCalledWith('store')
    expect(playDoorChime).toHaveBeenCalledOnce()
  })

  it('声音关闭时不请求播放环境音或门铃', () => {
    writeSave(saveAt('act2_meeting', 0))
    const playAmbience = vi.fn()
    const playDoorChime = vi.fn()
    const audioDirector = {
      isEnabled: vi.fn(() => false),
      setVolume: vi.fn(),
      playAmbience,
      playDoorChime,
      stopAll: vi.fn(),
      dispose: vi.fn(),
    } as unknown as AudioDirector

    renderGameScreen(vi.fn(), audioDirector)

    expect(playAmbience).not.toHaveBeenCalled()
    expect(playDoorChime).not.toHaveBeenCalled()
  })

  it('刷新后在首次推进剧情的用户动作中恢复已保存的声音偏好', async () => {
    const save = saveAt('act1_opening', 0)
    save.settings.soundEnabled = true
    writeSave(save)
    let active = false
    const enable = vi.fn(async () => {
      active = true
      return true
    })
    const playAmbience = vi.fn()
    const audioDirector = {
      enable,
      isEnabled: vi.fn(() => active),
      setVolume: vi.fn(),
      playAmbience,
      playDoorChime: vi.fn(),
      stopAll: vi.fn(),
      dispose: vi.fn(),
    } as unknown as AudioDirector
    renderGameScreen(vi.fn(), audioDirector)

    expect(enable).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '推进剧情' }))

    await waitFor(() => expect(enable).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(playAmbience).toHaveBeenCalledWith('rain'),
    )
  })

  it('运行时播放失败后同步回退声音状态并显示恢复提示', async () => {
    const save = saveAt('act1_opening', 0)
    save.settings.soundEnabled = true
    writeSave(save)
    let active = true
    const audioDirector = {
      enable: vi.fn().mockResolvedValue(true),
      isEnabled: vi.fn(() => active),
      setVolume: vi.fn(),
      playAmbience: vi.fn(() => {
        active = false
      }),
      playDoorChime: vi.fn(),
      stopAll: vi.fn(),
      dispose: vi.fn(),
    } as unknown as AudioDirector
    renderGameScreen(vi.fn(), audioDirector)

    expect(await screen.findByRole('status')).toHaveTextContent(
      '声音播放失败',
    )
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(SAVE_KEY)!) as SaveData
      expect(stored.settings.soundEnabled).toBe(false)
    })
  })
})
