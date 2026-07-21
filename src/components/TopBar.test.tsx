import { createRef } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TopBar } from './TopBar'

describe('TopBar', () => {
  afterEach(cleanup)

  it('显示章节与节点标题，并通过文字按钮打开设置', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()

    render(
      <TopBar
        chapter="第一幕"
        title="高架桥下的灯"
        onOpenSettings={onOpenSettings}
      />,
    )

    expect(screen.getByText('第一幕')).toBeInTheDocument()
    expect(screen.getByText('高架桥下的灯')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开设置' }))

    expect(onOpenSettings).toHaveBeenCalledOnce()
  })

  it('把设置按钮元素交给外部 ref', () => {
    const settingsButtonRef = createRef<HTMLButtonElement>()

    render(
      <TopBar
        chapter="第二幕"
        title="便利店重逢"
        onOpenSettings={() => undefined}
        settingsButtonRef={settingsButtonRef}
      />,
    )

    expect(settingsButtonRef.current).toBe(
      screen.getByRole('button', { name: '打开设置' }),
    )
  })
})
