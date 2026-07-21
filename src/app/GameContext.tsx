import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import { createInitialProgress } from '../engine/initialState'
import { applyChoice, linesFor, resolveEnding } from '../engine/storyEngine'
import type {
  DialogueLine,
  EndingId,
  SaveData,
  Settings,
  StoryNode,
  StoryProgress,
} from '../engine/types'
import {
  clearCollection,
  clearCurrentRoute,
  loadSave,
  writeSave,
} from '../state/saveRepository'
import { story } from '../story'

export interface GameApi {
  save: SaveData
  currentNode: StoryNode | null
  currentLines: DialogueLine[]
  currentEnding: EndingId | null
  recoverableError: string | null
  startNewGame(): void
  continueGame(): void
  advance(): void
  choose(choiceId: string): void
  restartFromAct(act: number): void
  updateSettings(patch: Partial<Settings>): void
  clearRoute(): void
  clearAllProgress(): void
  leaveEnding(): void
  clearError(): void
}

interface GameState {
  save: SaveData
  recoverableError: string | null
}

const ACT_START_NODES: Record<number, string> = {
  1: 'act1_opening',
  2: 'act2_meeting',
  3: 'act3_photo',
  4: 'act4_invitation',
  5: 'act5_phone',
}

const GameContext = createContext<GameApi | undefined>(undefined)

function enterNode(
  save: SaveData,
  progress: StoryProgress,
  sourceNode: StoryNode,
  targetNode: StoryNode,
): SaveData {
  const completedActs = new Set(progress.completedActs)

  if (targetNode.act > sourceNode.act) {
    for (let act = sourceNode.act; act < targetNode.act; act += 1) {
      completedActs.add(act)
    }
  }

  const nextProgress: StoryProgress = {
    ...progress,
    nodeId: targetNode.id,
    lineIndex: 0,
    completedActs: [...completedActs].sort((left, right) => left - right),
  }

  if (!targetNode.resolveEnding) {
    return {
      ...save,
      progress: nextProgress,
    }
  }

  const ending = resolveEnding(nextProgress)

  return {
    ...save,
    progress: nextProgress,
    unlockedEndings: save.unlockedEndings.includes(ending)
      ? [...save.unlockedEndings]
      : [...save.unlockedEndings, ending],
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => ({
    save: loadSave(),
    recoverableError: null,
  }))

  useEffect(() => {
    writeSave(state.save)
  }, [state.save])

  const currentNode = useMemo(() => {
    const progress = state.save.progress

    return progress === null ? null : (story[progress.nodeId] ?? null)
  }, [state.save.progress])

  const currentLines = useMemo(() => {
    const progress = state.save.progress

    return progress === null || currentNode === null
      ? []
      : linesFor(currentNode, progress)
  }, [currentNode, state.save.progress])

  const currentEnding = useMemo(() => {
    const progress = state.save.progress

    return progress !== null && currentNode?.resolveEnding
      ? resolveEnding(progress)
      : null
  }, [currentNode, state.save.progress])

  function startNewGame() {
    setState((current) => ({
      save: {
        ...current.save,
        progress: createInitialProgress(),
      },
      recoverableError: null,
    }))
  }

  function continueGame() {
    setState((current) => ({
      save:
        current.save.progress === null
          ? {
              ...current.save,
              progress: createInitialProgress(),
            }
          : current.save,
      recoverableError: null,
    }))
  }

  function advance() {
    setState((current) => {
      const progress = current.save.progress

      if (progress === null) {
        return {
          ...current,
          recoverableError: '当前没有可推进的故事',
        }
      }

      const node = story[progress.nodeId]

      if (node === undefined) {
        return {
          ...current,
          recoverableError: `当前剧情节点不存在：${progress.nodeId}`,
        }
      }

      const lines = linesFor(node, progress)

      if (progress.lineIndex < lines.length - 1) {
        return {
          save: {
            ...current.save,
            progress: {
              ...progress,
              lineIndex: progress.lineIndex + 1,
            },
          },
          recoverableError: null,
        }
      }

      if ((node.choices?.length ?? 0) > 0 || node.resolveEnding) {
        return {
          ...current,
          recoverableError: null,
        }
      }

      if (node.next === undefined) {
        return {
          ...current,
          recoverableError: '当前剧情无法继续',
        }
      }

      const targetNode = story[node.next]

      if (targetNode === undefined) {
        return {
          ...current,
          recoverableError: `目标剧情节点不存在：${node.next}`,
        }
      }

      return {
        save: enterNode(current.save, progress, node, targetNode),
        recoverableError: null,
      }
    })
  }

  function choose(choiceId: string) {
    setState((current) => {
      const progress = current.save.progress

      if (progress === null) {
        return {
          ...current,
          recoverableError: `当前节点不存在选择 ${choiceId}`,
        }
      }

      const node = story[progress.nodeId]
      const choice = node?.choices?.find((item) => item.id === choiceId)

      if (node === undefined || choice === undefined) {
        return {
          ...current,
          recoverableError: `当前节点不存在选择 ${choiceId}`,
        }
      }

      const targetNode = story[choice.next]

      if (targetNode === undefined) {
        return {
          ...current,
          recoverableError: `目标剧情节点不存在：${choice.next}`,
        }
      }

      return {
        save: enterNode(
          current.save,
          applyChoice(progress, choice),
          node,
          targetNode,
        ),
        recoverableError: null,
      }
    })
  }

  function restartFromAct(act: number) {
    setState((current) => {
      const nodeId = ACT_START_NODES[act]

      if (nodeId === undefined) {
        return {
          ...current,
          recoverableError: `无法从第 ${act} 幕重新开始`,
        }
      }

      return {
        save: {
          ...current.save,
          progress: {
            ...createInitialProgress(nodeId),
            completedActs: Array.from(
              { length: act - 1 },
              (_, index) => index + 1,
            ),
          },
        },
        recoverableError: null,
      }
    })
  }

  function updateSettings(patch: Partial<Settings>) {
    setState((current) => ({
      save: {
        ...current.save,
        settings: {
          ...current.save.settings,
          ...patch,
        },
      },
      recoverableError: current.recoverableError,
    }))
  }

  function clearRoute() {
    setState((current) => ({
      save: clearCurrentRoute(current.save),
      recoverableError: null,
    }))
  }

  function clearAllProgress() {
    setState((current) => ({
      save: clearCollection(current.save),
      recoverableError: null,
    }))
  }

  function leaveEnding() {
    setState((current) => ({
      save: clearCurrentRoute(current.save),
      recoverableError: null,
    }))
  }

  function clearError() {
    setState((current) => ({
      ...current,
      recoverableError: null,
    }))
  }

  const value: GameApi = {
    save: state.save,
    currentNode,
    currentLines,
    currentEnding,
    recoverableError: state.recoverableError,
    startNewGame,
    continueGame,
    advance,
    choose,
    restartFromAct,
    updateSettings,
    clearRoute,
    clearAllProgress,
    leaveEnding,
    clearError,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameApi {
  const context = useContext(GameContext)

  if (context === undefined) {
    throw new Error('useGame 必须在 GameProvider 内使用')
  }

  return context
}
