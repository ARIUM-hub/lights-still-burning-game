import { stat } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const sceneIds = [
  'cafe',
  'apartment',
  'store',
  'riverside',
  'warehouse',
  'street',
  'station',
] as const

describe.each(sceneIds)('场景插画 %s', (sceneId) => {
  it('是可解码的 1920×1080 WebP 且小于 600KB', async () => {
    const filePath = path.resolve(
      'public',
      'images',
      'scenes',
      `${sceneId}.webp`,
    )
    const [fileStat, metadata] = await Promise.all([
      stat(filePath),
      sharp(filePath).metadata(),
    ])

    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(1920)
    expect(metadata.height).toBe(1080)
    expect(fileStat.size).toBeLessThanOrEqual(600 * 1024)
  })
})
