import { describe, expect, it, vi } from 'vitest'

import { generateAiStory } from './storyClient'

describe('generateAiStory', () => {
  it('公网代理不可达时提示服务暂时不可用', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

    await expect(
      generateAiStory(
        {
          brief: '写一个雨夜故事',
          protagonistName: '周岚',
          tone: '克制',
        },
        fetchMock as typeof fetch,
        'https://story-proxy.up.railway.app/api/ai-story',
      ),
    ).rejects.toThrow('AI 故事服务暂时不可用，请稍后再试。')
  })

  it('调用本地代理成功后返回故事对象', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        title: '雨夜',
        subtitle: '副题',
        premise: '前提',
        startNodeId: 'opening',
        nodes: [
          {
            id: 'opening',
            title: '站台',
            scene: '深夜站台只剩雨声和昏黄灯光。',
            lines: [
              { speaker: '周岚', text: '雨下得比我想的还大。' },
              { text: '远处列车广播在空旷站台里反复回响。' },
            ],
            choices: [
              {
                id: 'wait-train',
                label: '继续等车',
                next: 'station',
              },
              {
                id: 'go-counter',
                label: '去值班窗口',
                next: 'counter',
              },
            ],
          },
          {
            id: 'station',
            title: '末班车',
            scene: '列车进站时带起一阵潮湿冷风。',
            lines: [{ text: '周岚上车后，终于松开了攥紧的伞柄。' }],
            ending: {
              id: 'ending-last-train',
              title: '赶上末班车',
              summary: '你在最后一刻离开了雨夜站台。',
              epilogue: ['车窗上的水痕慢慢模糊了整座城市。'],
            },
          },
          {
            id: 'counter',
            title: '窗口',
            scene: '值班窗口的灯还亮着，像专门为迟到的人留的一口气。',
            lines: [{ text: '老值班员抬头看了她一眼，轻轻递来一杯热水。' }],
            ending: {
              id: 'ending-hot-water',
              title: '灯火未熄',
              summary: '有人在深夜里替你守住了最后一点暖意。',
              epilogue: ['雨还在下，但站台的灯火并没有熄灭。'],
            },
          },
        ],
      }),
    })

    const story = await generateAiStory(
      {
        brief: '写一个雨夜故事',
        protagonistName: '周岚',
        tone: '克制',
      },
      fetchMock as typeof fetch,
      'https://story-proxy.up.railway.app/api/ai-story',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://story-proxy.up.railway.app/api/ai-story',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(story.title).toBe('雨夜')
  })
})
