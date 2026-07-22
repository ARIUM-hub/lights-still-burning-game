import { useEffect, useRef, useState } from 'react'

import { GameProvider, useGame } from './app/GameContext'
import { SettingsSheet } from './components/SettingsSheet'
import type { Settings } from './engine/types'
import { EndingScreen } from './screens/EndingScreen'
import { GameScreen } from './screens/GameScreen'
import { MemoryScreen } from './screens/MemoryScreen'
import { TitleScreen } from './screens/TitleScreen'
import { endings } from './story/endings'

type View = 'title' | 'memory' | 'game' | 'ending'

function AppContent() {
  const {
    save,
    currentNode,
    currentEnding,
    soundActive,
    recoverableError,
    startNewGame,
    continueGame,
    updateSettings,
    setSoundEnabled,
    restartFromAct,
    clearRoute,
    clearAllProgress,
    leaveEnding,
  } = useGame()
  const [view, setView] = useState<View>(() => {
    if (currentEnding !== null) {
      return 'ending'
    }

    return save.progress === null ? 'title' : 'game'
  })
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

  useEffect(() => {
    if (currentEnding !== null) {
      setView('ending')
    }
  }, [currentEnding])

  function handleStart() {
    restoreSoundFromGesture()
    startNewGame()
    setView('game')
  }

  function handleContinue() {
    restoreSoundFromGesture()
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

  function handleCollectEnding() {
    leaveEnding()
    setView('memory')
  }

  function handleRestart() {
    restoreSoundFromGesture()
    startNewGame()
    setView('game')
  }

  function handleReplay(act: number) {
    restoreSoundFromGesture()
    restartFromAct(act)
    setView('game')
  }

  function handleSettingsChange(patch: Partial<Settings>) {
    const { soundEnabled, ...otherSettings } = patch

    if (soundEnabled !== undefined) {
      void setSoundEnabled(soundEnabled)
    }
    if (Object.keys(otherSettings).length > 0) {
      updateSettings(otherSettings)
    }
  }

  function restoreSoundFromGesture() {
    if (save.settings.soundEnabled && !soundActive) {
      void setSoundEnabled(true)
    }
  }

  function handleToggleSound() {
    void setSoundEnabled(!soundActive)
  }

  let content

  if (view === 'memory') {
    content = (
      <MemoryScreen
        unlocked={save.unlockedEndings}
        completedActs={save.progress?.completedActs ?? []}
        onReplay={handleReplay}
        onBack={() => setView('title')}
      />
    )
  } else if (view === 'title') {
    content = (
      <TitleScreen
        hasProgress={save.progress !== null}
        hasMemories={save.unlockedEndings.length > 0}
        recoverableError={recoverableError}
        onStart={handleStart}
        onContinue={handleContinue}
        onRestart={handleStart}
        onOpenMemory={() => setView('memory')}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setSettingsOpen(true)}
        primaryActionRef={titleActionRef}
      />
    )
  } else if (currentEnding !== null && currentNode !== null) {
    content = (
      <EndingScreen
        ending={endings[currentEnding]}
        onCollect={handleCollectEnding}
        onRestart={handleRestart}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    )
  } else if (save.progress !== null) {
    content = <GameScreen onOpenSettings={() => setSettingsOpen(true)} />
  } else {
    content = (
      <TitleScreen
        hasProgress={false}
        hasMemories={save.unlockedEndings.length > 0}
        recoverableError={recoverableError}
        onStart={handleStart}
        onContinue={handleContinue}
        onRestart={handleStart}
        onOpenMemory={() => setView('memory')}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setSettingsOpen(true)}
        primaryActionRef={titleActionRef}
      />
    )
  }

  return (
    <>
      {content}
      <SettingsSheet
        open={settingsOpen}
        settings={{ ...save.settings, soundEnabled: soundActive }}
        onChange={handleSettingsChange}
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
