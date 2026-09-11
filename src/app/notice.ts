import { useSyncExternalStore } from 'react'

/**
 * A single short-lived message for the whole app, e.g. "Too short to keep". The newest
 * replaces any current one, and it clears itself after a few seconds.
 */
let current: string | undefined
let clearTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

export function announce(text: string, durationMs = 4000): void {
  current = text
  emit()
  clearTimeout(clearTimer)
  clearTimer = setTimeout(() => {
    current = undefined
    emit()
  }, durationMs)
}

/** Removes the current message right away. */
export function clearNotice(): void {
  clearTimeout(clearTimer)
  if (current === undefined) return
  current = undefined
  emit()
}

export function useNotice(): string | undefined {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}
