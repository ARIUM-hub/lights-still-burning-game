import { GameProvider, useGame } from './app/GameContext'

function AppContent() {
  const {
    save,
    currentNode,
    currentLines,
    currentEnding,
    startNewGame,
    advance,
  } = useGame()

  if (save.progress === null) {
    return (
      <main>
        <h1>灯火未熄</h1>
        <p>有些人不是离开了才失去。</p>
        <button type="button" onClick={startNewGame}>
          开始故事
        </button>
      </main>
    )
  }

  if (currentNode === null) {
    return (
      <main>
        <h1>灯火未熄</h1>
        <p>当前剧情暂时无法读取。</p>
      </main>
    )
  }

  const currentLine = currentLines[save.progress.lineIndex]

  return (
    <main>
      <h1>{currentNode.title}</h1>
      <p>{currentLine?.text ?? ''}</p>
      {currentEnding === null ? (
        <button type="button" onClick={advance}>
          继续
        </button>
      ) : (
        <p>结局已抵达</p>
      )}
    </main>
  )
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  )
}
