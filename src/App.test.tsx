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

  it('已有进度时直接显示 GameScreen', () => {
    const save = createInitialSave()
    save.progress = createInitialProgress('act1_opening')
    save.settings.textSpeed = 'instant'
    writeSave(save)

    render(<App />)

    expect(
      screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
    ).toBeInTheDocument()
  })

  it('抵达结局时暂时显示结局占位', () => {
    const save = createInitialSave()
    save.progress = createInitialProgress('act5_resolve')
    save.progress.flags = ['startedJourney']
    writeSave(save)

    render(<App />)

    expect(screen.getByText('结局已抵达')).toBeInTheDocument()
  })
})
