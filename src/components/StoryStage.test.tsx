import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Choice } from '../engine/types'
import { StoryStage } from './StoryStage'

const choices: Choice[] = [
  { id: 'stay', label: '留下', next: 'next-a' },
  { id: 'go', label: '离开', next: 'next-b' },
  { id: 'ask', label: '追问', next: 'next-c' },
]

describe('StoryStage', () => {
  afterEach(cleanup)

  it('显示标题、台词与装饰场景图', () => {
    render(
      <StoryStage
        scene="cafe"
        title="高架桥下的灯"
        line={{ text: '雨落下来。' }}
        choices={[]}
        onAdvance={vi.fn()}
        onChoose={vi.fn()}
        textSpeed="instant"
        reducedMotion={false}
      />,
    )

    expect(
      screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '高架桥下的灯' })).toBeInTheDocument()
    expect(screen.getByText('雨落下来。')).toBeInTheDocument()
    const image = document.querySelector('.story-stage__scene-image')
    expect(image).toHaveAttribute('src', '/images/scenes/cafe.webp')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('aria-hidden', 'true')
  })

  it('图片加载失败后隐藏破图并显示 scene-fallback', () => {
    const { container } = render(
      <StoryStage
        scene="station"
        title="站台"
        line={{ text: '列车将要进站。' }}
        choices={[]}
        onAdvance={vi.fn()}
        onChoose={vi.fn()}
        textSpeed="instant"
        reducedMotion={false}
      />,
    )
    const image = container.querySelector('.story-stage__scene-image')!

    fireEvent.error(image)

    expect(container.querySelector('.story-stage__scene-image')).not.toBeInTheDocument()
    expect(container.querySelector('.scene-fallback')).toBeInTheDocument()
  })

  it('逐字完成前隐藏选择，补全文后显示并回传选择', () => {
    const onChoose = vi.fn()
    render(
      <StoryStage
        scene="cafe"
        title="选择"
        line={{ text: '先读完。' }}
        choices={choices}
        onAdvance={vi.fn()}
        onChoose={onChoose}
        textSpeed="normal"
        reducedMotion={false}
      />,
    )

    expect(screen.queryByRole('button', { name: /01.*留下/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '推进剧情' }))
    fireEvent.click(screen.getByRole('button', { name: /01.*留下/ }))

    expect(onChoose).toHaveBeenCalledWith('stay')
  })

  it('instant 立即显示选择，数字键 1-3 可触发对应项', () => {
    const onChoose = vi.fn()
    render(
      <StoryStage
        scene="street"
        title="街口"
        line={{ text: '请选择。' }}
        choices={choices}
        onAdvance={vi.fn()}
        onChoose={onChoose}
        textSpeed="instant"
        reducedMotion={false}
      />,
    )
    const stage = screen.getByRole('region', { name: '剧情场景：街口' })

    expect(screen.getByRole('button', { name: /03.*追问/ })).toBeInTheDocument()
    stage.focus()
    fireEvent.keyDown(stage, { key: '2' })

    expect(onChoose).toHaveBeenCalledWith('go')
  })

  it('焦点停在对白按钮时数字键仍可选择', () => {
    const onChoose = vi.fn()
    render(
      <StoryStage
        scene="street"
        title="街口"
        line={{ text: '请选择。' }}
        choices={choices}
        onAdvance={vi.fn()}
        onChoose={onChoose}
        textSpeed="instant"
        reducedMotion={false}
      />,
    )

    const dialogueButton = screen.getByRole('button', { name: '推进剧情' })
    dialogueButton.focus()
    fireEvent.keyDown(dialogueButton, { key: '2' })

    expect(onChoose).toHaveBeenCalledWith('go')
  })

  it('Enter 和 Space 遵守先补全文再推进并阻止默认行为', () => {
    const onAdvance = vi.fn()
    render(
      <StoryStage
        scene="apartment"
        title="楼道"
        line={{ text: '先完整读完。' }}
        choices={[]}
        onAdvance={onAdvance}
        onChoose={vi.fn()}
        textSpeed="normal"
        reducedMotion={false}
      />,
    )
    const stage = screen.getByRole('region', { name: '剧情场景：楼道' })

    stage.focus()
    expect(fireEvent.keyDown(stage, { key: 'Enter' })).toBe(false)
    expect(screen.getByText('先完整读完。')).toBeInTheDocument()
    expect(onAdvance).not.toHaveBeenCalled()

    expect(fireEvent.keyDown(stage, { key: ' ' })).toBe(false)
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })
})
