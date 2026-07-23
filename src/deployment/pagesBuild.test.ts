import { describe, expect, it } from 'vitest'

import packageJsonSource from '../../package.json?raw'

const packageJson = JSON.parse(packageJsonSource) as {
  scripts: Record<string, string>
}

describe('GitHub Pages 构建', () => {
  it('使用仓库子路径构建静态资源', () => {
    expect(packageJson.scripts['build:pages']).toBe(
      'tsc --noEmit && vite build --base=/lights-still-burning-game/',
    )
  })
})
