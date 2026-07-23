import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadAiServerConfig } from './config'

describe('loadAiServerConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('缺少必要环境变量时抛出统一中文错误', () => {
    vi.stubEnv('AI_BASE_URL', '')
    vi.stubEnv('AI_MODEL', '')
    vi.stubEnv('AI_API_KEY', '')

    expect(() => loadAiServerConfig()).toThrowError(
      'AI 服务缺少必要配置，请检查服务端环境变量。',
    )
  })

  it('使用默认端口 8787', () => {
    vi.stubEnv('AI_BASE_URL', 'https://example.com/v1')
    vi.stubEnv('AI_MODEL', 'test-model')
    vi.stubEnv('AI_API_KEY', 'secret')
    vi.stubEnv('AI_SERVER_PORT', '')

    expect(loadAiServerConfig().port).toBe(8787)
  })

  it('优先使用 Railway 注入的 PORT', () => {
    vi.stubEnv('AI_BASE_URL', 'https://example.com/v1')
    vi.stubEnv('AI_MODEL', 'test-model')
    vi.stubEnv('AI_API_KEY', 'secret')
    vi.stubEnv('PORT', '4312')
    vi.stubEnv('AI_SERVER_PORT', '8787')

    expect(loadAiServerConfig().port).toBe(4312)
  })

  it('暴露固定来源白名单', () => {
    vi.stubEnv('AI_BASE_URL', 'https://example.com/v1')
    vi.stubEnv('AI_MODEL', 'test-model')
    vi.stubEnv('AI_API_KEY', 'secret')

    expect(loadAiServerConfig().allowedOrigins).toEqual([
      'https://arium-hub.github.io',
      'http://localhost:5173',
    ])
  })
})
