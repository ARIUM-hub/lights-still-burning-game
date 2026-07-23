import type { AmbienceId } from '../engine/types'

type SoundSource = AudioBufferSourceNode | OscillatorNode

interface AmbienceLayer {
  gain: GainNode
  sources: SoundSource[]
  nodes: AudioNode[]
}

const FADE_SECONDS = 0.25

export class AudioDirector {
  private readonly factory: () => AudioContext
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private ambience: AmbienceLayer | null = null
  private readonly chimeSources = new Map<OscillatorNode, () => void>()
  private enabled = false
  private volume = 0.45

  constructor(factory: () => AudioContext = () => new AudioContext()) {
    this.factory = factory
  }

  async enable(): Promise<boolean> {
    if (this.enabled && this.context !== null) return true

    try {
      const context = this.context ?? this.factory()
      this.context = context

      if (context.state === 'closed') {
        this.context = null
        this.masterGain = null
        return false
      }

      if (context.state === 'suspended') {
        await context.resume()
      }

      if (this.masterGain === null) {
        const masterGain = context.createGain()
        masterGain.gain.setValueAtTime(this.volume, context.currentTime)
        masterGain.connect(context.destination)
        this.masterGain = masterGain
      }

      this.context = context
      this.enabled = true
      return true
    } catch {
      this.failClosed()
      return false
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setVolume(value: number): void {
    const nextVolume = Math.min(1, Math.max(0, value))
    this.volume = nextVolume

    if (!this.enabled || this.context === null || this.masterGain === null) {
      return
    }

    try {
      this.masterGain.gain.setValueAtTime(
        nextVolume,
        this.context.currentTime,
      )
    } catch {
      this.failClosed()
    }
  }

  playAmbience(id: AmbienceId): void {
    if (!this.enabled || this.context === null || this.masterGain === null) {
      return
    }

    try {
      this.stopAmbience()

      const context = this.context
      const layerGain = context.createGain()
      layerGain.gain.setValueAtTime(1, context.currentTime)
      layerGain.connect(this.masterGain)
      const sources: SoundSource[] = []
      const nodes: AudioNode[] = [layerGain]

      if (id === 'train') {
        const noise = this.createNoise(context, layerGain, 500)
        sources.push(noise.source)
        nodes.push(...noise.nodes)

        const rumble = context.createOscillator()
        rumble.type = 'sine'
        rumble.frequency.setValueAtTime(45, context.currentTime)
        rumble.frequency.linearRampToValueAtTime(
          70,
          context.currentTime + 4,
        )
        rumble.connect(layerGain)
        rumble.start(context.currentTime)
        sources.push(rumble)
        nodes.push(rumble)
      } else {
        const cutoffByAmbience: Record<Exclude<AmbienceId, 'train'>, number> = {
          rain: 6_000,
          cafe: 1_400,
          store: 2_200,
          city: 800,
          warehouse: 450,
        }
        const noise = this.createNoise(
          context,
          layerGain,
          cutoffByAmbience[id],
        )
        sources.push(noise.source)
        nodes.push(...noise.nodes)
      }

      this.ambience = { gain: layerGain, sources, nodes }
    } catch {
      this.failClosed()
    }
  }

  playDoorChime(): void {
    if (!this.enabled || this.context === null || this.masterGain === null) {
      return
    }

    try {
      const context = this.context
      const notes = [
        { frequency: 880, offset: 0 },
        { frequency: 660, offset: 0.16 },
      ]

      for (const note of notes) {
        const startAt = context.currentTime + note.offset
        const stopAt = startAt + 0.18
        const oscillator = context.createOscillator()
        const noteGain = context.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(note.frequency, startAt)
        noteGain.gain.setValueAtTime(0, startAt)
        noteGain.gain.linearRampToValueAtTime(0.18, startAt + 0.02)
        noteGain.gain.linearRampToValueAtTime(0, stopAt)
        oscillator.connect(noteGain)
        noteGain.connect(this.masterGain)
        const cleanup = () => {
          this.chimeSources.delete(oscillator)
          try {
            oscillator.disconnect()
            noteGain.disconnect()
          } catch {
            // 浏览器已释放节点时无需再次断开。
          }
        }
        oscillator.onended = cleanup
        this.chimeSources.set(oscillator, cleanup)
        oscillator.start(startAt)
        oscillator.stop(stopAt)
      }
    } catch {
      this.failClosed()
    }
  }

  stopAll(): void {
    if (this.context === null) return

    this.stopAmbience()

    for (const [source, cleanup] of this.chimeSources) {
      try {
        source.stop(this.context.currentTime)
      } catch {
        cleanup()
      }
    }
  }

  dispose(): void {
    const context = this.context
    this.stopAll()

    try {
      this.masterGain?.disconnect()
      if (context !== null && context.state !== 'closed') {
        void context.close().catch(() => undefined)
      }
    } catch {
      // 销毁阶段的浏览器异常不应传播到 React 卸载流程。
    }

    this.context = null
    this.masterGain = null
    this.ambience = null
    this.enabled = false
  }

  private createNoise(
    context: AudioContext,
    output: AudioNode,
    cutoff: number,
  ): { source: AudioBufferSourceNode; nodes: AudioNode[] } {
    const frameCount = context.sampleRate * 2
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const samples = buffer.getChannelData(0)

    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.random() * 2 - 1
    }

    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    source.buffer = buffer
    source.loop = true
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(cutoff, context.currentTime)
    source.connect(filter)
    filter.connect(output)
    source.start(context.currentTime)
    return { source, nodes: [source, filter] }
  }

  private stopAmbience(): void {
    if (this.context === null || this.ambience === null) return

    const stopAt = this.context.currentTime + FADE_SECONDS
    const { gain, sources, nodes } = this.ambience
    let remainingSources = sources.length
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      for (const node of nodes) {
        try {
          node.disconnect()
        } catch {
          // 浏览器已释放节点时无需再次断开。
        }
      }
    }
    const handleEnded = () => {
      remainingSources -= 1
      if (remainingSources <= 0) cleanup()
    }

    try {
      gain.gain.setValueAtTime(gain.gain.value, this.context.currentTime)
      gain.gain.linearRampToValueAtTime(0, stopAt)
    } catch {
      // 即使淡出参数不可用，仍继续尝试停止声源。
    }

    for (const source of sources) {
      source.onended = handleEnded
      try {
        source.stop(stopAt)
      } catch {
        handleEnded()
      }
    }

    this.ambience = null
  }

  private failClosed(): void {
    const context = this.context

    try {
      this.stopAll()
      this.masterGain?.disconnect()
      if (context !== null && context.state !== 'closed') {
        void context.close().catch(() => undefined)
      }
    } catch {
      // 降级过程本身也必须保持无异常。
    }

    this.context = null
    this.masterGain = null
    this.ambience = null
    this.enabled = false
  }
}
