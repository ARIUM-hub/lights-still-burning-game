import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EndingId } from '../engine/types'
import { MemoryScreen } from './MemoryScreen'

const allEndings: EndingId[] = [
  'train-gone',
  'unanswered',
  'better-person',
  'platform-divide',
  'next-city',
]

describe('MemoryScreen', () => {
  afterEach(cleanup)

  it('固定展示五张车票且不泄露未解锁结局', () => {
    render(
      <MemoryScreen
        unlocked={['train-gone']}
        completedActs={[]}
        onReplay={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getByText('列车已经开走')).toBeInTheDocument()
    expect(screen.queryByText('下一座城市')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('尚未抵达')).toHaveLength(4)
    expect(screen.queryByText(/真正让我失去她/)).not.toBeInTheDocument()
  })

  it('集齐五个结局后显示隐藏独白', () => {
    render(
      <MemoryScreen
        unlocked={allEndings}
        completedActs={[]}
        onReplay={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText(/真正让我失去她的，从来不是那一班列车/)).toBeInTheDocument()
  })

  it('重复的结局记录只计数一次', () => {
    render(
      <MemoryScreen
        unlocked={['train-gone', 'train-gone']}
        completedActs={[]}
        onReplay={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    expect(screen.getByLabelText('已抵达 1 个结局')).toBeInTheDocument()
  })

  it('只启用已完成幕，任一结局解锁后启用全部章节', () => {
    const { rerender } = render(
      <MemoryScreen
        unlocked={[]}
        completedActs={[1, 2]}
        onReplay={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '重玩第一幕' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '重玩第二幕' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '重玩第三幕' })).toBeDisabled()

    rerender(
      <MemoryScreen
        unlocked={['train-gone']}
        completedActs={[]}
        onReplay={vi.fn()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '重玩第五幕' })).toBeEnabled()
  })

  it('把章节编号和返回操作传给准确回调', async () => {
    const user = userEvent.setup()
    const onReplay = vi.fn()
    const onBack = vi.fn()

    render(
      <MemoryScreen
        unlocked={['train-gone']}
        completedActs={[]}
        onReplay={onReplay}
        onBack={onBack}
      />,
    )

    await user.click(screen.getByRole('button', { name: '重玩第四幕' }))
    await user.click(screen.getByRole('button', { name: '返回标题' }))

    expect(onReplay).toHaveBeenCalledWith(4)
    expect(onBack).toHaveBeenCalledOnce()
  })
})
