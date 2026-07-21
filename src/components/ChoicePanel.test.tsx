import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Choice } from '../engine/types'
import { ChoicePanel } from './ChoicePanel'

const choices: Choice[] = [
  { id: 'wait', label: '留下来等', next: 'next-a' },
  { id: 'leave', label: '转身离开', next: 'next-b' },
  { id: 'ask', label: '问出真相', next: 'next-c' },
]

describe('ChoicePanel', () => {
  afterEach(cleanup)

  it('使用 fieldset、legend 与带序号的原生按钮', () => {
    const { container } = render(
      <ChoicePanel choices={choices} onChoose={vi.fn()} />,
    )

    expect(container.querySelector('fieldset')).toBeInTheDocument()
    expect(screen.getByText('选择你的回应')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /01.*留下来等/ })).toHaveAttribute(
      'data-choice-id',
      'wait',
    )
    expect(screen.getByRole('button', { name: /02.*转身离开/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /03.*问出真相/ })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/[😀-🙏]/u)
  })

  it('点击时回传真实 choice id', () => {
    const onChoose = vi.fn()
    render(<ChoicePanel choices={choices} onChoose={onChoose} />)

    fireEvent.click(screen.getByRole('button', { name: /02.*转身离开/ }))

    expect(onChoose).toHaveBeenCalledWith('leave')
  })
})
