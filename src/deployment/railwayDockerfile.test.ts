import { describe, expect, it } from 'vitest'

import dockerfileSource from '../../Dockerfile?raw'

describe('Railway Dockerfile', () => {
  it('强制 Railway 运行 Node AI 代理而不是静态前端', () => {
    expect(dockerfileSource).toContain('FROM node:22-alpine')
    expect(dockerfileSource).toContain('npm ci --include=dev')
    expect(dockerfileSource).toContain('CMD ["npm", "run", "start:server"]')
  })
})
