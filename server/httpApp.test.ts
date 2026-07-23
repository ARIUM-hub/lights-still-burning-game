import { describe, expect, it, vi } from 'vitest'

import { createHttpApp } from './httpApp'

describe('createHttpApp', () => {
  it('对 GET /health 返回 200 和 ok:true', async () => {
    const app = createHttpApp({
      allowedOrigins: ['https://arium-hub.github.io'],
      handleAiStory: vi.fn(),
    })

    const response = await app({
      method: 'GET',
      url: '/health',
      origin: 'https://arium-hub.github.io',
      body: '',
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe(JSON.stringify({ ok: true }))
    expect(response.headers['Access-Control-Allow-Origin']).toBe(
      'https://arium-hub.github.io',
    )
  })

  it('对 OPTIONS /api/ai-story 返回 204 预检响应', async () => {
    const app = createHttpApp({
      allowedOrigins: ['https://arium-hub.github.io'],
      handleAiStory: vi.fn(),
    })

    const response = await app({
      method: 'OPTIONS',
      url: '/api/ai-story',
      origin: 'https://arium-hub.github.io',
      body: '',
    })

    expect(response.status).toBe(204)
    expect(response.headers['Access-Control-Allow-Methods']).toContain('POST')
  })

  it('对 POST /api/ai-story 转发给故事处理器', async () => {
    const handleAiStory = vi.fn().mockResolvedValue({
      status: 200,
      body: JSON.stringify({ title: '雨夜' }),
    })
    const app = createHttpApp({
      allowedOrigins: ['https://arium-hub.github.io'],
      handleAiStory,
    })

    const response = await app({
      method: 'POST',
      url: '/api/ai-story',
      origin: 'https://arium-hub.github.io',
      body: '{"brief":"写一个雨夜故事"}',
    })

    expect(handleAiStory).toHaveBeenCalledWith({
      method: 'POST',
      body: '{"brief":"写一个雨夜故事"}',
    })
    expect(response.status).toBe(200)
  })
})
