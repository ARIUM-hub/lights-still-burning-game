import { describe, expect, it } from 'vitest'

import globalStyles from './global.css?raw'
import tokens from './tokens.css?raw'

describe('电影感样式契约', () => {
  it('定义雨夜配色、字体、间距和动效令牌', () => {
    expect(tokens).toContain('color-scheme: dark')
    expect(tokens).toContain('--color-bg: #070d17')
    expect(tokens).toContain('--color-accent: #d8a15d')
    expect(tokens).toContain('--color-danger: #f87171')
    expect(tokens).toContain('--font-literary:')
    expect(tokens).toContain('--duration-normal: 260ms')
  })

  it('覆盖移动舞台、安全区、触控目标和键盘焦点', () => {
    expect(globalStyles).toContain('box-sizing: border-box')
    expect(globalStyles).toContain('min-height: 100dvh')
    expect(globalStyles).toContain('env(safe-area-inset-bottom)')
    expect(globalStyles).toMatch(/\.choice-panel__option\s*\{[^}]*min-height:\s*52px/s)
    expect(globalStyles).toContain(':focus-visible')
    expect(globalStyles).toContain('.sr-only')
    expect(globalStyles).toContain('max-width: 42rem')
  })

  it('提供场景降级、车票残角和三档响应式布局', () => {
    expect(globalStyles).toContain('.scene-fallback')
    expect(globalStyles).toContain('.memory-ticket::after')
    expect(globalStyles).toContain('@media (min-width: 375px)')
    expect(globalStyles).toContain('@media (min-width: 768px)')
    expect(globalStyles).toContain('@media (min-width: 1100px)')
  })

  it('系统减少动态效果时关闭动画与平滑滚动', () => {
    expect(globalStyles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(globalStyles).toContain('scroll-behavior: auto !important')
    expect(globalStyles).toContain('animation-duration: 0.01ms !important')
    expect(globalStyles).toContain('transition-duration: 0.01ms !important')
    expect(globalStyles).toContain("[data-reduced-motion='true']")
    expect(globalStyles).toContain(
      ".title-screen[data-reduced-motion='true']::before",
    )
  })

  it('游戏状态提示固定在顶部栏下方且不推动舞台', () => {
    expect(globalStyles).toMatch(
      /\.game-screen__status\s*\{[^}]*position:\s*fixed/s,
    )
    expect(globalStyles).toMatch(
      /\.game-screen__status\s*\{[^}]*top:\s*calc\(/s,
    )
    expect(globalStyles).toMatch(
      /\.game-screen__status\s*\{[^}]*top:\s*calc\(5rem\s*\+/s,
    )
  })
})
