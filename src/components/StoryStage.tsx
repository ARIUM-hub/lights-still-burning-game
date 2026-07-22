import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import type {
  Choice,
  DialogueLine,
  SceneId,
  Settings,
} from '../engine/types'
import { ChoicePanel } from './ChoicePanel'
import { DialogueBox, type DialogueBoxHandle } from './DialogueBox'

interface StoryStageProps {
  scene: SceneId
  title: string
  line: DialogueLine
  choices: Choice[]
  onAdvance(): void
  onChoose(choiceId: string): void
  textSpeed: Settings['textSpeed']
  reducedMotion: boolean
}

export function StoryStage({
  scene,
  title,
  line,
  choices,
  onAdvance,
  onChoose,
  textSpeed,
  reducedMotion,
}: StoryStageProps) {
  const dialogueRef = useRef<DialogueBoxHandle>(null)
  const [completedText, setCompletedText] = useState<string | null>(null)
  const [failedScene, setFailedScene] = useState<SceneId | null>(null)
  const textIsComplete = completedText === line.text
  const imageHasFailed = failedScene === scene

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (textIsComplete && /^[1-3]$/.test(event.key)) {
      const choice = choices[Number(event.key) - 1]

      if (choice !== undefined) {
        event.preventDefault()
        onChoose(choice.id)
      }
      return
    }

    if (event.target !== event.currentTarget) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      dialogueRef.current?.activate()
    }
  }

  return (
    <section
      className={`story-stage story-stage--${scene}`}
      data-reduced-motion={reducedMotion ? 'true' : undefined}
      aria-label={`剧情场景：${title}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="story-stage__visual" aria-hidden="true">
        {imageHasFailed ? (
          <div className="scene-fallback story-stage__scene-fallback" />
        ) : (
          <img
            className="story-stage__scene-image"
            src={`${import.meta.env.BASE_URL}images/scenes/${scene}.webp`}
            alt=""
            aria-hidden="true"
            onError={() => setFailedScene(scene)}
          />
        )}
      </div>
      <div className="story-stage__content">
        <h1 className="story-stage__title">{title}</h1>
        <DialogueBox
          ref={dialogueRef}
          line={line}
          textSpeed={textSpeed}
          reducedMotion={reducedMotion}
          onAdvance={onAdvance}
          onTextDone={() => setCompletedText(line.text)}
        />
        {textIsComplete && choices.length > 0 ? (
          <ChoicePanel choices={choices} onChoose={onChoose} />
        ) : null}
      </div>
    </section>
  )
}
