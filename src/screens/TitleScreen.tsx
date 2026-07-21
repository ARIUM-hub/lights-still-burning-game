import type { Ref } from 'react'

interface TitleScreenProps {
  hasProgress: boolean
  recoverableError: string | null
  onStart(): void
  onContinue(): void
  onRestart(): void
  hasMemories: boolean
  onOpenMemory(): void
  onOpenSettings(): void
  primaryActionRef?: Ref<HTMLButtonElement>
}

export function TitleScreen({
  hasProgress,
  recoverableError,
  onStart,
  onContinue,
  onRestart,
  hasMemories,
  onOpenMemory,
  onOpenSettings,
  primaryActionRef,
}: TitleScreenProps) {
  return (
    <main className="title-screen">
      <section className="title-screen__content" aria-labelledby="story-title">
        <h1 id="story-title" className="title-screen__title">
          灯火未熄
        </h1>
        <p className="title-screen__tagline">有些人不是离开了才失去。</p>
        {recoverableError === null ? null : (
          <p className="title-screen__status" role="status" aria-live="polite">
            {recoverableError}
          </p>
        )}

        <div className="title-screen__actions">
          {hasProgress ? (
            <>
              <button
                ref={primaryActionRef}
                className="title-screen__primary-action"
                type="button"
                onClick={onContinue}
              >
                继续雨夜
              </button>
              <button type="button" onClick={onRestart}>
                从头开始
              </button>
            </>
          ) : (
            <button
              ref={primaryActionRef}
              className="title-screen__primary-action"
              type="button"
              onClick={onStart}
            >
              开始故事
            </button>
          )}
          {hasMemories ? (
            <button type="button" onClick={onOpenMemory}>
              雨夜回忆
            </button>
          ) : null}
          <button type="button" onClick={onOpenSettings}>
            设置
          </button>
        </div>
      </section>
    </main>
  )
}
