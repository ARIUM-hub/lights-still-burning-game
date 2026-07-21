import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import type { Settings } from '../engine/types'

interface SettingsSheetProps {
  open: boolean
  settings: Settings
  onChange(patch: Partial<Settings>): void
  onClose(): void
  onClearRoute(): void
  onClearAllProgress(): void
}

export function SettingsSheet({
  open,
  settings,
  onChange,
  onClose,
  onClearRoute,
  onClearAllProgress,
}: SettingsSheetProps) {
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const [confirmingRoute, setConfirmingRoute] = useState(false)
  const [confirmingCollection, setConfirmingCollection] = useState(false)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) {
      setConfirmingRoute(false)
      setConfirmingCollection(false)
      return
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      event.preventDefault()
      setConfirmingRoute(false)
      setConfirmingCollection(false)
      onCloseRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [open])

  function handleClose() {
    setConfirmingRoute(false)
    setConfirmingCollection(false)
    onClose()
  }

  function handleTextSpeedChange(event: ChangeEvent<HTMLSelectElement>) {
    const textSpeed = event.currentTarget.value

    if (
      textSpeed === 'slow' ||
      textSpeed === 'normal' ||
      textSpeed === 'instant'
    ) {
      onChange({ textSpeed })
    }
  }

  function handleClearRoute() {
    setConfirmingRoute(false)
    onClearRoute()
  }

  function handleClearAllProgress() {
    setConfirmingCollection(false)
    onClearAllProgress()
  }

  if (!open) return null

  return (
    <div className="settings-sheet__backdrop">
      <section
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="settings-sheet__header">
          <h2 id={titleId}>设置</h2>
          <button
            ref={closeButtonRef}
            className="settings-sheet__close"
            type="button"
            onClick={handleClose}
          >
            关闭设置
          </button>
        </header>

        <div className="settings-sheet__fields">
          <label className="settings-sheet__field">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) =>
                onChange({ soundEnabled: event.currentTarget.checked })
              }
            />
            开启声音
          </label>

          <label className="settings-sheet__field">
            <span>总音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(event) =>
                onChange({ masterVolume: Number(event.currentTarget.value) })
              }
            />
          </label>

          <label className="settings-sheet__field">
            <span>文字速度</span>
            <select
              value={settings.textSpeed}
              onChange={handleTextSpeedChange}
            >
              <option value="slow">慢</option>
              <option value="normal">正常</option>
              <option value="instant">立即</option>
            </select>
          </label>

          <label className="settings-sheet__field">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) =>
                onChange({ reducedMotion: event.currentTarget.checked })
              }
            />
            减少动态
          </label>
        </div>

        <section
          className="settings-sheet__danger-zone"
          aria-labelledby={`${titleId}-danger`}
        >
          <h3 id={`${titleId}-danger`}>清除进度</h3>
          <p>以下操作不会更改普通设置，请确认后再清除。</p>

          <div className="settings-sheet__danger-action">
            {confirmingRoute ? (
              <>
                <button type="button" onClick={handleClearRoute}>
                  确认清除当前路线
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRoute(false)}
                >
                  取消清除当前路线
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmingRoute(true)}>
                清除当前路线
              </button>
            )}
          </div>

          <div className="settings-sheet__danger-action">
            {confirmingCollection ? (
              <>
                <button type="button" onClick={handleClearAllProgress}>
                  确认清除全部收藏
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCollection(false)}
                >
                  取消清除全部收藏
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCollection(true)}
              >
                清除全部收藏
              </button>
            )}
          </div>
        </section>
      </section>
    </div>
  )
}
