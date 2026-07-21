import { createInitialSave } from '../engine/initialState'
import type {
  EndingId,
  SaveData,
  Settings,
  StoryProgress,
} from '../engine/types'

export const SAVE_KEY = 'lights-still-burning.save'

const endingIds: readonly EndingId[] = [
  'train-gone',
  'unanswered',
  'better-person',
  'platform-divide',
  'next-city',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStoryProgress(value: unknown): value is StoryProgress {
  if (!isRecord(value)) return false

  const { stats, relations } = value

  return (
    typeof value.nodeId === 'string' &&
    Number.isInteger(value.lineIndex) &&
    (value.lineIndex as number) >= 0 &&
    isRecord(stats) &&
    isFiniteNumber(stats.courage) &&
    isFiniteNumber(stats.attachment) &&
    isFiniteNumber(stats.selfDenial) &&
    isRecord(relations) &&
    isFiniteNumber(relations.xiaomeiTrust) &&
    isFiniteNumber(relations.dazhuangOpenness) &&
    isFiniteNumber(relations.xiaoliAdvice) &&
    Array.isArray(value.flags) &&
    value.flags.every((flag) => typeof flag === 'string') &&
    Array.isArray(value.completedActs) &&
    value.completedActs.every(
      (act) => Number.isInteger(act) && act >= 1 && act <= 5,
    )
  )
}

function isEndingId(value: unknown): value is EndingId {
  return (
    typeof value === 'string' &&
    endingIds.includes(value as EndingId)
  )
}

function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false

  return (
    typeof value.soundEnabled === 'boolean' &&
    isFiniteNumber(value.masterVolume) &&
    value.masterVolume >= 0 &&
    value.masterVolume <= 1 &&
    (value.textSpeed === 'slow' ||
      value.textSpeed === 'normal' ||
      value.textSpeed === 'instant') &&
    typeof value.reducedMotion === 'boolean'
  )
}

function isSaveData(value: unknown): value is SaveData {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    (value.progress === null || isStoryProgress(value.progress)) &&
    Array.isArray(value.unlockedEndings) &&
    value.unlockedEndings.every(isEndingId) &&
    isSettings(value.settings)
  )
}

export function loadSave(): SaveData {
  try {
    const stored = localStorage.getItem(SAVE_KEY)
    if (stored === null) return createInitialSave()

    const parsed: unknown = JSON.parse(stored)
    return isSaveData(parsed) ? parsed : createInitialSave()
  } catch {
    return createInitialSave()
  }
}

export function writeSave(save: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

export function clearCurrentRoute(save: SaveData): SaveData {
  return {
    ...save,
    progress: null,
    unlockedEndings: [...save.unlockedEndings],
  }
}

export function clearCollection(save: SaveData): SaveData {
  return {
    ...save,
    progress: null,
    unlockedEndings: [],
  }
}
