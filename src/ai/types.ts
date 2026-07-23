export interface AiStoryDraft {
  brief: string
  protagonistName: string
  tone: string
}

export interface GeneratedStoryLine {
  speaker?: string
  text: string
}

export interface GeneratedStoryChoice {
  id: string
  label: string
  next: string
}

export interface GeneratedStoryEnding {
  id: string
  title: string
  summary: string
  epilogue: string[]
}

export interface GeneratedStoryNode {
  id: string
  title: string
  scene: string
  lines: GeneratedStoryLine[]
  choices?: GeneratedStoryChoice[]
  next?: string
  ending?: GeneratedStoryEnding
}

export interface GeneratedStory {
  title: string
  subtitle: string
  premise: string
  startNodeId: string
  nodes: GeneratedStoryNode[]
}

export interface GeneratedStoryProgress {
  nodeId: string
  lineIndex: number
}

export interface AiWorkshopState {
  schemaVersion: 1
  draft: AiStoryDraft
  latestStory: GeneratedStory | null
  progress: GeneratedStoryProgress | null
  lastEndingId: string | null
}
