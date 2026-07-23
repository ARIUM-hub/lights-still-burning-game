import { useEffect, useMemo, useRef, useState } from 'react'

import {
  advanceGeneratedStory,
  chooseGeneratedStory,
  createInitialGeneratedProgress,
  getGeneratedNode,
} from './ai/player'
import {
  createInitialAiWorkshopState,
  loadAiWorkshopState,
  writeAiWorkshopState,
} from './ai/repository'
import { generateAiStory } from './ai/storyClient'
import type { AiStoryDraft, GeneratedStory } from './ai/types'
import { GameProvider, useGame } from './app/GameContext'
import { SettingsSheet } from './components/SettingsSheet'
import type { CharacterNames, Settings } from './engine/types'
import { AiWorkshopScreen } from './screens/AiWorkshopScreen'
import { EndingScreen } from './screens/EndingScreen'
import { GameScreen } from './screens/GameScreen'
import { GeneratedEndingScreen } from './screens/GeneratedEndingScreen'
import { GeneratedStoryScreen } from './screens/GeneratedStoryScreen'
import { MemoryScreen } from './screens/MemoryScreen'
import { NamingScreen } from './screens/NamingScreen'
import { TitleScreen } from './screens/TitleScreen'
import { replaceCharacterNames } from './story/characterNames'
import { endings } from './story/endings'

type View =
  | 'title'
  | 'naming'
  | 'memory'
  | 'game'
  | 'ending'
  | 'workshop'
  | 'generated-game'
  | 'generated-ending'

type NamingMode = 'start' | 'continue'

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
    updateCharacterNames,
    setSoundEnabled,
    restartFromAct,
    clearRoute,
    clearAllProgress,
    leaveEnding,
  } = useGame()
  const [view, setView] = useState<View>(() => {
    if (currentEnding !== null) return 'ending'
    return save.progress === null ? 'title' : 'game'
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [workshopState, setWorkshopState] = useState(loadAiWorkshopState)
  const [workshopBusy, setWorkshopBusy] = useState(false)
  const [workshopError, setWorkshopError] = useState<string | null>(null)
  const [namingMode, setNamingMode] = useState<NamingMode>('start')
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

  useEffect(() => {
    try {
      writeAiWorkshopState(workshopState)
    } catch {
      setWorkshopError((current) => current ?? 'AI工坊存档写入失败，但当前会话仍可继续。')
    }
  }, [workshopState])

  const generatedStory = workshopState.latestStory
  const generatedProgress = workshopState.progress
  const generatedNode = useMemo(
    () =>
      generatedStory && generatedProgress
        ? getGeneratedNode(generatedStory, generatedProgress)
        : null,
    [generatedStory, generatedProgress],
  )
  const generatedEnding =
    generatedStory && workshopState.lastEndingId
      ? generatedStory.nodes.find(
          (node) => node.id === workshopState.lastEndingId,
        )?.ending ?? null
      : null
  const localizedEnding =
    currentEnding === null
      ? null
      : {
          ...endings[currentEnding],
          summary: replaceCharacterNames(
            endings[currentEnding].summary,
            save.characterNames,
          ),
          epilogue: endings[currentEnding].epilogue.map((paragraph) =>
            replaceCharacterNames(paragraph, save.characterNames),
          ),
        }

  function restoreSoundFromGesture() {
    if (save.settings.soundEnabled && !soundActive) {
      void setSoundEnabled(true)
    }
  }

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

  function openNaming(mode: NamingMode) {
    restoreSoundFromGesture()
    setNamingMode(mode)
    setView('naming')
  }

  function handleConfirmNaming(names: CharacterNames) {
    updateCharacterNames(names)

    if (namingMode === 'continue') {
      handleContinue()
      return
    }

    handleStart()
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

  function handleToggleSound() {
    void setSoundEnabled(!soundActive)
  }

  function handleWorkshopDraftChange(patch: Partial<AiStoryDraft>) {
    setWorkshopState((current) => ({
      ...current,
      draft: {
        ...current.draft,
        ...patch,
      },
    }))
  }

  function handleStartLatestGeneratedStory(story: GeneratedStory) {
    setWorkshopState((current) => ({
      ...current,
      latestStory: story,
      progress: createInitialGeneratedProgress(story),
      lastEndingId: null,
    }))
    setWorkshopError(null)
    setView('generated-game')
  }

  async function handleGenerateStory() {
    setWorkshopBusy(true)
    setWorkshopError(null)

    try {
      const story = await generateAiStory(workshopState.config, {
        brief: workshopState.draft.brief,
        protagonistName: workshopState.draft.protagonistName,
        tone: workshopState.draft.tone,
      })
      handleStartLatestGeneratedStory(story)
    } catch (error) {
      setWorkshopError(
        error instanceof Error ? error.message : '生成故事时发生未知错误',
      )
    } finally {
      setWorkshopBusy(false)
    }
  }

  function handlePlayLatest() {
    if (!generatedStory) {
      setWorkshopError('还没有可试玩的 AI 故事。')
      return
    }

    if (generatedProgress !== null && generatedNode !== null) {
      setView('generated-game')
      return
    }

    handleStartLatestGeneratedStory(generatedStory)
  }

  function handleGeneratedAdvance() {
    if (!generatedStory || !generatedProgress) {
      setWorkshopError('当前没有正在进行的 AI 故事。')
      setView('workshop')
      return
    }

    const result = advanceGeneratedStory(generatedStory, generatedProgress)

    if (result.type === 'error') {
      setWorkshopError(result.message)
      setView('workshop')
      return
    }

    if (result.type === 'ending') {
      setWorkshopState((current) => ({
        ...current,
        progress: null,
        lastEndingId: result.endingNodeId,
      }))
      setView('generated-ending')
      return
    }

    setWorkshopState((current) => ({
      ...current,
      progress: result.progress,
      lastEndingId: null,
    }))
  }

  function handleGeneratedChoose(choiceId: string) {
    if (!generatedStory || !generatedProgress) {
      setWorkshopError('当前没有正在进行的 AI 故事。')
      setView('workshop')
      return
    }

    const result = chooseGeneratedStory(
      generatedStory,
      generatedProgress,
      choiceId,
    )

    if (result.type === 'error') {
      setWorkshopError(result.message)
      setView('workshop')
      return
    }

    if (result.type === 'progress') {
      setWorkshopState((current) => ({
        ...current,
        progress: result.progress,
        lastEndingId: null,
      }))
    }
  }

  function handleRestartGeneratedStory() {
    if (!generatedStory) {
      setWorkshopError('还没有生成过 AI 故事。')
      setView('workshop')
      return
    }

    handleStartLatestGeneratedStory(generatedStory)
  }

  let content

  if (view === 'memory') {
    content = (
      <MemoryScreen
        unlocked={save.unlockedEndings}
        completedActs={save.progress?.completedActs ?? []}
        characterNames={save.characterNames}
        onReplay={handleReplay}
        onBack={() => setView('title')}
      />
    )
  } else if (view === 'workshop') {
    content = (
      <AiWorkshopScreen
        config={workshopState.config}
        draft={workshopState.draft}
        latestStory={generatedStory}
        busy={workshopBusy}
        error={workshopError}
        onConfigChange={(patch) =>
          setWorkshopState((current) => ({
            ...current,
            config: {
              ...current.config,
              ...patch,
            },
          }))
        }
        onDraftChange={handleWorkshopDraftChange}
        onGenerate={handleGenerateStory}
        onPlayLatest={handlePlayLatest}
        onBack={() => setView('title')}
      />
    )
  } else if (
    view === 'generated-game' &&
    generatedStory &&
    generatedProgress &&
    generatedNode
  ) {
    content = (
      <GeneratedStoryScreen
        story={generatedStory}
        node={generatedNode}
        progress={generatedProgress}
        textSpeed={save.settings.textSpeed}
        reducedMotion={save.settings.reducedMotion}
        error={workshopError}
        onAdvance={handleGeneratedAdvance}
        onChoose={handleGeneratedChoose}
        onRestart={handleRestartGeneratedStory}
        onBack={() => setView('workshop')}
      />
    )
  } else if (view === 'generated-ending' && generatedStory && generatedEnding) {
    content = (
      <GeneratedEndingScreen
        story={generatedStory}
        ending={generatedEnding}
        onRestart={handleRestartGeneratedStory}
        onBack={() => setView('workshop')}
      />
    )
  } else if (view === 'naming') {
    content = (
      <NamingScreen
        mode={namingMode}
        initialNames={save.characterNames}
        onConfirm={handleConfirmNaming}
        onBack={() => setView('title')}
      />
    )
  } else if (view === 'title') {
    content = (
      <TitleScreen
        hasProgress={save.progress !== null}
        hasMemories={save.unlockedEndings.length > 0}
        hasWorkshop={save.unlockedEndings.length > 0}
        recoverableError={recoverableError}
        onStart={() => openNaming('start')}
        onContinue={() => openNaming('continue')}
        onRestart={() => openNaming('start')}
        onOpenMemory={() => setView('memory')}
        onOpenWorkshop={() => {
          setWorkshopError(null)
          setView('workshop')
        }}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        reducedMotion={save.settings.reducedMotion}
        onOpenSettings={() => setSettingsOpen(true)}
        primaryActionRef={titleActionRef}
      />
    )
  } else if (currentEnding !== null && currentNode !== null && localizedEnding) {
    content = (
      <EndingScreen
        ending={localizedEnding}
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
        hasWorkshop={save.unlockedEndings.length > 0}
        recoverableError={recoverableError}
        onStart={() => openNaming('start')}
        onContinue={() => openNaming('continue')}
        onRestart={() => openNaming('start')}
        onOpenMemory={() => setView('memory')}
        onOpenWorkshop={() => {
          setWorkshopError(null)
          setView('workshop')
        }}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        reducedMotion={save.settings.reducedMotion}
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
