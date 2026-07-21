import { GameProvider, useGame } from './app/GameContext'
import { GameScreen } from './screens/GameScreen'

function AppContent() {
  const { save, currentEnding, startNewGame } = useGame()

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

  if (currentEnding !== null) {
    return (
      <main className="ending-placeholder">
        <p>结局已抵达</p>
      </main>
    )
  }

  return <GameScreen />
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  )
}
