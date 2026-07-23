import { useEffect, useRef, useState } from 'react'

import type { CharacterNames } from '../engine/types'

interface NamingScreenProps {
  mode: 'start' | 'continue'
  initialNames: CharacterNames
  onConfirm(names: CharacterNames): void
  onBack(): void
}

export function NamingScreen({
  mode,
  initialNames,
  onConfirm,
  onBack,
}: NamingScreenProps) {
  const protagonistRef = useRef<HTMLInputElement>(null)
  const [names, setNames] = useState<CharacterNames>(initialNames)

  useEffect(() => {
    setNames(initialNames)
  }, [initialNames])

  useEffect(() => {
    protagonistRef.current?.focus()
  }, [])

  return (
    <main className="naming-screen">
      <section
        className="naming-screen__content"
        aria-labelledby="naming-screen-title"
      >
        <header className="naming-screen__header">
          <h1 id="naming-screen-title">主角命名</h1>
          <p>先为这场雨夜写下他们的名字。</p>
        </header>

        <div className="naming-screen__fields">
          <label className="naming-screen__field">
            <span>男主名字</span>
            <input
              ref={protagonistRef}
              aria-label="男主名字"
              type="text"
              maxLength={12}
              value={names.protagonist}
              onChange={(event) => {
                const { value } = event.currentTarget
                setNames((current) => ({
                  ...current,
                  protagonist: value,
                }))
              }}
            />
          </label>
          <label className="naming-screen__field">
            <span>女主名字</span>
            <input
              aria-label="女主名字"
              type="text"
              maxLength={12}
              value={names.heroine}
              onChange={(event) => {
                const { value } = event.currentTarget
                setNames((current) => ({
                  ...current,
                  heroine: value,
                }))
              }}
            />
          </label>
        </div>

        <div className="naming-screen__actions">
          <button
            type="button"
            className="naming-screen__primary-action"
            onClick={() => onConfirm(names)}
          >
            {mode === 'continue' ? '带着名字继续雨夜' : '带着名字开始故事'}
          </button>
          <button type="button" onClick={onBack}>
            返回标题
          </button>
        </div>
      </section>
    </main>
  )
}
