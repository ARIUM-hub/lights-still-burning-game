import type { AiStoryDraft } from '../src/ai/types'
import type { AiServerConfig } from './config'

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')

  if (trimmed.endsWith('/chat/completions')) {
    return trimmed
  }

  return `${trimmed}/chat/completions`
}

function buildMessages(options: AiStoryDraft) {
  const protagonistName = options.protagonistName.trim() || '主角'
  const tone = options.tone.trim() || '都市雨夜、克制、遗憾、没有完美结局'

  return [
    {
      role: 'system',
      content: [
        '你是一名互动小说编剧。',
        '请生成一个受《灯火未熄》气质启发的中文分支故事。',
        '要求：都市雨夜、情感错位、2到3个结局、没有绝对圆满结局、文本克制、场景具体。',
        '请只返回 JSON，不要输出解释或 Markdown。',
        'JSON 结构必须包含：title、subtitle、premise、startNodeId、nodes。',
        'nodes 中每个节点必须包含：id、title、scene、lines。',
        '普通节点必须提供 next 或 choices 二选一。',
        '结局节点必须提供 ending，且不能再提供 next 或 choices。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `故事需求：${options.brief.trim()}`,
        `主角名字：${protagonistName}`,
        `整体基调：${tone}`,
        '请控制在 5 到 8 个节点内，起始节点 ID 固定为 opening。',
        '每个 choices 节点给出 2 个选项。',
        'ending 里的 epilogue 给 1 到 3 段。',
      ].join('\n'),
    },
  ]
}

export async function requestAiStoryCompletion(
  config: AiServerConfig,
  draft: AiStoryDraft,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(normalizeBaseUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.9,
      messages: buildMessages(draft),
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      detail.trim().length === 0
        ? `AI 请求失败（HTTP ${response.status}）`
        : `AI 请求失败（HTTP ${response.status}）：${detail.trim()}`,
    )
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('AI 没有返回可解析的故事内容。')
  }

  return content
}
