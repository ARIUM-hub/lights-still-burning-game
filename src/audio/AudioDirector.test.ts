import { describe, expect, it, vi } from 'vitest'

import { AudioDirector } from './AudioDirector'

function createAudioParam(initialValue = 1) {
  return {
    value: initialValue,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  }
}

function createFakeAudioContext(state: AudioContextState = 'running') {
  const gains: Array<{
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    gain: ReturnType<typeof createAudioParam>
  }> = []
  const bufferSources: Array<{
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    buffer: AudioBuffer | null
    loop: boolean
    onended: (() => void) | null
  }> = []
  const filters: Array<{
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    frequency: ReturnType<typeof createAudioParam>
    type: BiquadFilterType
  }> = []
  const oscillators: Array<{
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
    start: ReturnType<typeof vi.fn>
    stop: ReturnType<typeof vi.fn>
    frequency: ReturnType<typeof createAudioParam>
    type: OscillatorType
    onended: (() => void) | null
  }> = []
  const destination = { connect: vi.fn(), disconnect: vi.fn() }
  const resume = vi.fn().mockResolvedValue(undefined)
  const close = vi.fn().mockResolvedValue(undefined)
  const createGain = vi.fn(() => {
    const gain = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: createAudioParam(),
    }
    gains.push(gain)
    return gain
  })
  const createBiquadFilter = vi.fn(() => {
    const filter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      frequency: createAudioParam(),
      type: 'lowpass' as BiquadFilterType,
    }
    filters.push(filter)
    return filter
  })
  const createBufferSource = vi.fn(() => {
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null,
      loop: false,
      onended: null,
    }
    bufferSources.push(source)
    return source
  })
  const createOscillator = vi.fn(() => {
    const oscillator = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: createAudioParam(),
      type: 'sine' as OscillatorType,
      onended: null,
    }
    oscillators.push(oscillator)
    return oscillator
  })

  const context = {
    state,
    currentTime: 0,
    sampleRate: 44_100,
    destination,
    resume,
    close,
    createGain,
    createBiquadFilter,
    createOscillator,
    createBuffer: vi.fn(() => ({
      getChannelData: () => new Float32Array(44_100),
    })),
    createBufferSource,
  } as unknown as AudioContext

  return {
    context,
    gains,
    bufferSources,
    filters,
    oscillators,
    resume,
    close,
  }
}

describe('AudioDirector', () => {
  it('浏览器拒绝 AudioContext 时保持静音且不抛错', async () => {
    const director = new AudioDirector(() => {
      throw new Error('blocked')
    })

    await expect(director.enable()).resolves.toBe(false)
    expect(director.isEnabled()).toBe(false)
  })

  it('恢复挂起的上下文并创建总音量节点', async () => {
    const fake = createFakeAudioContext('suspended')
    const director = new AudioDirector(() => fake.context)

    await expect(director.enable()).resolves.toBe(true)

    expect(fake.resume).toHaveBeenCalledOnce()
    expect(fake.gains[0].connect).toHaveBeenCalledWith(
      fake.context.destination,
    )
    expect(director.isEnabled()).toBe(true)
  })

  it('切换场景时淡出并停止旧声音层', async () => {
    const fake = createFakeAudioContext()
    const director = new AudioDirector(() => fake.context)
    await director.enable()

    director.playAmbience('rain')
    const rainSource = fake.bufferSources[0]
    const rainGain = fake.gains[1]
    director.playAmbience('train')

    expect(rainGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      0.25,
    )
    expect(rainSource.stop).toHaveBeenCalledWith(0.25)

    rainSource.onended?.()
    expect(rainSource.disconnect).toHaveBeenCalledOnce()
    expect(fake.filters[0].disconnect).toHaveBeenCalledOnce()
    expect(rainGain.disconnect).toHaveBeenCalledOnce()
  })

  it('把总音量限制在零到一之间', async () => {
    const fake = createFakeAudioContext()
    const director = new AudioDirector(() => fake.context)
    await director.enable()

    director.setVolume(2)
    director.setVolume(-1)

    expect(fake.gains[0].gain.setValueAtTime).toHaveBeenNthCalledWith(2, 1, 0)
    expect(fake.gains[0].gain.setValueAtTime).toHaveBeenNthCalledWith(3, 0, 0)
  })

  it('使用两个短促振荡器播放便利店门铃', async () => {
    const fake = createFakeAudioContext()
    const director = new AudioDirector(() => fake.context)
    await director.enable()

    director.playDoorChime()

    expect(fake.oscillators).toHaveLength(2)
    expect(fake.oscillators[0].start).toHaveBeenCalledWith(0)
    expect(fake.oscillators[0].stop).toHaveBeenCalledWith(0.18)
    expect(fake.oscillators[1].start).toHaveBeenCalledWith(0.16)
    expect(fake.oscillators[1].stop.mock.calls[0][0]).toBeCloseTo(0.34)

    fake.oscillators[0].onended?.()
    director.stopAll()
    expect(fake.oscillators[0].disconnect).toHaveBeenCalledOnce()
    expect(fake.gains[1].disconnect).toHaveBeenCalledOnce()
    expect(fake.oscillators[0].stop).toHaveBeenCalledOnce()
  })

  it('运行时合成失败会关闭上下文并安全降级为静音', async () => {
    const fake = createFakeAudioContext()
    const director = new AudioDirector(() => fake.context)
    await director.enable()
    vi.spyOn(fake.context, 'createOscillator').mockImplementation(() => {
      throw new Error('oscillator unavailable')
    })

    expect(() => director.playAmbience('train')).not.toThrow()

    expect(fake.close).toHaveBeenCalledOnce()
    expect(director.isEnabled()).toBe(false)
  })

  it('销毁时停止声音并关闭上下文', async () => {
    const fake = createFakeAudioContext()
    const director = new AudioDirector(() => fake.context)
    await director.enable()
    director.playAmbience('city')

    director.dispose()

    expect(fake.bufferSources[0].stop).toHaveBeenCalled()
    expect(fake.close).toHaveBeenCalledOnce()
    expect(director.isEnabled()).toBe(false)
  })
})
