import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'

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

  it('开始后显示当前节点、台词和继续按钮', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: '开始故事' }),
    )

    expect(
      screen.getByRole('heading', { name: '高架桥下的灯' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/A 市入夜以后下起冷雨/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '继续' }),
    ).toBeInTheDocument()
  })
})
