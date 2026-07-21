import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { createInitialProgress, createInitialSave } from './engine/initialState'
import { writeSave } from './state/saveRepository'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('显示故事标题和开始按钮', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '灯火未熄' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '开始故事' }),
    ).toBeInTheDocument()
  })

  it('开始后进入剧情舞台，第一次推进只补全当前台词', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: '开始故事' }),
    )

    expect(
      screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '推进剧情' }))
    expect(
      screen.getByText(/A 市入夜以后下起冷雨/),
    ).toBeInTheDocument()
  })

  it('刷新时存在进行中路线会直接回到 GameScreen', () => {
    const save = createInitialSave()
    save.progress = createInitialProgress('act1_opening')
    save.settings.textSpeed = 'instant'
    writeSave(save)

    render(<App />)

    expect(
      screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
    ).toBeInTheDocument()
  })

  it('标题页从头开始会重置旧进度并进入第一幕', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.progress = null
    save.unlockedEndings = ['train-gone']
    save.settings.textSpeed = 'instant'
    writeSave(save)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '开始故事' }))

    expect(
      screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
    ).toBeInTheDocument()
  })

  it('可以从标题页和游戏页打开同一个设置面板', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '设置' }))
    expect(screen.getByRole('dialog', { name: '设置' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '关闭设置' }))

    await user.click(screen.getByRole('button', { name: '开始故事' }))
    await user.click(screen.getByRole('button', { name: '打开设置' }))

    expect(screen.getByRole('dialog', { name: '设置' })).toBeInTheDocument()
  })

  it('从游戏设置确认清除当前路线后关闭面板并返回标题页', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.progress = createInitialProgress('act1_opening')
    save.settings.textSpeed = 'instant'
    writeSave(save)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '打开设置' }))
    await user.click(screen.getByRole('button', { name: '清除当前路线' }))
    await user.click(
      screen.getByRole('button', { name: '确认清除当前路线' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const startButton = screen.getByRole('button', { name: '开始故事' })
    expect(startButton).toBeInTheDocument()
    await waitFor(() => expect(startButton).toHaveFocus())
  })

  it('损坏存档恢复到标题页时显示恢复提示', () => {
    const save = createInitialSave()
    save.progress = createInitialProgress('missing-story-node')
    writeSave(save)

    render(<App />)

    expect(screen.getByRole('button', { name: '开始故事' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      '存档中的剧情节点不存在，已清除当前路线',
    )
  })

  it('抵达结局时展示完整结局并可进入雨夜回忆', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.progress = createInitialProgress('act5_resolve')
    save.progress.flags = ['startedJourney']
    save.unlockedEndings = ['next-city']
    writeSave(save)

    render(<App />)

    expect(
      screen.getByRole('heading', { name: '下一座城市' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开设置' }))
    expect(screen.getByRole('dialog', { name: '设置' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '关闭设置' }))
    await user.click(screen.getByRole('button', { name: '收下这张残票' }))

    expect(screen.getByRole('heading', { name: '雨夜回忆' })).toBeInTheDocument()
    expect(screen.getByText('下一座城市')).toBeInTheDocument()
  })

  it('进度为空时仍能在收藏页重玩已完成章节', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.unlockedEndings = ['train-gone']
    save.settings.textSpeed = 'instant'
    writeSave(save)

    render(<App />)

    await user.click(screen.getByRole('button', { name: '雨夜回忆' }))
    expect(screen.getByRole('heading', { name: '雨夜回忆' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重玩第二幕' }))
    expect(screen.getByText('第二幕')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: '剧情场景：便利店的热牛奶' }),
    ).toBeInTheDocument()
  })
})
