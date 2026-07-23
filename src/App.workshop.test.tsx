import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { createInitialSave } from './engine/initialState'
import { writeSave } from './state/saveRepository'

describe('AI 故事工坊入口', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('通关后在标题页解锁 AI 故事工坊，并可进入生成页面', async () => {
    const user = userEvent.setup()
    const save = createInitialSave()
    save.unlockedEndings = ['train-gone']
    writeSave(save)

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'AI故事工坊' }))

    expect(
      screen.getByRole('heading', { name: 'AI故事工坊' }),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText('API 基础地址'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '生成新故事' }),
    ).toBeInTheDocument()
  })
})
