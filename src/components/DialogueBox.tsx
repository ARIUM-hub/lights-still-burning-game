import { forwardRef, useImperativeHandle, useRef } from 'react'

import type { DialogueLine, Settings } from '../engine/types'
import { TypewriterText, type TypewriterHandle } from './TypewriterText'

export interface DialogueBoxHandle {
  activate(): void
}

interface DialogueBoxProps {
  line: DialogueLine
  textSpeed: Settings['textSpeed']
  reducedMotion: boolean
  onAdvance(): void
  onTextDone?(): void
}

export const DialogueBox = forwardRef<DialogueBoxHandle, DialogueBoxProps>(
  function DialogueBox(
    {
      line,
      textSpeed,
      reducedMotion,
      onAdvance,
      onTextDone = () => undefined,
    },
    ref,
  ) {
    const typewriterRef = useRef<TypewriterHandle>(null)

    function activate() {
      if (!typewriterRef.current?.revealAll()) {
        onAdvance()
      }
    }

    useImperativeHandle(ref, () => ({ activate }), [onAdvance])

    return (
      <div className="dialogue-box">
        <div className="dialogue-box__content">
          {line.speaker === undefined ? (
            <span className="sr-only">旁白</span>
          ) : (
            <span className="dialogue-box__speaker">{line.speaker}</span>
          )}
          <span className="dialogue-box__text">
            <TypewriterText
              ref={typewriterRef}
              text={line.text}
              speed={textSpeed}
              reducedMotion={reducedMotion}
              onDone={onTextDone}
            />
          </span>
        </div>
        <button
          type="button"
          className="dialogue-box__advance"
          aria-label="推进剧情"
          onClick={activate}
        >
          <span aria-hidden="true">继续</span>
        </button>
      </div>
    )
  },
)
