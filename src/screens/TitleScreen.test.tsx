import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TitleScreen } from './TitleScreen'

function renderTitleScreen(
  overrides: Partial<React.ComponentProps<typeof TitleScreen>> = {},
) {
  const props: React.ComponentProps<typeof TitleScreen> = {
    hasProgress: false,
    recoverableError: null,
    onStart: vi.fn(),
    onContinue: vi.fn(),
    onRestart: vi.fn(),
    hasMemories: false,
    onOpenMemory: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  }

  return { ...render(<TitleScreen {...props} />), props }
}

describe('TitleScreen', () => {
  afterEach(cleanup)

  it('无进度时显示标题、主题句和开始故事按钮', async () => {
    const user = userEvent.setup()
    const { props } = renderTitleScreen()

    expect(screen.getByRole('heading', { name: '灯火未熄' })).toBeInTheDocument()
    expect(screen.getByText('有些人不是离开了才失去。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '继续雨夜' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '从头开始' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '开始故事' }))
    expect(props.onStart).toHaveBeenCalledOnce()
  })

  it('有进度时继续与从头开始分别调用准确回调', async () => {
    const user = userEvent.setup()
    const { props } = renderTitleScreen({ hasProgress: true })

    expect(screen.queryByRole('button', { name: '开始故事' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '继续雨夜' }))
    await user.click(screen.getByRole('button', { name: '从头开始' }))

    expect(props.onContinue).toHaveBeenCalledOnce()
    expect(props.onRestart).toHaveBeenCalledOnce()
    expect(props.onStart).not.toHaveBeenCalled()
  })

  it('设置按钮调用打开设置回调，并以 status 呈现可恢复错误', async () => {
    const user = userEvent.setup()
    const { props } = renderTitleScreen({ recoverableError: '存档已恢复' })

    expect(screen.getByRole('status')).toHaveTextContent('存档已恢复')
    await user.click(screen.getByRole('button', { name: '设置' }))

    expect(props.onOpenSettings).toHaveBeenCalledOnce()
  })

  it('首次通关后显示雨夜回忆入口', async () => {
    const user = userEvent.setup()
    const { props } = renderTitleScreen({ hasMemories: true })

    await user.click(screen.getByRole('button', { name: '雨夜回忆' }))

    expect(props.onOpenMemory).toHaveBeenCalledOnce()
  })
})
