'use client'

import { useEffect, useRef } from 'react'

export interface VideoKeyboardShortcutsOptions {
  onToggleLike?: () => void
  onMute?: () => void
  onUnmute?: () => void
  onTogglePlay?: () => void
  onNext?: () => void
  onPrev?: () => void
  enabled?: boolean
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  if (target.getAttribute('role') === 'textbox') return true
  if (target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"]')) return true
  return false
}

export function useVideoKeyboardShortcuts({
  onToggleLike,
  onMute,
  onUnmute,
  onTogglePlay,
  onNext,
  onPrev,
  enabled = true,
}: VideoKeyboardShortcutsOptions) {
  const lastMPressRef = useRef<number>(0)
  const handlersRef = useRef({
    onToggleLike,
    onMute,
    onUnmute,
    onTogglePlay,
    onNext,
    onPrev,
  })

  useEffect(() => {
    handlersRef.current = {
      onToggleLike,
      onMute,
      onUnmute,
      onTogglePlay,
      onNext,
      onPrev,
    }
  })

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Input safety: ignore if typing in input/textarea/editable
      if (isEditableElement(e.target)) {
        return
      }

      // Space: Pause/Play
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        handlersRef.current.onTogglePlay?.()
        return
      }

      // L: Like/Unlike
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        handlersRef.current.onToggleLike?.()
        return
      }

      // M: Single M = Mute, Double M (within 400ms) = Unmute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        const now = Date.now()
        if (now - lastMPressRef.current < 400) {
          // Double press -> Unmute
          lastMPressRef.current = 0
          handlersRef.current.onUnmute?.()
        } else {
          // Single press -> Mute
          lastMPressRef.current = now
          handlersRef.current.onMute?.()
        }
        return
      }

      // Up Arrow / k: Previous video
      if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        handlersRef.current.onPrev?.()
        return
      }

      // Down Arrow / j: Next video
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        handlersRef.current.onNext?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
