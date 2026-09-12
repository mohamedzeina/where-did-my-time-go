/**
 * Presence: the last moment the app is sure it was running on this machine.
 *
 * A running timer is only honest while something is here to watch it. The PC sleeps, the
 * browser is closed, the tab is discarded — and the session quietly keeps counting until you
 * find a nine-hour "Deep work" the next morning. So while a timer runs, the app stamps the
 * clock into localStorage every few seconds. The stamps stop the moment the app does, and
 * anything between the last stamp and now is time nobody watched.
 *
 * The stamp is browser state, not your data: it stays out of IndexedDB and out of backups.
 */

const SEEN_KEY = 'wdmtg:last-seen'
const WATCH_KEY = 'wdmtg:watch-away'

/** How often a running app stamps the clock. Background tabs are throttled to about 1/minute. */
export const HEARTBEAT_MS = 20_000

/**
 * How big a hole has to be before it's worth asking about. Comfortably clear of the ~60 s a
 * throttled background tab can stretch a heartbeat to, so ordinary backgrounding stays silent.
 */
export const AWAY_MS = 5 * 60_000

export interface Gap {
  /** Epoch ms: the last moment the app was watching. */
  from: number
  /** Epoch ms: when it noticed it was back. */
  to: number
}

export function readLastSeen(): number | undefined {
  try {
    const value = Number(localStorage.getItem(SEEN_KEY))
    return Number.isFinite(value) && value > 0 ? value : undefined
  } catch {
    return undefined
  }
}

export function markSeen(at = Date.now()): void {
  try {
    localStorage.setItem(SEEN_KEY, String(at))
  } catch {
    // No storage (private mode, quota): gaps simply go unnoticed rather than break the timer.
  }
}

export function forgetSeen(): void {
  try {
    localStorage.removeItem(SEEN_KEY)
  } catch {
    // As above.
  }
}

/** Whether to watch the machine itself for idleness, which costs a browser permission. */
export function awayWatchEnabled(): boolean {
  try {
    return localStorage.getItem(WATCH_KEY) === '1'
  } catch {
    return false
  }
}

export function setAwayWatchEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(WATCH_KEY, enabled ? '1' : '0')
  } catch {
    // As above.
  }
  window.dispatchEvent(new Event(WATCH_KEY))
}

/** Calls `listener` when the switch is flipped, here or in another tab. */
export function subscribeAwayWatch(listener: () => void): () => void {
  window.addEventListener(WATCH_KEY, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(WATCH_KEY, listener)
    window.removeEventListener('storage', listener)
  }
}

/**
 * The unwatched stretch of a session that started at `sessionStart`, or `undefined` when
 * there's nothing worth asking about.
 *
 * The gap never reaches back before the session itself: a stamp older than the session (a
 * restored backup, a clock that moved) means the whole session went unwatched, not that time
 * before it did. A stamp in the future is treated the same way, so a clock moving backwards
 * can't invent an absence.
 */
export function unwatchedGap(
  lastSeen: number | undefined,
  now: number,
  sessionStart: number,
  threshold = AWAY_MS,
): Gap | undefined {
  if (lastSeen === undefined) return undefined
  const from = Math.max(lastSeen, sessionStart)
  return now - from >= threshold ? { from, to: now } : undefined
}
