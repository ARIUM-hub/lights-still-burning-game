import { ChoicePanel } from '../components/ChoicePanel'
import { DialogueBox } from '../components/DialogueBox'
import type {
  GeneratedStory,
  GeneratedStoryNode,
  GeneratedStoryProgress,
} from '../ai/types'
import type { Settings } from '../engine/types'

interface GeneratedStoryScreenProps {
  story: GeneratedStory
  node: GeneratedStoryNode
  progress: GeneratedStoryProgress
  textSpeed: Settings['textSpeed']
  reducedMotion: boolean
  error: string | null
  onAdvance(): void
  onChoose(choiceId: string): void
  onRestart(): void
  onBack(): void
}

export function GeneratedStoryScreen({
  story,
  node,
  progress,
  textSpeed,
  reducedMotion,
  error,
  onAdvance,
  onChoose,
  onRestart,
  onBack,
}: GeneratedStoryScreenProps) {
  const line = node.lines[progress.lineIndex]
  const isLastLine = progress.lineIndex === node.lines.length - 1
  const choices = isLastLine ? (node.choices ?? []) : []

  return (
    <main className="generated-story-screen">
      <header className="generated-story-screen__header">
        <div>
          <p className="generated-story-screen__eyebrow">AI生成故事</p>
          <h1>{story.title}</h1>
          <p className="generated-story-screen__subtitle">{story.subtitle}</p>
        </div>
        <div className="generated-story-screen__header-actions">
          <button type="button" onClick={onRestart}>
            从头重玩
          </button>
          <button type="button" onClick={onBack}>
            返回工坊
          </button>
        </div>
      </header>

      {error === null ? null : (
        <p
          className="generated-story-screen__status"
          role="status"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      <section
        className="generated-story-screen__stage"
        data-reduced-motion={reducedMotion ? 'true' : undefined}
      >
        <div className="generated-story-screen__scene-card">
          <p className="generated-story-screen__scene-label">场景</p>
          <h2>{node.title}</h2>
          <p>{node.scene}</p>
        </div>

        <div className="generated-story-screen__story-card">
          <p className="generated-story-screen__premise">{story.premise}</p>
          {line ? (
            <DialogueBox
              line={line}
              textSpeed={textSpeed}
              reducedMotion={reducedMotion}
              onAdvance={onAdvance}
            />
          ) : null}
          {choices.length > 0 ? (
            <ChoicePanel choices={choices} onChoose={onChoose} />
          ) : null}
        </div>
      </section>
    </main>
  )
}
