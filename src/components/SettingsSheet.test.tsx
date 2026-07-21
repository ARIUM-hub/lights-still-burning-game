import { useState } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Settings } from '../engine/types'
import { SettingsSheet } from './SettingsSheet'

const settings: Settings = {
  soundEnabled: false,
  masterVolume: 0.45,
  textSpeed: 'normal',
  reducedMotion: false,
}

interface HarnessProps {
  initiallyOpen?: boolean
  onChange?: (patch: Partial<Settings>) => void
  onClearRoute?: () => void
  onClearAllProgress?: () => void
}

function Harness({
  initiallyOpen = true,
  onChange = () => undefined,
  onClearRoute = () => undefined,
  onClearAllProgress = () => undefined,
}: HarnessProps) {
  const [open, setOpen] = useState(initiallyOpen)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        打开测试设置
      </button>
      <SettingsSheet
        open={open}
        settings={settings}
        onChange={onChange}
        onClose={() => setOpen(false)}
        onClearRoute={onClearRoute}
        onClearAllProgress={onClearAllProgress}
      />
    </>
  )
}

describe('SettingsSheet', () => {
  afterEach(cleanup)

  it('关闭时不渲染，打开时提供带标题的模态对话框', async () => {
    const user = userEvent.setup()
    render(<Harness initiallyOpen={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '打开测试设置' }))

    const dialog = screen.getByRole('dialog', { name: '设置' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: '设置' })).toBeInTheDocument()
  })

  it('每个字段都有标签，并且每次只回传对应设置 patch', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('checkbox', { name: '开启声音' }))
    expect(onChange).toHaveBeenLastCalledWith({ soundEnabled: true })

    const volume = screen.getByRole('slider', { name: '总音量' })
    expect(volume).toHaveAttribute('min', '0')
    expect(volume).toHaveAttribute('max', '1')
    expect(volume).toHaveAttribute('step', '0.05')
    fireEvent.change(volume, { target: { value: '0.7' } })
    expect(onChange).toHaveBeenLastCalledWith({ masterVolume: 0.7 })

    await user.selectOptions(
      screen.getByRole('combobox', { name: '文字速度' }),
      'instant',
    )
    expect(onChange).toHaveBeenLastCalledWith({ textSpeed: 'instant' })
    expect(screen.getByRole('option', { name: '慢' })).toHaveValue('slow')
    expect(screen.getByRole('option', { name: '正常' })).toHaveValue('normal')
    expect(screen.getByRole('option', { name: '立即' })).toHaveValue('instant')

    await user.click(screen.getByRole('checkbox', { name: '减少动态' }))
    expect(onChange).toHaveBeenLastCalledWith({ reducedMotion: true })
    expect(onChange).toHaveBeenCalledTimes(4)
  })

  it('清除当前路线需要独立确认，可取消且确认后调用一次', async () => {
    const user = userEvent.setup()
    const onClearRoute = vi.fn()
    render(<Harness onClearRoute={onClearRoute} />)

    await user.click(screen.getByRole('button', { name: '清除当前路线' }))
    expect(onClearRoute).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '取消清除当前路线' }))
    expect(
      screen.queryByRole('button', { name: '确认清除当前路线' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清除当前路线' }))
    await user.click(
      screen.getByRole('button', { name: '确认清除当前路线' }),
    )

    expect(onClearRoute).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('button', { name: '确认清除当前路线' }),
    ).not.toBeInTheDocument()
  })

  it('清除全部收藏需要独立确认，可取消且确认后调用一次', async () => {
    const user = userEvent.setup()
    const onClearAllProgress = vi.fn()
    render(<Harness onClearAllProgress={onClearAllProgress} />)

    await user.click(screen.getByRole('button', { name: '清除全部收藏' }))
    expect(onClearAllProgress).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '取消清除全部收藏' }))
    expect(
      screen.queryByRole('button', { name: '确认清除全部收藏' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '清除全部收藏' }))
    await user.click(
      screen.getByRole('button', { name: '确认清除全部收藏' }),
    )

    expect(onClearAllProgress).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('button', { name: '确认清除全部收藏' }),
    ).not.toBeInTheDocument()
  })

  it('打开时聚焦关闭按钮，Escape 关闭后恢复此前焦点', async () => {
    const user = userEvent.setup()
    render(<Harness initiallyOpen={false} />)
    const opener = screen.getByRole('button', { name: '打开测试设置' })

    await user.click(opener)

    expect(screen.getByRole('button', { name: '关闭设置' })).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(opener).toHaveFocus())
  })

  it('打开时隔离背景并把 Tab 焦点限制在对话框内', async () => {
    const user = userEvent.setup()
    render(<Harness initiallyOpen={false} />)
    const opener = screen.getByRole('button', { name: '打开测试设置' })

    await user.click(opener)

    expect(opener).toHaveAttribute('inert')
    const closeButton = screen.getByRole('button', { name: '关闭设置' })
    const lastButton = screen.getByRole('button', { name: '清除全部收藏' })
    expect(closeButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(lastButton).toHaveFocus()

    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.click(closeButton)
    expect(opener).not.toHaveAttribute('inert')
  })

  it('进入和取消二次确认时把焦点移到新出现的操作', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: '清除当前路线' }))
    expect(
      screen.getByRole('button', { name: '确认清除当前路线' }),
    ).toHaveFocus()

    await user.click(
      screen.getByRole('button', { name: '取消清除当前路线' }),
    )
    expect(
      screen.getByRole('button', { name: '清除当前路线' }),
    ).toHaveFocus()
  })

  it('点击关闭后恢复此前焦点，并在再次打开时重置确认态', async () => {
    const user = userEvent.setup()
    render(<Harness initiallyOpen={false} />)
    const opener = screen.getByRole('button', { name: '打开测试设置' })

    await user.click(opener)
    await user.click(screen.getByRole('button', { name: '清除当前路线' }))
    expect(
      screen.getByRole('button', { name: '确认清除当前路线' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '关闭设置' }))
    await waitFor(() => expect(opener).toHaveFocus())
    await user.click(opener)

    expect(
      screen.queryByRole('button', { name: '确认清除当前路线' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '清除当前路线' })).toBeInTheDocument()
  })
})
