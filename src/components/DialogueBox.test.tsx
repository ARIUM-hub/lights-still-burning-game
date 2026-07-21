import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DialogueBox } from './DialogueBox'

describe('DialogueBox', () => {
  afterEach(cleanup)

  it('显示角色名与正文', () => {
    render(
      <DialogueBox
        line={{ speaker: '小美', text: '你还记得那盏灯吗？' }}
        textSpeed="instant"
        reducedMotion={false}
        onAdvance={vi.fn()}
      />,
    )

    expect(screen.getByText('小美')).toBeInTheDocument()
    expect(screen.getByText('你还记得那盏灯吗？')).toBeInTheDocument()
  })

  it('无 speaker 时提供旁白的读屏文本', () => {
    render(
      <DialogueBox
        line={{ text: '雨声落在玻璃上。' }}
        textSpeed="instant"
        reducedMotion={false}
        onAdvance={vi.fn()}
      />,
    )

    expect(screen.getByText('旁白')).toBeInTheDocument()
  })

  it('第一次点击补全文，第二次点击才推进', () => {
    const onAdvance = vi.fn()
    render(
      <DialogueBox
        line={{ text: '不要跳过这句话。' }}
        textSpeed="normal"
        reducedMotion={false}
        onAdvance={onAdvance}
      />,
    )
    const advanceButton = screen.getByRole('button', { name: '推进剧情' })

    fireEvent.click(advanceButton)
    expect(screen.getByText('不要跳过这句话。')).toBeInTheDocument()
    expect(onAdvance).not.toHaveBeenCalled()

    fireEvent.click(advanceButton)
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })
})
