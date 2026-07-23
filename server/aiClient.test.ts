import { describe, expect, it, vi } from 'vitest'

import { requestAiStoryCompletion } from './aiClient'

const config = {
  baseUrl: 'https://example.com/v1',
  model: 'test-model',
  apiKey: 'secret',
  port: 8787,
}

describe('requestAiStoryCompletion', () => {
  it('上游 HTTP 失败时返回中文错误', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: vi.fn().mockResolvedValue('bad gateway'),
    })

    await expect(
      requestAiStoryCompletion(
        config,
        {
          brief: '写一个雨夜故事',
          protagonistName: '周岚',
          tone: '克制',
        },
        fetchMock as typeof fetch,
      ),
    ).rejects.toThrow('AI 请求失败（HTTP 502）：bad gateway')
  })

  it('成功时返回 message.content 文本', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content:
                '{"title":"雨夜","subtitle":"副题","premise":"前提","startNodeId":"opening","nodes":[]}',
            },
          },
        ],
      }),
    })

    await expect(
      requestAiStoryCompletion(
        config,
        {
          brief: '写一个雨夜故事',
          protagonistName: '周岚',
          tone: '克制',
        },
        fetchMock as typeof fetch,
      ),
    ).resolves.toContain('"title":"雨夜"')
  })
})
