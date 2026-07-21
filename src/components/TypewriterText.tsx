import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { Settings } from '../engine/types'

const SPEED_INTERVALS: Record<Settings['textSpeed'], number> = {
  slow: 55,
  normal: 32,
  instant: 0,
}

export interface TypewriterHandle {
  revealAll(): boolean
}

interface TypewriterTextProps {
  text: string
  speed: Settings['textSpeed']
  reducedMotion: boolean
  onDone(): void
}

interface TextProgress {
  text: string
  count: number
}

export const TypewriterText = forwardRef<
  TypewriterHandle,
  TypewriterTextProps
>(function TypewriterText(
  { text, speed, reducedMotion, onDone },
  ref,
) {
  const characters = useMemo(() => Array.from(text), [text])
  const isInstant = speed === 'instant' || reducedMotion
  const [progress, setProgress] = useState<TextProgress>(() => ({
    text,
    count: isInstant ? characters.length : 0,
  }))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedRef = useRef(false)
  const activeTextRef = useRef(text)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  if (activeTextRef.current !== text) {
    activeTextRef.current = text
    completedRef.current = false
  }

  const displayedCount =
    progress.text === text
      ? progress.count
      : isInstant
        ? characters.length
        : 0

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    setProgress({
      text,
      count: isInstant ? characters.length : 0,
    })
  }, [text])

  useEffect(() => {
    clearTimer()

    if (isInstant) {
      setProgress({ text, count: characters.length })
      return clearTimer
    }

    let nextCount = progress.text === text ? progress.count : 0

    function scheduleNextCharacter() {
      if (nextCount >= characters.length) return

      timerRef.current = setTimeout(() => {
        nextCount += 1
        setProgress({ text, count: nextCount })
        scheduleNextCharacter()
      }, SPEED_INTERVALS[speed])
    }

    scheduleNextCharacter()
    return clearTimer
  }, [text, speed, reducedMotion])

  useEffect(() => {
    if (
      progress.text === text &&
      progress.count >= characters.length &&
      !completedRef.current
    ) {
      completedRef.current = true
      onDoneRef.current()
    }
  }, [characters.length, progress, text])

  useImperativeHandle(
    ref,
    () => ({
      revealAll() {
        if (displayedCount >= characters.length) return false

        clearTimer()
        setProgress({ text, count: characters.length })
        return true
      },
    }),
    [characters.length, displayedCount, text],
  )

  return (
    <span className="typewriter-text" data-testid="typewriter">
      {characters.slice(0, displayedCount).join('')}
    </span>
  )
})
