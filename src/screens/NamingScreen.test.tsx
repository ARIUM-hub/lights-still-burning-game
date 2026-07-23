import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NamingScreen } from './NamingScreen'

function renderNamingScreen(
  overrides: Partial<React.ComponentProps<typeof NamingScreen>> = {},
) {
  const props: React.ComponentProps<typeof NamingScreen> = {
    mode: 'start',
    initialNames: {
      protagonist: '小丑',
      heroine: '小美',
    },
    onConfirm: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  }

  return { ...render(<NamingScreen {...props} />), props }
}

describe('NamingScreen', () => {
  afterEach(cleanup)

  it('按男主在上女主在下展示预填名字', () => {
    renderNamingScreen()

    const protagonist = screen.getByLabelText('男主名字')
    const heroine = screen.getByLabelText('女主名字')

    expect(protagonist).toHaveValue('小丑')
    expect(heroine).toHaveValue('小美')
    expect(
      protagonist.compareDocumentPosition(heroine) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('根据模式切换主按钮文案', () => {
    renderNamingScreen({ mode: 'continue' })

    expect(
      screen.getByRole('button', { name: '带着名字继续雨夜' }),
    ).toBeInTheDocument()
  })

  it('确认时回传当前输入，返回时触发返回回调', async () => {
    const user = userEvent.setup()
    const { props } = renderNamingScreen()

    await user.clear(screen.getByLabelText('男主名字'))
    await user.type(screen.getByLabelText('男主名字'), '周岚')
    await user.clear(screen.getByLabelText('女主名字'))
    await user.type(screen.getByLabelText('女主名字'), '林灯')
    await user.click(screen.getByRole('button', { name: '带着名字开始故事' }))
    await user.click(screen.getByRole('button', { name: '返回标题' }))

    expect(props.onConfirm).toHaveBeenCalledWith({
      protagonist: '周岚',
      heroine: '林灯',
    })
    expect(props.onBack).toHaveBeenCalledOnce()
  })
})
