import type { SaveData, StoryProgress } from './types'

export function createInitialProgress(
  nodeId = 'act1_opening',
): StoryProgress {
  return {
    nodeId,
    lineIndex: 0,
    stats: {
      courage: 0,
      attachment: 0,
      selfDenial: 0,
    },
    relations: {
      xiaomeiTrust: 0,
      dazhuangOpenness: 0,
      xiaoliAdvice: 0,
    },
    flags: [],
    completedActs: [],
  }
}

export function createInitialSave(): SaveData {
  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    schemaVersion: 1,
    progress: null,
    unlockedEndings: [],
    settings: {
      soundEnabled: false,
      masterVolume: 0.45,
      textSpeed: 'normal',
      reducedMotion,
    },
  }
}
