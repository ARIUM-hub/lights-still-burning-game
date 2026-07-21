import { useGame } from '../app/GameContext'
import { StoryStage } from '../components/StoryStage'

export function GameScreen() {
  const {
    save,
    currentNode,
    currentLines,
    recoverableError,
    advance,
    choose,
    clearRoute,
  } = useGame()
  const progress = save.progress
  const currentLine =
    progress === null ? undefined : currentLines[progress.lineIndex]

  const status = recoverableError === null ? null : (
    <p className="game-screen__status" role="status" aria-live="polite">
      {recoverableError}
    </p>
  )

  if (progress === null || currentNode === null) {
    return (
      <main className="game-screen game-screen--recovery">
        {status}
        <section aria-label="剧情恢复" className="game-screen__recovery">
          <h1>灯火未熄</h1>
          <p>当前剧情暂时无法读取。</p>
          <button type="button" onClick={clearRoute}>
            返回标题
          </button>
        </section>
      </main>
    )
  }

  if (currentLine === undefined) {
    return (
      <main className="game-screen game-screen--recovery">
        {status}
        <section aria-label="剧情恢复" className="game-screen__recovery">
          <h1>{currentNode.title}</h1>
          <p>当前行无法读取。</p>
          <button type="button" onClick={clearRoute}>
            返回标题
          </button>
        </section>
      </main>
    )
  }

  const isLastLine = progress.lineIndex === currentLines.length - 1

  return (
    <main className="game-screen">
      {status}
      <StoryStage
        scene={currentNode.scene}
        title={currentNode.title}
        line={currentLine}
        choices={isLastLine ? (currentNode.choices ?? []) : []}
        onAdvance={advance}
        onChoose={choose}
        textSpeed={save.settings.textSpeed}
        reducedMotion={save.settings.reducedMotion}
      />
    </main>
  )
}
