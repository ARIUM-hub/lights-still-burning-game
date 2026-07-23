import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { endings } from '../story/endings'
import { EndingScreen } from './EndingScreen'

describe('EndingScreen', () => {
  afterEach(cleanup)

  it('展示结局编号、标题、概要和完整尾声', () => {
    const ending = endings['train-gone']

    render(
      <EndingScreen
        ending={ending}
        onCollect={vi.fn()}
        onRestart={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    )

    expect(screen.getByText('结局 01')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '列车已经开走' }),
    ).toBeInTheDocument()
    expect(screen.getByText(ending.summary)).toBeInTheDocument()
    for (const paragraph of ending.epilogue) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
  })

  it('准确触发收藏、重新开始和设置操作', async () => {
    const user = userEvent.setup()
    const onCollect = vi.fn()
    const onRestart = vi.fn()
    const onOpenSettings = vi.fn()

    render(
      <EndingScreen
        ending={endings.unanswered}
        onCollect={onCollect}
        onRestart={onRestart}
        onOpenSettings={onOpenSettings}
      />,
    )

    await user.click(screen.getByRole('button', { name: '收下这张残票' }))
    await user.click(screen.getByRole('button', { name: '重回雨夜' }))
    await user.click(screen.getByRole('button', { name: '打开设置' }))

    expect(onCollect).toHaveBeenCalledOnce()
    expect(onRestart).toHaveBeenCalledOnce()
    expect(onOpenSettings).toHaveBeenCalledOnce()
  })
})
