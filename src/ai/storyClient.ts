import { resolveAiProxyUrl } from './proxyUrl'
import { validateGeneratedStory } from './storySchema'
import type { GeneratedStory } from './types'

interface GenerateAiStoryOptions {
  brief: string
  protagonistName?: string
  tone?: string
}

export async function generateAiStory(
  options: GenerateAiStoryOptions,
  fetchImpl: typeof fetch = fetch,
  proxyUrl: string = resolveAiProxyUrl(),
): Promise<GeneratedStory> {
  if (options.brief.trim().length === 0) {
    throw new Error('请先填写故事需求')
  }

  let response: Response
  try {
    response = await fetchImpl(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })
  } catch {
    throw new Error('AI 故事服务暂时不可用，请稍后再试。')
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
