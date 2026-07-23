import { validateGeneratedStory } from './storySchema'
import type { GeneratedStory } from './types'

interface GenerateAiStoryOptions {
  brief: string
  protagonistName?: string
  tone?: string
}

const LOCAL_AI_PROXY_URL = 'http://127.0.0.1:8787/api/ai-story'

export async function generateAiStory(
  options: GenerateAiStoryOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<GeneratedStory> {
  if (options.brief.trim().length === 0) {
    throw new Error('请先填写故事需求')
  }

  let response: Response
  try {
    response = await fetchImpl(LOCAL_AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })
  } catch {
    throw new Error('请先启动本地 AI 服务。')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      payload !== null &&
      typeof payload === 'object' &&
      typeof payload.error === 'string'
        ? payload.error
        : '生成故事时发生未知错误。'
    throw new Error(message)
  }

  const payload = await response.json()
  const validation = validateGeneratedStory(payload)

  if (!validation.ok) {
    throw new Error(`AI 返回的故事结构无效：${validation.reason}`)
  }

  return validation.story
}
