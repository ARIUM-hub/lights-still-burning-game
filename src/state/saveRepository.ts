import { createInitialSave } from '../engine/initialState'
import type {
  CharacterNames,
  EndingId,
  SaveData,
  Settings,
  StoryProgress,
} from '../engine/types'
import { normalizeCharacterNames } from '../story/characterNames'

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
  return typeof value === 'string' && endingIds.includes(value as EndingId)
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

function readCharacterNames(value: unknown): CharacterNames {
  if (!isRecord(value)) {
    return normalizeCharacterNames(undefined)
  }

  return normalizeCharacterNames({
    protagonist:
      typeof value.protagonist === 'string' ? value.protagonist : undefined,
    heroine: typeof value.heroine === 'string' ? value.heroine : undefined,
  })
}

function normalizeSaveData(value: unknown): SaveData | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null
  if (value.progress !== null && !isStoryProgress(value.progress)) return null
  if (
    !Array.isArray(value.unlockedEndings) ||
    !value.unlockedEndings.every(isEndingId)
  ) {
    return null
  }
  if (!isSettings(value.settings)) return null

  return {
    schemaVersion: 1,
    progress: value.progress,
    unlockedEndings: [...value.unlockedEndings],
    settings: value.settings,
    characterNames: readCharacterNames(value.characterNames),
  }
}

export function loadSave(): SaveData {
  try {
    const stored = localStorage.getItem(SAVE_KEY)
    if (stored === null) return createInitialSave()

    const parsed: unknown = JSON.parse(stored)
    return normalizeSaveData(parsed) ?? createInitialSave()
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
    characterNames: { ...save.characterNames },
  }
}

export function clearCollection(save: SaveData): SaveData {
  return {
    ...save,
    progress: null,
    unlockedEndings: [],
    characterNames: { ...save.characterNames },
  }
}
