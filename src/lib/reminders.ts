/**
 * How often to speak up about a timer that's still running.
 *
 * Away detection repairs time after the fact; this is the other side of it — catching a
 * forgotten timer while it's still running, when stopping it costs one click and no editing.
 */

const KEY = 'wdmtg:remind-every'

const HOUR = 3_600_000

/** What the Data view offers. `0` means never. */
export const REMINDER_CHOICES = [
  { ms: 0, label: 'Off' },
  { ms: HOUR, label: 'Every hour' },
  { ms: 2 * HOUR, label: 'Every 2 hours' },
  { ms: 3 * HOUR, label: 'Every 3 hours' },
  { ms: 4 * HOUR, label: 'Every 4 hours' },
] as const

/** Milliseconds between reminders while a timer runs, or 0 when they're switched off. */
export function reminderEvery(): number {
  try {
    const value = Number(localStorage.getItem(KEY))
    return REMINDER_CHOICES.some((choice) => choice.ms === value) ? value : 0
  } catch {
    return 0
  }
}

export function setReminderEvery(ms: number): void {
  try {
    localStorage.setItem(KEY, String(ms))
  } catch {
    // No storage: reminders just stay off.
  }
  window.dispatchEvent(new Event(KEY))
}

/** Calls `listener` when the interval changes, here or in another tab. */
export function subscribeReminders(listener: () => void): () => void {
  window.addEventListener(KEY, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(KEY, listener)
    window.removeEventListener('storage', listener)
  }
}

/**
 * When the next reminder for a session started at `start` is due: the first whole multiple of
 * `every` after `now`. Counting from the session's own start rather than from whenever the app
 * last loaded means reminders land on the hour of the session — 2:00:00, 4:00:00 — and a
 * reload in between neither repeats one nor shifts the rest.
 *
 * Returns `undefined` when reminders are off.
 */
export function nextReminderAt(start: number, every: number, now: number): number | undefined {
  if (!(every > 0)) return undefined
  const elapsed = Math.max(0, now - start)
  return start + (Math.floor(elapsed / every) + 1) * every
}
