export type StatKey = 'courage' | 'attachment' | 'selfDenial'

export type RelationKey =
  | 'xiaomeiTrust'
  | 'dazhuangOpenness'
  | 'xiaoliAdvice'

export type EndingId =
  | 'train-gone'
  | 'unanswered'
  | 'better-person'
  | 'platform-divide'
  | 'next-city'

export type SceneId =
  | 'cafe'
  | 'apartment'
  | 'store'
  | 'riverside'
  | 'warehouse'
  | 'street'
  | 'station'

export type AmbienceId =
  | 'rain'
  | 'cafe'
  | 'store'
  | 'city'
  | 'warehouse'
  | 'train'

export interface DialogueLine {
  speaker?: '小丑' | '小美' | '大壮' | '小丽' | '小帅'
  text: string
}

export interface Effects {
  stats?: Partial<Record<StatKey, number>>
  relations?: Partial<Record<RelationKey, number>>
  flags?: string[]
}

export interface Choice {
  id: string
  label: string
  next: string
  effects?: Effects
}

export interface Condition {
  flagsAll?: string[]
  flagsNone?: string[]
  statMin?: Partial<Record<StatKey, number>>
  statMax?: Partial<Record<StatKey, number>>
}

export interface NodeVariant {
  when: Condition
  lines: DialogueLine[]
}

export interface StoryNode {
  id: string
  act: 1 | 2 | 3 | 4 | 5
  title: string
  scene: SceneId
  ambience: AmbienceId
  lines: DialogueLine[]
  variants?: NodeVariant[]
  choices?: Choice[]
  next?: string
  resolveEnding?: boolean
}

export interface StoryProgress {
  nodeId: string
  lineIndex: number
  stats: Record<StatKey, number>
  relations: Record<RelationKey, number>
  flags: string[]
  completedActs: number[]
}

export interface Settings {
  soundEnabled: boolean
  masterVolume: number
  textSpeed: 'slow' | 'normal' | 'instant'
  reducedMotion: boolean
}

export interface SaveData {
  schemaVersion: 1
  progress: StoryProgress | null
  unlockedEndings: EndingId[]
  settings: Settings
}
