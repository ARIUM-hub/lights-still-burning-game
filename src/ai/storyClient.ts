import { validateGeneratedStory } from './storySchema'
import type { AiConnectionConfig, GeneratedStory } from './types'

interface GenerateAiStoryOptions {
  brief: string
  protagonistName?: string
  tone?: string
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')

  if (trimmed.endsWith('/chat/completions')) {
    return trimmed
  }

  return `${trimmed}/chat/completions`
}

function buildMessages(options: GenerateAiStoryOptions) {
  const protagonistName = options.protagonistName?.trim() || '主角'
  const tone = options.tone?.trim() || '都市雨夜、克制、遗憾、没有完美结局'

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

function extractJson(content: string): string {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch) {
    return fencedMatch[1].trim()
  }

  return content.trim()
}

function errorMessageFromStatus(
  status: number,
  detail: string,
): string {
  if (detail.length === 0) {
    return `AI 请求失败（HTTP ${status}）`
  }

  return `AI 请求失败（HTTP ${status}）：${detail}`
}

export async function generateAiStory(
  config: AiConnectionConfig,
  options: GenerateAiStoryOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<GeneratedStory> {
  if (config.baseUrl.trim().length === 0) {
    throw new Error('请先填写 API 基础地址')
  }
  if (config.apiKey.trim().length === 0) {
    throw new Error('请先填写 API Key')
  }
  if (config.model.trim().length === 0) {
    throw new Error('请先填写模型名称')
  }
  if (options.brief.trim().length === 0) {
    throw new Error('请先填写故事需求')
  }

  const response = await fetchImpl(normalizeBaseUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim(),
      temperature: 0.9,
      messages: buildMessages(options),
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(errorMessageFromStatus(response.status, detail.trim()))
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('AI 没有返回可解析的故事内容')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(content))
  } catch {
    throw new Error('AI 返回的内容不是合法 JSON')
  }

  const validation = validateGeneratedStory(parsed)
  if (!validation.ok) {
    throw new Error(`AI 返回的故事结构无效：${validation.reason}`)
  }

  return validation.story
}
