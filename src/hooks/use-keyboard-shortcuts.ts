import { useEffect } from 'react'

interface ShortcutConfig {
  onNext?: () => void
  onPrevious?: () => void
  onTogglePlay?: () => void
  onToggleMute?: () => void
  onToggleLike?: () => void
  onToggleComments?: () => void
  onEscape?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onNext,
  onPrevious,
  onTogglePlay,
  onToggleMute,
  onToggleLike,
  onToggleComments,
  onEscape,
  enabled = true,
}: ShortcutConfig) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if active element is an input or textarea
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if (isInput) {
        if (e.key === 'Escape' && onEscape) {
          onEscape()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
        case 'J':
          if (onNext) {
            e.preventDefault()
            onNext()
          }
          break
        case 'ArrowUp':
        case 'k':
        case 'K':
          if (onPrevious) {
            e.preventDefault()
            onPrevious()
          }
          break
        case ' ':
          if (onTogglePlay) {
            e.preventDefault()
            onTogglePlay()
          }
          break
        case 'm':
        case 'M':
          if (onToggleMute) {
            e.preventDefault()
            onToggleMute()
          }
          break
        case 'l':
        case 'L':
          if (onToggleLike) {
            e.preventDefault()
            onToggleLike()
          }
          break
        case 'c':
        case 'C':
          if (onToggleComments) {
            e.preventDefault()
            onToggleComments()
          }
          break
        case 'Escape':
          if (onEscape) {
            e.preventDefault()
            onEscape()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    enabled,
    onNext,
    onPrevious,
    onTogglePlay,
    onToggleMute,
    onToggleLike,
    onToggleComments,
    onEscape,
  ])
}