import { createInitialProgress } from './initialState'
import { applyChoice, linesFor, resolveEnding } from './storyEngine'
import type { EndingId, StoryNode, StoryProgress } from './types'

export function buildStory(nodes: StoryNode[]): Record<string, StoryNode> {
  const story = Object.create(null) as Record<string, StoryNode>

  for (const node of nodes) {
    if (Object.prototype.hasOwnProperty.call(story, node.id)) {
      throw new Error(`剧情节点 ID 重复：${node.id}`)
    }
    story[node.id] = node
  }

  return story
}

function successors(node: StoryNode): string[] {
  return [
    ...(node.next ? [node.next] : []),
    ...(node.choices?.map((choice) => choice.next) ?? []),
  ]
}

export function validateStory(story: Record<string, StoryNode>): string[] {
  const errors: string[] = []

  for (const [key, node] of Object.entries(story)) {
    if (key !== node.id) {
      errors.push(`节点键 ${key} 与节点 ID ${node.id} 不一致`)
    }

    if (node.resolveEnding && node.next !== undefined) {
      errors.push(`结局解析节点 ${node.id} 不能设置 next`)
    }
    if (node.resolveEnding && node.choices !== undefined) {
      errors.push(`结局解析节点 ${node.id} 不能设置 choices`)
    }

    const nextIds = successors(node)
    for (const nextId of nextIds) {
      if (!Object.prototype.hasOwnProperty.call(story, nextId)) {
        errors.push(`节点 ${node.id} 的后继 ${nextId} 不存在`)
      }
    }

    if (!node.resolveEnding && nextIds.length === 0) {
      errors.push(`非结局节点 ${node.id} 是死路`)
    }
  }

  if (!Object.prototype.hasOwnProperty.call(story, 'act1_opening')) {
    errors.push('开场节点 act1_opening 不存在')
    return errors
  }

  const reachable = new Set<string>()
  const pending = ['act1_opening']
  while (pending.length > 0) {
    const nodeId = pending.pop()!
    if (
      reachable.has(nodeId) ||
      !Object.prototype.hasOwnProperty.call(story, nodeId)
    ) {
      continue
    }
    reachable.add(nodeId)
    pending.push(...successors(story[nodeId]))
  }

  for (const nodeId of Object.keys(story)) {
    if (!reachable.has(nodeId)) {
      errors.push(`节点 ${nodeId} 从 act1_opening 不可达`)
    }
  }

  return errors
}

function nodeCharacterCount(
  node: StoryNode,
  progress: StoryProgress,
): number {
  return linesFor(node, progress).reduce(
    (total, line) => total + (line.speaker?.length ?? 0) + line.text.length,
    0,
  )
}

export function enumeratePathCharacterCounts(
  story: Record<string, StoryNode>,
  terminalCharacters: Record<EndingId, number>,
): number[] {
  if (!story.act1_opening) {
    throw new Error('无法枚举路线：缺少 act1_opening')
  }

  const counts: number[] = []

  const visit = (
    nodeId: string,
    total: number,
    path: Set<string>,
    progress: StoryProgress,
  ) => {
    const node = story[nodeId]
    if (!node) throw new Error(`无法枚举路线：节点 ${nodeId} 不存在`)
    if (path.has(nodeId)) throw new Error(`剧情图存在循环：${nodeId}`)

    const nextTotal = total + nodeCharacterCount(node, progress)
    if (node.resolveEnding) {
      counts.push(nextTotal + terminalCharacters[resolveEnding(progress)])
      return
    }

    const nextIds = successors(node)
    if (nextIds.length === 0) {
      throw new Error(`无法枚举路线：非结局节点 ${nodeId} 是死路`)
    }

    const nextPath = new Set(path).add(nodeId)
    if (node.choices?.length) {
      for (const choice of node.choices) {
        visit(
          choice.next,
          nextTotal,
          nextPath,
          applyChoice(progress, choice),
        )
      }
      return
    }

    visit(node.next!, nextTotal, nextPath, {
      ...progress,
      nodeId: node.next!,
      lineIndex: 0,
    })
  }

  visit('act1_opening', 0, new Set(), createInitialProgress())
  return counts
}
