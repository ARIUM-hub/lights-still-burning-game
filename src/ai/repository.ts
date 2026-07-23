import { validateGeneratedStory } from './storySchema'
import type {
  AiStoryDraft,
  AiWorkshopState,
  GeneratedStoryProgress,
} from './types'

export const AI_WORKSHOP_KEY = 'lights-still-burning.ai-workshop'

function defaultDraft(): AiStoryDraft {
  return {
    brief: '写一个发生在都市雨夜的情感分支故事，人物在离开、等待和自我否定之间做选择。',
    protagonistName: '周岚',
    tone: '克制、写实、带一点潮湿的城市灯光感',
  }
}

export function createInitialAiWorkshopState(): AiWorkshopState {
  return {
    schemaVersion: 1,
    draft: defaultDraft(),
    latestStory: null,
    progress: null,
    lastEndingId: null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readProgress(value: unknown): GeneratedStoryProgress | null {
  if (!isRecord(value)) return null
  const { nodeId, lineIndex } = value
  return typeof nodeId === 'string' &&
    typeof lineIndex === 'number' &&
    Number.isInteger(lineIndex) &&
    lineIndex >= 0
    ? {
        nodeId,
        lineIndex,
      }
    : null
}

export function loadAiWorkshopState(): AiWorkshopState {
  const initial = createInitialAiWorkshopState()

  try {
    const raw = localStorage.getItem(AI_WORKSHOP_KEY)
    if (raw === null) return initial

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return initial

    const draft = isRecord(parsed.draft)
      ? {
          brief: readString(parsed.draft.brief) ?? initial.draft.brief,
          protagonistName:
            readString(parsed.draft.protagonistName) ??
            initial.draft.protagonistName,
          tone: readString(parsed.draft.tone) ?? initial.draft.tone,
        }
      : initial.draft

    const storyValidation = validateGeneratedStory(parsed.latestStory)

    return {
      schemaVersion: 1,
      draft,
      latestStory: storyValidation.ok ? storyValidation.story : null,
      progress: readProgress(parsed.progress),
      lastEndingId: readString(parsed.lastEndingId),
    }
  } catch {
    return initial
  }
}

export function writeAiWorkshopState(state: AiWorkshopState): void {
  localStorage.setItem(AI_WORKSHOP_KEY, JSON.stringify(state))
}
