import { describe, expect, it } from 'vitest'

import packageJsonSource from '../../package.json?raw'

const packageJson = JSON.parse(packageJsonSource) as {
  scripts: Record<string, string>
}

describe('Railway 启动脚本', () => {
  it('暴露标准 npm start 入口给 Railway 自动识别', () => {
    expect(packageJson.scripts.start).toBe('npm run start:server')
    expect(packageJson.scripts['start:server']).toBe(
      'node --import tsx server/index.ts',
    )
  })
})
