import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { resolveGap, type GapAction } from '../../db/sessions'
import { watchMachine } from '../../lib/idle'
import {
  AWAY_MS,
  awayWatchEnabled,
  forgetSeen,
  HEARTBEAT_MS,
  markSeen,
  readLastSeen,
  subscribeAwayWatch,
  unwatchedGap,
} from '../../lib/presence'
import { useRunningTimer } from './useRunningTimer'

/** A stretch of the running session the app can't vouch for, waiting to be settled. */
export interface AwayGap {
  sessionId: string
  /** When the session being asked about began, which fixes how much of it predates the gap. */
  sessionStart: number
  from: number
  to: number
  /** Why the app stopped watching, which is the part worth telling you about. */
  reason: 'closed' | 'idle'
}

export interface AwayWatch {
  gap?: AwayGap
  /** What's being timed, for naming it in the question. */
  activityName?: string
  /** Accepts the time as tracked and dismisses the question. */
  keep(): void
  /** Cuts the away time out, or ends the session where you left. */
  settle(action: GapAction): Promise<void>
}

/**
 * Watches for time a running timer counted while nobody was there, from two directions.
 *
 * The heartbeat catches the app not running at all — the PC slept, the browser was closed, the
 * tab was discarded — because the stamps simply stop. System idle detection, when it's been
 * switched on, catches the other half: you walked away or locked the screen while everything
 * stayed up. Either way the app only ever *asks*; the timer is never edited behind your back,
 * so ignoring the question keeps the time exactly as tracked.
 */
export function useAwayWatch(): AwayWatch {
  const running = useRunningTimer()
  const [pending, setPending] = useState<AwayGap>()

  const watchMachineIdle = useSyncExternalStore(subscribeAwayWatch, awayWatchEnabled)

  // `undefined` means the database hasn't answered yet, which is not the same as nothing
  // running: the stamp has to survive that wait, or every reload would wipe the evidence.
  const loading = running === undefined
  const sessionId = running?.session.id
  const start = running?.session.start

  // A question about a session that's no longer running has been answered some other way —
  // stopped here, or in another tab — so it stops counting as pending.
  const gap = pending?.sessionId === sessionId ? pending : undefined

  /**
   * Two holes can describe one absence: you walk away (idle), then the PC sleeps (closed).
   * Widening rather than replacing keeps that a single question, whichever arrives first.
   */
  const raise = useCallback((next: AwayGap) => {
    setPending((current) =>
      current?.sessionId === next.sessionId
        ? {
            ...current,
            from: Math.min(current.from, next.from),
            to: Math.max(current.to, next.to),
          }
        : next,
    )
  }, [])

  // The heartbeat: stamp the clock, and before each stamp look at how old the last one is.
  useEffect(() => {
    if (loading) return
    if (sessionId === undefined || start === undefined) {
      forgetSeen()
      return
    }

    const check = () => {
      const now = Date.now()
      const found = unwatchedGap(readLastSeen(), now, start)
      markSeen(now)
      if (found) raise({ ...found, sessionId, sessionStart: start, reason: 'closed' })
    }

    check()
    const interval = setInterval(check, HEARTBEAT_MS)
    // Coming back to the tab is the other moment a frozen stamp shows up; waking the PC with
    // the tab already focused fires neither, which is what the interval is for.
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [loading, sessionId, start, raise])

  // System idle, when it's switched on and permitted.
  useEffect(() => {
    if (sessionId === undefined || start === undefined || !watchMachineIdle) return

    let goneSince: number | undefined
    let stop: (() => void) | undefined
    let dropped = false

    void watchMachine(AWAY_MS, ({ userState, screenState }) => {
      const now = Date.now()
      if (userState === 'idle' || screenState === 'locked') {
        // Locking the screen happens the moment you leave; input merely stopping is only
        // reported once the whole threshold has passed, so that absence began earlier.
        goneSince ??= screenState === 'locked' ? now : now - AWAY_MS
        return
      }
      if (goneSince === undefined) return
      const from = Math.max(goneSince, start)
      goneSince = undefined
      markSeen(now)
      if (now - from >= AWAY_MS) {
        raise({ from, to: now, sessionId, sessionStart: start, reason: 'idle' })
      }
    }).then((off) => (dropped ? off?.() : (stop = off)))

    return () => {
      dropped = true
      stop?.()
    }
  }, [watchMachineIdle, sessionId, start, raise])

  const keep = useCallback(() => setPending(undefined), [])

  const settle = useCallback(
    async (action: GapAction) => {
      if (!gap) return
      setPending(undefined)
      // `to` is when you got back, not when you answered: the time spent reading the question
      // belongs to the resumed session either way.
      await resolveGap(gap.sessionId, gap.from, action, gap.to)
      markSeen()
    },
    [gap],
  )

  return { gap, activityName: running?.activity.name, keep, settle }
}
