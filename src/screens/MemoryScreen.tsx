import type { CharacterNames, EndingId } from '../engine/types'
import { replaceCharacterNames } from '../story/characterNames'
import { endings, hiddenMonologue } from '../story/endings'

interface MemoryScreenProps {
  unlocked: EndingId[]
  completedActs: number[]
  characterNames: CharacterNames
  onReplay(act: number): void
  onBack(): void
}

const ENDING_ORDER: EndingId[] = [
  'train-gone',
  'unanswered',
  'better-person',
  'platform-divide',
  'next-city',
]

const ACT_LABELS = ['第一幕', '第二幕', '第三幕', '第四幕', '第五幕']

export function MemoryScreen({
  unlocked,
  completedActs,
  characterNames,
  onReplay,
  onBack,
}: MemoryScreenProps) {
  const unlockedSet = new Set(unlocked)
  const unlockedCount = unlockedSet.size
  const hasCompletedRun = unlockedCount > 0
  const hasAllEndings = ENDING_ORDER.every((endingId) =>
    unlockedSet.has(endingId),
  )

  return (
    <main className="memory-screen">
      <header className="memory-screen__header">
        <p className="memory-screen__eyebrow">被雨留下的残票</p>
        <h1>雨夜回忆</h1>
        <p aria-label={`已抵达 ${unlockedCount} 个结局`}>
          {unlockedCount} / {ENDING_ORDER.length}
        </p>
      </header>

      <section aria-label="结局车票收藏">
        <ol className="memory-screen__tickets">
          {ENDING_ORDER.map((endingId) => {
            const ending = endings[endingId]
            const isUnlocked = unlockedSet.has(endingId)

            return (
              <li key={endingId}>
                <article
                  className={`memory-ticket${
                    isUnlocked ? '' : ' memory-ticket--locked'
                  }`}
                  aria-label={isUnlocked ? ending.title : '尚未抵达'}
                >
                  <p className="memory-ticket__number">残票 {ending.number}</p>
                  {isUnlocked ? (
                    <>
                      <h2>{ending.title}</h2>
                      <p>
                        {replaceCharacterNames(ending.summary, characterNames)}
                      </p>
                    </>
                  ) : (
                    <p className="memory-ticket__locked-label">尚未抵达</p>
                  )}
                </article>
              </li>
            )
          })}
        </ol>
      </section>

      {hasAllEndings ? (
        <section
          className="memory-screen__monologue"
          aria-labelledby="hidden-monologue-title"
        >
          <h2 id="hidden-monologue-title">灯火之后</h2>
          {hiddenMonologue.split('\n').map((paragraph) => (
            <p key={paragraph}>
              {replaceCharacterNames(paragraph, characterNames)}
            </p>
          ))}
        </section>
      ) : null}

      <fieldset className="memory-screen__replay">
        <legend>重玩章节</legend>
        <div className="memory-screen__replay-actions">
          {ACT_LABELS.map((label, index) => {
            const act = index + 1
            const enabled = hasCompletedRun || completedActs.includes(act)

            return (
              <button
                key={label}
                type="button"
                disabled={!enabled}
                onClick={() => onReplay(act)}
              >
                重玩{label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <button type="button" onClick={onBack}>
        返回标题
      </button>
    </main>
  )
}
