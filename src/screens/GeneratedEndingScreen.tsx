import type { GeneratedStory, GeneratedStoryEnding } from '../ai/types'

interface GeneratedEndingScreenProps {
  story: GeneratedStory
  ending: GeneratedStoryEnding
  onRestart(): void
  onBack(): void
}

export function GeneratedEndingScreen({
  story,
  ending,
  onRestart,
  onBack,
}: GeneratedEndingScreenProps) {
  return (
    <main className="generated-ending-screen">
      <article
        className="generated-ending-screen__content"
        aria-labelledby="generated-ending-title"
      >
        <p className="generated-ending-screen__eyebrow">AI生成结局</p>
        <p className="generated-ending-screen__story-title">{story.title}</p>
        <h1 id="generated-ending-title">{ending.title}</h1>
        <p className="generated-ending-screen__summary">{ending.summary}</p>
        <div className="generated-ending-screen__epilogue">
          {ending.epilogue.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="generated-ending-screen__actions">
          <button type="button" onClick={onBack}>
            返回工坊
          </button>
          <button type="button" onClick={onRestart}>
            重玩这个故事
          </button>
        </div>
      </article>
    </main>
  )
}
