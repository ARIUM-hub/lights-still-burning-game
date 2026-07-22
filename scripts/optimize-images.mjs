import fs from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const scenes = [
  'cafe',
  'apartment',
  'store',
  'riverside',
  'warehouse',
  'street',
  'station',
]
const sourceDir = path.resolve('art/source')
const outputDir = path.resolve('public/images/scenes')
const maximumBytes = 600 * 1024

await fs.mkdir(outputDir, { recursive: true })

for (const scene of scenes) {
  const source = path.join(sourceDir, `${scene}.png`)
  await fs.access(source)

  const pipeline = sharp(source)
    .rotate()
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })

  let output
  let finalQuality = 82

  for (let quality = 82; quality >= 68; quality -= 2) {
    const candidate = await pipeline
      .clone()
      .webp({ quality, effort: 6 })
      .toBuffer()

    output = candidate
    finalQuality = quality
    if (candidate.length <= maximumBytes) break
  }

  if (output.length > maximumBytes) {
    throw new Error(`${scene} 在质量 68 时仍超过 600KB`)
  }

  await fs.writeFile(path.join(outputDir, `${scene}.webp`), output)
  console.log(`${scene}: ${output.length} bytes, quality ${finalQuality}`)
}
