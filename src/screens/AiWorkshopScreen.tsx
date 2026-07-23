import type {
  AiStoryDraft,
  GeneratedStory,
} from '../ai/types'

interface AiWorkshopScreenProps {
  draft: AiStoryDraft
  latestStory: GeneratedStory | null
  busy: boolean
  error: string | null
  onDraftChange(patch: Partial<AiStoryDraft>): void
  onGenerate(): void
  onPlayLatest(): void
  onBack(): void
}

export function AiWorkshopScreen({
  draft,
  latestStory,
  busy,
  error,
  onDraftChange,
  onGenerate,
  onPlayLatest,
  onBack,
}: AiWorkshopScreenProps) {
  return (
    <main className="ai-workshop-screen">
      <section
        className="ai-workshop-screen__content"
        aria-labelledby="ai-workshop-title"
      >
        <header className="ai-workshop-screen__header">
          <p className="ai-workshop-screen__eyebrow">通关解锁内容</p>
          <h1 id="ai-workshop-title">AI故事工坊</h1>
          <p className="ai-workshop-screen__intro">
            先完整体验《灯火未熄》，再用一次低频 AI
            请求生成同类气质的新分支故事。
          </p>
          <p className="ai-workshop-screen__hint">
            生成新故事后可直接开始试玩。
          </p>
        </header>

        {error === null ? null : (
          <p
            className="ai-workshop-screen__status"
            role="status"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <section
          className="ai-workshop-screen__panel"
          aria-labelledby="ai-story-brief-title"
        >
          <h2 id="ai-story-brief-title">故事种子</h2>
          <label className="ai-workshop-screen__field">
            <span>主角名字</span>
            <input
              aria-label="主角名字"
              type="text"
              value={draft.protagonistName}
              onChange={(event) =>
                onDraftChange({ protagonistName: event.currentTarget.value })
              }
            />
          </label>
          <label className="ai-workshop-screen__field">
            <span>整体基调</span>
            <input
              aria-label="整体基调"
              type="text"
              value={draft.tone}
              onChange={(event) =>
                onDraftChange({ tone: event.currentTarget.value })
              }
            />
          </label>
          <label className="ai-workshop-screen__field">
            <span>故事需求</span>
            <textarea
              aria-label="故事需求"
              rows={6}
              value={draft.brief}
              onChange={(event) =>
                onDraftChange({ brief: event.currentTarget.value })
              }
            />
          </label>
        </section>

        <section
          className="ai-workshop-screen__panel"
          aria-labelledby="ai-latest-title"
        >
          <h2 id="ai-latest-title">最近生成</h2>
          {latestStory ? (
            <div className="ai-workshop-screen__latest">
              <h3>{latestStory.title}</h3>
              <p>{latestStory.subtitle}</p>
              <p>{latestStory.premise}</p>
            </div>
          ) : (
            <p className="ai-workshop-screen__placeholder">
              还没有生成过新故事。写好故事需求后即可创建并直接试玩。
            </p>
          )}
        </section>

        <div className="ai-workshop-screen__actions">
          <button type="button" onClick={onBack}>
            返回标题
          </button>
          {latestStory ? (
            <button type="button" onClick={onPlayLatest}>
              试玩最近生成
            </button>
          ) : null}
          <button
            type="button"
            className="ai-workshop-screen__primary-action"
            disabled={busy}
            onClick={onGenerate}
          >
            {busy ? '正在生成故事…' : '生成新故事'}
          </button>
        </div>
      </section>
    </main>
  )
}
