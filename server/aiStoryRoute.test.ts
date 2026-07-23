import { describe, expect, it, vi } from 'vitest'

import { handleAiStoryRequest } from './aiStoryRoute'

describe('handleAiStoryRequest', () => {
  it('brief 为空时返回 400 和中文错误', async () => {
    const response = await handleAiStoryRequest(
      {
        method: 'POST',
        body: JSON.stringify({
          brief: '',
          protagonistName: '周岚',
          tone: '克制',
        }),
      },
      {
        loadConfig: vi.fn(),
        requestCompletion: vi.fn(),
        validateStory: vi.fn(),
      },
    )

    expect(response.status).toBe(400)
    expect(response.body).toContain('请先填写故事需求')
  })

  it('代理不可用错误会透传给前端', async () => {
    const response = await handleAiStoryRequest(
      {
        method: 'POST',
        body: JSON.stringify({
          brief: '写一个雨夜故事',
          protagonistName: '周岚',
          tone: '克制',
        }),
      },
      {
        loadConfig: vi.fn(() => {
          throw new Error('AI 服务缺少必要配置，请检查服务端环境变量。')
        }),
        requestCompletion: vi.fn(),
        validateStory: vi.fn(),
      },
    )

    expect(response.status).toBe(500)
    expect(response.body).toContain('AI 服务缺少必要配置')
  })
})
