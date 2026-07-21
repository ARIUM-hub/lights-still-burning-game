import type { Ref } from 'react'

interface TopBarProps {
  chapter: string
  title: string
  onOpenSettings(): void
  settingsButtonRef?: Ref<HTMLButtonElement>
}

export function TopBar({
  chapter,
  title,
  onOpenSettings,
  settingsButtonRef,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__context">
        <span className="top-bar__chapter">{chapter}</span>
        <span className="top-bar__title">{title}</span>
      </div>
      <button
        ref={settingsButtonRef}
        className="top-bar__settings-button"
        type="button"
        onClick={onOpenSettings}
      >
        打开设置
      </button>
    </header>
  )
}
