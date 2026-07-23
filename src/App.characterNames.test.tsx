import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import App from './App'
import { loadSave } from './state/saveRepository'

describe('App character names', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('通过命名页确认自定义名字后会写入存档并进入剧情', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '开始故事' }))
    await user.clear(screen.getByLabelText('男主名字'))
    await user.type(screen.getByLabelText('男主名字'), '周岚')
    await user.clear(screen.getByLabelText('女主名字'))
    await user.type(screen.getByLabelText('女主名字'), '林灯')
    await user.click(
      screen.getByRole('button', { name: '带着名字开始故事' }),
    )
    expect(loadSave().characterNames).toEqual({
      protagonist: '周岚',
      heroine: '林灯',
    })
    expect(
      screen.getByRole('region', { name: '剧情场景：高架桥下的灯' }),
    ).toBeInTheDocument()
  })
})
