import type {
  Choice,
  Condition,
  EndingId,
  StatKey,
  StoryNode,
  StoryProgress,
} from './types'

const STAT_KEYS: StatKey[] = ['courage', 'attachment', 'selfDenial']

export function applyChoice(
  progress: StoryProgress,
  choice: Choice,
): StoryProgress {
  return {
    ...progress,
    nodeId: choice.next,
    lineIndex: 0,
    stats: {
      courage:
        progress.stats.courage + (choice.effects?.stats?.courage ?? 0),
      attachment:
        progress.stats.attachment + (choice.effects?.stats?.attachment ?? 0),
      selfDenial:
        progress.stats.selfDenial + (choice.effects?.stats?.selfDenial ?? 0),
    },
    relations: {
      xiaomeiTrust:
        progress.relations.xiaomeiTrust +
        (choice.effects?.relations?.xiaomeiTrust ?? 0),
      dazhuangOpenness:
        progress.relations.dazhuangOpenness +
        (choice.effects?.relations?.dazhuangOpenness ?? 0),
      xiaoliAdvice:
        progress.relations.xiaoliAdvice +
        (choice.effects?.relations?.xiaoliAdvice ?? 0),
    },
    flags: [
      ...new Set([...progress.flags, ...(choice.effects?.flags ?? [])]),
    ],
    completedActs: [...progress.completedActs],
  }
}

export function matches(
  progress: StoryProgress,
  condition: Condition,
): boolean {
  return (
    (condition.flagsAll?.every((flag) => progress.flags.includes(flag)) ??
      true) &&
    (condition.flagsNone?.every((flag) => !progress.flags.includes(flag)) ??
      true) &&
    STAT_KEYS.every((key) => {
      const minimum = condition.statMin?.[key]

      return minimum === undefined || progress.stats[key] >= minimum
    }) &&
    STAT_KEYS.every((key) => {
      const maximum = condition.statMax?.[key]

      return maximum === undefined || progress.stats[key] <= maximum
    })
  )
}

export function linesFor(node: StoryNode, progress: StoryProgress) {
  return (
    node.variants?.find((variant) => matches(progress, variant.when))?.lines ??
    node.lines
  )
}

export function resolveEnding(progress: StoryProgress): EndingId {
  const flags = new Set(progress.flags)

  if (flags.has('startedJourney')) {
    return 'next-city'
  }

  if (flags.has('arrivedBeforeNine') && flags.has('doubtedAtPlatform')) {
    return 'platform-divide'
  }

  if (flags.has('explicitlyRefused')) {
    return 'better-person'
  }

  if (flags.has('arrivedAfterDeparture')) {
    return 'train-gone'
  }

  return 'unanswered'
}
