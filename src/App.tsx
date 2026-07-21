import { useEffect, useRef, useState } from 'react'

import { GameProvider, useGame } from './app/GameContext'
import { SettingsSheet } from './components/SettingsSheet'
import { TopBar } from './components/TopBar'
import { GameScreen, chapterLabel } from './screens/GameScreen'
import { TitleScreen } from './screens/TitleScreen'

function AppContent() {
  const {
    save,
    currentNode,
    currentEnding,
    recoverableError,
    startNewGame,
    continueGame,
    updateSettings,
    clearRoute,
    clearAllProgress,
  } = useGame()
  const [view, setView] = useState<'title' | 'game'>('title')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const titleActionRef = useRef<HTMLButtonElement>(null)
  const focusTitleAfterClear = useRef(false)

  useEffect(() => {
    if (
      focusTitleAfterClear.current &&
      !settingsOpen &&
      (view === 'title' || save.progress === null)
    ) {
      focusTitleAfterClear.current = false
      titleActionRef.current?.focus()
    }
  }, [save.progress, settingsOpen, view])

  function handleStart() {
    startNewGame()
    setView('game')
  }

  function handleContinue() {
    continueGame()
    setView('game')
  }

  function handleClearRoute() {
    focusTitleAfterClear.current = true
    clearRoute()
    setSettingsOpen(false)
    setView('title')
  }

  function handleClearAllProgress() {
    focusTitleAfterClear.current = true
    clearAllProgress()
    setSettingsOpen(false)
    setView('title')
  }

  let content

  if (view === 'title' || save.progress === null) {
    content = (
      <TitleScreen
        hasProgress={save.progress !== null}
        recoverableError={recoverableError}
        onStart={handleStart}
        onContinue={handleContinue}
        onRestart={handleStart}
        onOpenSettings={() => setSettingsOpen(true)}
        primaryActionRef={titleActionRef}
      />
    )
  } else if (currentEnding !== null && currentNode !== null) {
    content = (
      <main className="ending-placeholder">
        <TopBar
          chapter={chapterLabel(currentNode.act)}
          title={currentNode.title}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <section className="ending-placeholder__content">
          <p>结局已抵达</p>
        </section>
      </main>
    )
  } else {
    content = <GameScreen onOpenSettings={() => setSettingsOpen(true)} />
  }

  return (
    <>
      {content}
      <SettingsSheet
        open={settingsOpen}
        settings={save.settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
        onClearRoute={handleClearRoute}
        onClearAllProgress={handleClearAllProgress}
      />
    </>
  )
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  )
}
