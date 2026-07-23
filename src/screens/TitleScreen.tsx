import type { Ref } from 'react'

interface TitleScreenProps {
  hasProgress: boolean
  recoverableError: string | null
  onStart(): void
  onContinue(): void
  onRestart(): void
  hasMemories: boolean
  onOpenMemory(): void
  soundEnabled: boolean
  onToggleSound(): void
  reducedMotion: boolean
  onOpenSettings(): void
  hasWorkshop?: boolean
  onOpenWorkshop?(): void
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
  soundEnabled,
  onToggleSound,
  reducedMotion,
  onOpenSettings,
  hasWorkshop = false,
  onOpenWorkshop = () => undefined,
  primaryActionRef,
}: TitleScreenProps) {
  return (
    <main
      className="title-screen"
      data-reduced-motion={reducedMotion ? 'true' : undefined}
    >
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
          {hasWorkshop ? (
            <button type="button" onClick={onOpenWorkshop}>
              AI故事工坊
            </button>
          ) : null}
          <button type="button" onClick={onToggleSound}>
            {soundEnabled ? '关闭声音' : '开启声音'}
          </button>
          <button type="button" onClick={onOpenSettings}>
            设置
          </button>
        </div>
      </section>
    </main>
  )
}
