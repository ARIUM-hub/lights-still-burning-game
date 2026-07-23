import { describe, expect, it } from 'vitest'

import { resolveAiProxyUrl } from './proxyUrl'

describe('resolveAiProxyUrl', () => {
  it('优先返回构建时注入的 Railway 代理地址', () => {
    expect(
      resolveAiProxyUrl({
        VITE_AI_PROXY_URL: 'https://story-proxy.up.railway.app/api/ai-story',
      }),
    ).toBe('https://story-proxy.up.railway.app/api/ai-story')
  })

  it('缺少构建变量时回退到本地代理地址', () => {
    expect(resolveAiProxyUrl({})).toBe('http://127.0.0.1:8787/api/ai-story')
  })
})
