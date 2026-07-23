import {
  validateGeneratedStory,
  type GeneratedStoryValidationResult,
} from '../src/ai/storySchema'
import type { AiStoryDraft } from '../src/ai/types'
import { requestAiStoryCompletion } from './aiClient'
import { loadAiServerConfig, type AiServerConfig } from './config'

interface AiStoryRequestInput {
  method: string
  body: string
}

interface AiStoryRouteDependencies {
  loadConfig: () => AiServerConfig
  requestCompletion: (
    config: AiServerConfig,
    draft: AiStoryDraft,
  ) => Promise<string>
  validateStory: (value: unknown) => GeneratedStoryValidationResult
}

function extractJson(content: string): string {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch) {
    return fencedMatch[1].trim()
  }

  return content.trim()
}

function isStoryDraft(value: unknown): value is AiStoryDraft {
  return typeof value === 'object' && value !== null
}

const defaultDependencies: AiStoryRouteDependencies = {
  loadConfig: () => loadAiServerConfig(),
  requestCompletion: (config, draft) => requestAiStoryCompletion(config, draft),
  validateStory: validateGeneratedStory,
}

export async function handleAiStoryRequest(
  input: AiStoryRequestInput,
  dependencies: AiStoryRouteDependencies = defaultDependencies,
) {
  if (input.method !== 'POST') {
    return {
      status: 405,
      body: JSON.stringify({ error: '请求方法不支持。' }),
    }
  }

  let draft: AiStoryDraft
  try {
    const parsed: unknown = JSON.parse(input.body)
    if (!isStoryDraft(parsed)) {
      throw new Error('invalid')
    }
    draft = {
      brief: typeof parsed.brief === 'string' ? parsed.brief : '',
      protagonistName:
        typeof parsed.protagonistName === 'string' ? parsed.protagonistName : '',
      tone: typeof parsed.tone === 'string' ? parsed.tone : '',
    }
  } catch {
    return {
      status: 400,
      body: JSON.stringify({ error: '请求体不是合法 JSON。' }),
    }
  }

  if (draft.brief.trim().length === 0) {
    return {
      status: 400,
      body: JSON.stringify({ error: '请先填写故事需求' }),
    }
  }

  try {
    const config = dependencies.loadConfig()
    const content = await dependencies.requestCompletion(config, draft)

    let parsed: unknown
    try {
      parsed = JSON.parse(extractJson(content))
    } catch {
      return {
        status: 502,
        body: JSON.stringify({ error: 'AI 返回的内容不是合法 JSON。' }),
      }
    }

    const validation = dependencies.validateStory(parsed)
    if (!validation.ok) {
      return {
        status: 502,
        body: JSON.stringify({
          error: `AI 返回的故事结构无效：${validation.reason}`,
        }),
      }
    }

    return { status: 200, body: JSON.stringify(validation.story) }
  } catch (error) {
    return {
      status: 500,
      body: JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : '生成故事时发生未知错误。',
      }),
    }
  }
}
