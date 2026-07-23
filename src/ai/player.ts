import type {
  GeneratedStory,
  GeneratedStoryNode,
  GeneratedStoryProgress,
} from './types'

export type GeneratedAdvanceResult =
  | { type: 'progress'; progress: GeneratedStoryProgress }
  | { type: 'ending'; endingNodeId: string }
  | { type: 'error'; message: string }

function getNodeMap(story: GeneratedStory) {
  return new Map(story.nodes.map((node) => [node.id, node] as const))
}

export function createInitialGeneratedProgress(
  story: GeneratedStory,
): GeneratedStoryProgress {
  return {
    nodeId: story.startNodeId,
    lineIndex: 0,
  }
}

export function getGeneratedNode(
  story: GeneratedStory,
  progress: GeneratedStoryProgress,
): GeneratedStoryNode | null {
  return getNodeMap(story).get(progress.nodeId) ?? null
}

export function advanceGeneratedStory(
  story: GeneratedStory,
  progress: GeneratedStoryProgress,
): GeneratedAdvanceResult {
  const node = getGeneratedNode(story, progress)
  if (!node) {
    return { type: 'error', message: `当前节点不存在：${progress.nodeId}` }
  }

  if (progress.lineIndex < node.lines.length - 1) {
    return {
      type: 'progress',
      progress: {
        ...progress,
        lineIndex: progress.lineIndex + 1,
      },
    }
  }

  if (node.ending) {
    return { type: 'ending', endingNodeId: node.id }
  }

  if (node.choices && node.choices.length > 0) {
    return { type: 'progress', progress }
  }

  if (!node.next) {
    return { type: 'error', message: `节点 ${node.id} 缺少后继节点` }
  }

  return {
    type: 'progress',
    progress: {
      nodeId: node.next,
      lineIndex: 0,
    },
  }
}

export function chooseGeneratedStory(
  story: GeneratedStory,
  progress: GeneratedStoryProgress,
  choiceId: string,
): GeneratedAdvanceResult {
  const node = getGeneratedNode(story, progress)
  if (!node) {
    return { type: 'error', message: `当前节点不存在：${progress.nodeId}` }
  }

  const choice = node.choices?.find((item) => item.id === choiceId)
  if (!choice) {
    return {
      type: 'error',
      message: `节点 ${node.id} 不存在选项：${choiceId}`,
    }
  }

  return {
    type: 'progress',
    progress: {
      nodeId: choice.next,
      lineIndex: 0,
    },
  }
}
