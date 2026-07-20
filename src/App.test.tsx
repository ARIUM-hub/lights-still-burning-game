import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('显示故事标题和开始按钮', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '灯火未熄' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '开始故事' }),
    ).toBeInTheDocument()
  })
})
