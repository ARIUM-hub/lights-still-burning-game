import type { CharacterNames, DialogueLine } from '../engine/types'

const NAME_TOKENS = {
  protagonist: '小丑',
  heroine: '小美',
} as const

function normalizeName(value: string, fallback: string): string {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function normalizeCharacterNames(
  names: Partial<CharacterNames> | null | undefined,
): CharacterNames {
  return {
    protagonist: normalizeName(
      names?.protagonist ?? '',
      NAME_TOKENS.protagonist,
    ),
    heroine: normalizeName(names?.heroine ?? '', NAME_TOKENS.heroine),
  }
}

export function replaceCharacterNames(
  text: string,
  names: CharacterNames,
): string {
  const normalized = normalizeCharacterNames(names)

  return text
    .replaceAll(NAME_TOKENS.protagonist, normalized.protagonist)
    .replaceAll(NAME_TOKENS.heroine, normalized.heroine)
}

export function applyCharacterNamesToLine(
  line: DialogueLine,
  names: CharacterNames,
): DialogueLine {
  return {
    ...line,
    speaker:
      line.speaker === undefined
        ? undefined
        : replaceCharacterNames(line.speaker, names),
    text: replaceCharacterNames(line.text, names),
  }
}

export function applyCharacterNamesToLines(
  lines: DialogueLine[],
  names: CharacterNames,
): DialogueLine[] {
  return lines.map((line) => applyCharacterNamesToLine(line, names))
}
