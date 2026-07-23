import { describe, expect, it, vi } from 'vitest'

import { generateAiStory } from './storyClient'

const mockResponse = {
  title: '未寄出的车票',
  subtitle: '一通电话之后的长夜',
  premise: '主角在深夜收银台和南站广播之间反复犹豫。',
  startNodeId: 'opening',
  nodes: [
    {
      id: 'opening',
      title: '电话响起',
      scene: '便利店玻璃门外的街灯被雨水拉长。',
      lines: [{ text: '她说，最后一班车还有二十分钟。' }],
      choices: [
        { id: 'leave-now', label: '立刻离开便利店', next: 'station' },
        { id: 'finish-shift', label: '先把手头工作做完', next: 'counter' },
      ],
    },
    {
      id: 'station',
      title: '站台尽头',
      scene: '广播一次次催促旅客检票。',
      lines: [{ text: '你看见她回头时，眼里没有责怪。' }],
      ending: {
        id: 'station',
        title: '站台尽头',
        summary: '你终于赶上了见面的那一刻。',
        epilogue: ['她没有追问迟到的原因，只把伞递过来。'],
      },
    },
    {
      id: 'counter',
      title: '收银台白光',
      scene: '空调风吹得门口风铃轻轻晃动。',
      lines: [{ text: '你决定把最后一笔账单对完，再看一眼手机。' }],
      ending: {
        id: 'counter',
        title: '收银台白光',
        summary: '你留在原地，像从未准备离开。',
        epilogue: ['当你想起要跑时，广播里的列车已经驶离。'],
      },
    },
  ],
}

describe('generateAiStory', () => {
  it('能从 OpenAI 兼容响应里提取并校验 JSON 故事', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(mockResponse, null, 2)}\n\`\`\``,
            },
          },
        ],
      }),
    })

    const story = await generateAiStory(
      {
        apiKey: 'test-key',
        baseUrl: 'https://example.com/v1',
        model: 'test-model',
      },
      {
        brief: '做一个和《灯火未熄》同类的雨夜情感分支故事',
      },
      fetchImpl,
    )

    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(story.title).toBe('未寄出的车票')
    expect(story.startNodeId).toBe('opening')
  })

  it('当返回内容不是合法故事时抛出清晰错误', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"foo":"bar"}' } }],
      }),
    })

    await expect(
      generateAiStory(
        {
          apiKey: 'test-key',
          baseUrl: 'https://example.com/v1',
          model: 'test-model',
        },
        {
          brief: '生成一个新故事',
        },
        fetchImpl,
      ),
    ).rejects.toThrow(/AI 返回的故事结构无效/)
  })
})
