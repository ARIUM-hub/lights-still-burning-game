import { describe, expect, it } from 'vitest'

import { validateGeneratedStory } from './storySchema'

function createValidStory() {
  return {
    title: '灯火以外',
    subtitle: '雨夜里另一种错过',
    premise: '便利店夜班结束后，主角在一通电话和一次邀约之间迟迟不敢做出选择。',
    startNodeId: 'opening',
    nodes: [
      {
        id: 'opening',
        title: '夜班之后',
        scene: '凌晨的便利店门口，雨线在路灯下发白。',
        lines: [
          { speaker: '旁白', text: '卷帘门落下一半，城市还没睡。' },
          { speaker: '周岚', text: '她说再晚一点就赶不上最后一班车。' },
        ],
        choices: [
          { id: 'call-back', label: '立刻回拨电话', next: 'platform' },
          { id: 'go-home', label: '先回家换件干衣服', next: 'apartment' },
        ],
      },
      {
        id: 'platform',
        title: '站台风声',
        scene: '地铁口外的风卷着潮气，广播断断续续。',
        lines: [{ text: '她已经站在雨棚下面等你。' }],
        next: 'ending_together',
      },
      {
        id: 'apartment',
        title: '楼道灯灭了',
        scene: '老旧公寓的楼道忽明忽暗，手机屏幕一遍遍亮起。',
        lines: [{ text: '你站在门口，始终没有按下回拨。' }],
        next: 'ending_missed',
      },
      {
        id: 'ending_together',
        title: '赶上末班车',
        scene: '列车门缓缓闭合，玻璃映出两个人潮湿的影子。',
        lines: [{ text: '你终于在关门前跨了进去。' }],
        ending: {
          id: 'ending_together',
          title: '赶上末班车',
          summary: '你们一起离开了这座站台，但未知仍在前面。',
          epilogue: [
            '她把手心贴在冰凉的车窗上，没有再问你为什么迟疑。',
            '你看着窗外倒退的灯，第一次意识到同行并不等于答案。',
          ],
        },
      },
      {
        id: 'ending_missed',
        title: '灯熄之后',
        scene: '楼道恢复黑暗，只剩下手机电量见底的提示。',
        lines: [{ text: '你听见雨声越来越大，像谁也不会再来的脚步。' }],
        ending: {
          id: 'ending_missed',
          title: '灯熄之后',
          summary: '你没有追上她，也没有追上自己。',
          epilogue: [
            '后来你换了新的门锁，却一直没有删掉那天的未接来电。',
            '每到下雨天，你都会想起那盏只亮了半分钟的楼道灯。',
          ],
        },
      },
    ],
  }
}

describe('validateGeneratedStory', () => {
  it('接受结构完整且可达的 AI 分支故事', () => {
    const result = validateGeneratedStory(createValidStory())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.story.title).toBe('灯火以外')
      expect(result.story.nodes).toHaveLength(5)
    }
  })

  it('拒绝引用不存在节点的选择', () => {
    const story = createValidStory()
    story.nodes[0].choices![0]!.next = 'missing-node'

    const result = validateGeneratedStory(story)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('missing-node')
    }
  })

  it('拒绝不可达节点', () => {
    const story = createValidStory()
    story.nodes.push({
      id: 'orphan',
      title: '不会抵达的巷口',
      scene: '潮湿的小巷只剩下回音。',
      lines: [{ text: '这里不该被任何人看见。' }],
      ending: {
        id: 'orphan',
        title: '无人抵达',
        summary: '这段结局不应该存在。',
        epilogue: ['它游离在故事之外。'],
      },
    })

    const result = validateGeneratedStory(story)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toContain('orphan')
    }
  })
})
