import { TopBar } from '../components/TopBar'
import type { Ending } from '../story/endings'

interface EndingScreenProps {
  ending: Ending
  onCollect(): void
  onRestart(): void
  onOpenSettings(): void
}

export function EndingScreen({
  ending,
  onCollect,
  onRestart,
  onOpenSettings,
}: EndingScreenProps) {
  return (
    <main className="ending-screen">
      <TopBar
        chapter="终幕"
        title="灯火未熄"
        onOpenSettings={onOpenSettings}
      />
      <article
        className="ending-screen__content"
        aria-labelledby="ending-title"
      >
        <p className="ending-screen__number">结局 {ending.number}</p>
        <h1 id="ending-title" className="ending-screen__title">
          {ending.title}
        </h1>
        <p className="ending-screen__summary">{ending.summary}</p>
        <div className="ending-screen__epilogue">
          {ending.epilogue.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="ending-screen__actions">
          <button type="button" onClick={onCollect}>
            收下这张残票
          </button>
          <button type="button" onClick={onRestart}>
            重回雨夜
          </button>
        </div>
      </article>
    </main>
  )
}
