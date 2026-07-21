import { cleanup, render, screen } from '@testing-library/react'
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

  it('已有进度时先显示继续雨夜，点击后进入 GameScreen', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.progress = createInitialProgress('act1_opening')
    save.settings.textSpeed = 'instant'
    writeSave(save)

    render(<App />)

    expect(screen.getByRole('button', { name: '继续雨夜' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '剧情场景：高架桥下的灯' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '继续雨夜' }))

    expect(
      screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
    ).toBeInTheDocument()
  })

  it('从头开始会重置旧进度并进入第一幕', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.progress = createInitialProgress('act2_meeting')
    save.settings.textSpeed = 'instant'
    writeSave(save)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '从头开始' }))

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

    await user.click(screen.getByRole('button', { name: '继续雨夜' }))
    await user.click(screen.getByRole('button', { name: '打开设置' }))
    await user.click(screen.getByRole('button', { name: '清除当前路线' }))
    await user.click(
      screen.getByRole('button', { name: '确认清除当前路线' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始故事' })).toBeInTheDocument()
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

  it('抵达结局时暂时显示结局占位并保持设置可达', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.progress = createInitialProgress('act5_resolve')
    save.progress.flags = ['startedJourney']
    writeSave(save)

    render(<App />)

    await user.click(screen.getByRole('button', { name: '继续雨夜' }))
    expect(screen.getByText('结局已抵达')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '打开设置' }))
    expect(screen.getByRole('dialog', { name: '设置' })).toBeInTheDocument()
  })
})
