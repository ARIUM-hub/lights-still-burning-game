import { act, cleanup, render, screen } from '@testing-library/react'
import { createRef, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TypewriterText,
  type TypewriterHandle,
} from './TypewriterText'

describe('TypewriterText', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('normal 按 32ms 逐个显示 Unicode 字符', () => {
    vi.useFakeTimers()
    render(
      <TypewriterText
        text="灯😊火"
        speed="normal"
        reducedMotion={false}
        onDone={vi.fn()}
      />,
    )

    expect(screen.getByTestId('typewriter')).toHaveTextContent('')
    act(() => vi.advanceTimersByTime(32))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('灯')
    act(() => vi.advanceTimersByTime(32))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('灯😊')
    act(() => vi.advanceTimersByTime(32))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('灯😊火')
  })

  it('slow 使用 55ms 间隔', () => {
    vi.useFakeTimers()
    render(
      <TypewriterText
        text="慢读"
        speed="slow"
        reducedMotion={false}
        onDone={vi.fn()}
      />,
    )

    act(() => vi.advanceTimersByTime(54))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('')
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('慢')
  })

  it.each([
    ['instant', false],
    ['normal', true],
  ] as const)('%s 且 reducedMotion=%s 时立即显示全文', (speed, reducedMotion) => {
    render(
      <TypewriterText
        text="立即显示"
        speed={speed}
        reducedMotion={reducedMotion}
        onDone={vi.fn()}
      />,
    )

    expect(screen.getByTestId('typewriter')).toHaveTextContent('立即显示')
  })

  it('text 变化时从新文本开头重新播放', () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <TypewriterText
        text="旧文本"
        speed="normal"
        reducedMotion={false}
        onDone={vi.fn()}
      />,
    )
    act(() => vi.advanceTimersByTime(64))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('旧文')

    rerender(
      <TypewriterText
        text="新内容"
        speed="normal"
        reducedMotion={false}
        onDone={vi.fn()}
      />,
    )
    expect(screen.getByTestId('typewriter')).toHaveTextContent('')
    act(() => vi.advanceTimersByTime(32))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('新')
  })

  it('卸载时清理尚未执行的定时器', () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <TypewriterText
        text="尚未完成"
        speed="normal"
        reducedMotion={false}
        onDone={vi.fn()}
      />,
    )
    expect(vi.getTimerCount()).toBe(1)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('每段文本完成时只回调一次', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const { rerender } = render(
      <TypewriterText
        text="完成"
        speed="normal"
        reducedMotion={false}
        onDone={onDone}
      />,
    )

    act(() => vi.runAllTimers())
    expect(onDone).toHaveBeenCalledTimes(1)
    rerender(
      <TypewriterText
        text="完成"
        speed="normal"
        reducedMotion={false}
        onDone={onDone}
      />,
    )
    act(() => vi.runAllTimers())
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('StrictMode 重放 effect 时完成回调仍只触发一次', () => {
    const onDone = vi.fn()
    render(
      <StrictMode>
        <TypewriterText
          text="立即完成"
          speed="instant"
          reducedMotion={false}
          onDone={onDone}
        />
      </StrictMode>,
    )

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('revealAll 只在未完成时补全文并返回 true', () => {
    vi.useFakeTimers()
    const ref = createRef<TypewriterHandle>()
    render(
      <TypewriterText
        ref={ref}
        text="补全文"
        speed="normal"
        reducedMotion={false}
        onDone={vi.fn()}
      />,
    )

    act(() => expect(ref.current?.revealAll()).toBe(true))
    expect(screen.getByTestId('typewriter')).toHaveTextContent('补全文')
    expect(ref.current?.revealAll()).toBe(false)
  })
})
