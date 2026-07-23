import type {
  GeneratedStory,
  GeneratedStoryChoice,
  GeneratedStoryEnding,
  GeneratedStoryLine,
  GeneratedStoryNode,
} from './types'

type ValidationSuccess = {
  ok: true
  story: GeneratedStory
}

type ValidationFailure = {
  ok: false
  reason: string
}

export type GeneratedStoryValidationResult =
  | ValidationSuccess
  | ValidationFailure

function isFailure<T>(
  value: T | ValidationFailure,
): value is ValidationFailure {
  return isRecord(value) && value.ok === false && typeof value.reason === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizedString(
  value: unknown,
  field: string,
): string | ValidationFailure {
  if (typeof value !== 'string') {
    return { ok: false, reason: `${field} 必须是字符串` }
  }

  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { ok: false, reason: `${field} 不能为空` }
  }

  return trimmed
}

function normalizeLine(
  value: unknown,
  index: number,
): GeneratedStoryLine | ValidationFailure {
  if (!isRecord(value)) {
    return { ok: false, reason: `第 ${index + 1} 行对话格式无效` }
  }

  const text = normalizedString(value.text, `第 ${index + 1} 行对话文本`)
  if (typeof text !== 'string') return text

  if (value.speaker === undefined) {
    return { text }
  }

  const speaker = normalizedString(value.speaker, `第 ${index + 1} 行说话人`)
  if (typeof speaker !== 'string') return speaker

  return { speaker, text }
}

function normalizeChoice(
  value: unknown,
  index: number,
): GeneratedStoryChoice | ValidationFailure {
  if (!isRecord(value)) {
    return { ok: false, reason: `第 ${index + 1} 个选项格式无效` }
  }

  const id = normalizedString(value.id, `第 ${index + 1} 个选项 ID`)
  if (typeof id !== 'string') return id

  const label = normalizedString(value.label, `第 ${index + 1} 个选项文案`)
  if (typeof label !== 'string') return label

  const next = normalizedString(value.next, `第 ${index + 1} 个选项跳转`)
  if (typeof next !== 'string') return next

  return { id, label, next }
}

function normalizeEnding(
  value: unknown,
): GeneratedStoryEnding | ValidationFailure {
  if (!isRecord(value)) {
    return { ok: false, reason: '结局格式无效' }
  }

  const id = normalizedString(value.id, '结局 ID')
  if (typeof id !== 'string') return id

  const title = normalizedString(value.title, '结局标题')
  if (typeof title !== 'string') return title

  const summary = normalizedString(value.summary, '结局摘要')
  if (typeof summary !== 'string') return summary

  if (!Array.isArray(value.epilogue) || value.epilogue.length === 0) {
    return { ok: false, reason: '结局尾声至少需要 1 段文字' }
  }

  const epilogue: string[] = []
  for (const [index, paragraph] of value.epilogue.entries()) {
    const normalized = normalizedString(
      paragraph,
      `结局尾声第 ${index + 1} 段`,
    )
    if (typeof normalized !== 'string') return normalized
    epilogue.push(normalized)
  }

  return { id, title, summary, epilogue }
}

function normalizeNode(
  value: unknown,
  index: number,
): GeneratedStoryNode | ValidationFailure {
  if (!isRecord(value)) {
    return { ok: false, reason: `第 ${index + 1} 个节点格式无效` }
  }

  const id = normalizedString(value.id, `第 ${index + 1} 个节点 ID`)
  if (typeof id !== 'string') return id

  const title = normalizedString(value.title, `节点 ${id} 标题`)
  if (typeof title !== 'string') return title

  const scene = normalizedString(value.scene, `节点 ${id} 场景`)
  if (typeof scene !== 'string') return scene

  if (!Array.isArray(value.lines) || value.lines.length === 0) {
    return { ok: false, reason: `节点 ${id} 至少需要 1 行文本` }
  }

  const lines: GeneratedStoryLine[] = []
  for (const [lineIndex, line] of value.lines.entries()) {
    const normalized = normalizeLine(line, lineIndex)
    if (isFailure(normalized)) return normalized
    lines.push(normalized)
  }

  if (value.ending !== undefined) {
    if (value.next !== undefined || value.choices !== undefined) {
      return {
        ok: false,
        reason: `结局节点 ${id} 不能同时声明 next 或 choices`,
      }
    }

    const ending = normalizeEnding(value.ending)
    if (isFailure(ending)) return ending

    return { id, title, scene, lines, ending }
  }

  if (value.next !== undefined && value.choices !== undefined) {
    return {
      ok: false,
      reason: `节点 ${id} 不能同时拥有 next 和 choices`,
    }
  }

  if (value.next === undefined && value.choices === undefined) {
    return {
      ok: false,
      reason: `非结局节点 ${id} 必须提供 next 或 choices`,
    }
  }

  if (value.next !== undefined) {
    const next = normalizedString(value.next, `节点 ${id} 的 next`)
    if (typeof next !== 'string') return next
    return { id, title, scene, lines, next }
  }

  if (!Array.isArray(value.choices) || value.choices.length < 2) {
    return {
      ok: false,
      reason: `节点 ${id} 至少需要 2 个选项`,
    }
  }

  const choices: GeneratedStoryChoice[] = []
  const seenChoiceIds = new Set<string>()
  for (const [choiceIndex, choice] of value.choices.entries()) {
    const normalized = normalizeChoice(choice, choiceIndex)
    if (isFailure(normalized)) return normalized

    if (seenChoiceIds.has(normalized.id)) {
      return {
        ok: false,
        reason: `节点 ${id} 存在重复选项 ID：${normalized.id}`,
      }
    }

    seenChoiceIds.add(normalized.id)
    choices.push(normalized)
  }

  return { id, title, scene, lines, choices }
}

function successorIds(node: GeneratedStoryNode): string[] {
  if (node.next) return [node.next]
  if (node.choices) return node.choices.map((choice) => choice.next)
  return []
}

export function validateGeneratedStory(
  value: unknown,
): GeneratedStoryValidationResult {
  if (!isRecord(value)) {
    return { ok: false, reason: 'AI 返回内容不是对象' }
  }

  const title = normalizedString(value.title, '标题')
  if (typeof title !== 'string') return title

  const subtitle = normalizedString(value.subtitle, '副标题')
  if (typeof subtitle !== 'string') return subtitle

  const premise = normalizedString(value.premise, '故事简介')
  if (typeof premise !== 'string') return premise

  const startNodeId = normalizedString(value.startNodeId, '起始节点')
  if (typeof startNodeId !== 'string') return startNodeId

  if (!Array.isArray(value.nodes) || value.nodes.length < 3) {
    return { ok: false, reason: '故事节点数量至少需要 3 个' }
  }

  const nodes: GeneratedStoryNode[] = []
  const nodeMap = new Map<string, GeneratedStoryNode>()
  for (const [index, node] of value.nodes.entries()) {
    const normalized = normalizeNode(node, index)
    if (isFailure(normalized)) return normalized

    if (nodeMap.has(normalized.id)) {
      return { ok: false, reason: `存在重复节点 ID：${normalized.id}` }
    }

    nodeMap.set(normalized.id, normalized)
    nodes.push(normalized)
  }

  if (!nodeMap.has(startNodeId)) {
    return { ok: false, reason: `起始节点不存在：${startNodeId}` }
  }

  for (const node of nodes) {
    for (const nextId of successorIds(node)) {
      if (!nodeMap.has(nextId)) {
        return {
          ok: false,
          reason: `节点 ${node.id} 指向了不存在的节点：${nextId}`,
        }
      }
    }
  }

  const reachable = new Set<string>()
  const pending = [startNodeId]
  while (pending.length > 0) {
    const nodeId = pending.pop()
    if (!nodeId || reachable.has(nodeId)) continue

    const node = nodeMap.get(nodeId)
    if (!node) continue

    reachable.add(nodeId)
    pending.push(...successorIds(node))
  }

  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      return {
        ok: false,
        reason: `存在不可达节点：${node.id}`,
      }
    }
  }

  return {
    ok: true,
    story: {
      title,
      subtitle,
      premise,
      startNodeId,
      nodes,
    },
  }
}
