import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { listSessions } from '../../db/sessions'
import type { Goal } from '../../db/types'
import { goalPeriod, isLimit, nextLimitCheck } from '../../lib/goals'
import { clipSession } from '../../lib/totals'
import { deliverLimitReached } from './limit'
import { useRunningTimer } from './useRunningTimer'

/**
 * Speaks up when a running timer takes its activity past its limit, from whichever view is
 * open. Rather than ticking, it sleeps until the moment the limit would be reached. It only
 * announces a crossing it saw happen: a limit already reached when the app opens, or when the
 * timer starts, stays quiet, the way goals already met on load do.
 */
export function useLimitWatch(): void {
  const running = useRunningTimer()
  const goal = running?.activity.goal
  const id = running?.activity.id
  const name = running?.activity.name
  const limitMs = goal && isLimit(goal) ? goal.ms : undefined
  const limitPeriod = goal && isLimit(goal) ? goal.period : undefined

  // Moved on by each scheduled check, so the period and the time done are worked out afresh.
  const [checkedAt, setCheckedAt] = useState(() => Date.now())
  const period = limitPeriod && goalPeriod({ period: limitPeriod, ms: 0 }, checkedAt)
  const from = period ? period.from : undefined
  const to = period ? period.to : undefined

  // Tagged with what was asked for, so a result for the previous activity or period is never
  // judged against the current limit.
  const result = useLiveQuery(
    async () =>
      id && from !== undefined && to !== undefined
        ? { id, from, sessions: await listSessions({ from, to, activityId: id }) }
        : null,
    [id, from, to],
  )

  const seen = useRef<{ key: string; under: boolean }>(null)

  useEffect(() => {
    if (!id || !name || !limitMs || !limitPeriod || from === undefined || to === undefined) {
      seen.current = null
      return
    }
    if (result?.id !== id || result.from !== from) return

    const now = Date.now()
    let done = 0
    for (const session of result.sessions) {
      const part = clipSession(session, from, to, now)
      if (part) done += part.end - part.start
    }

    const limit: Goal = { kind: 'limit', period: limitPeriod, ms: limitMs }
    const key = `${id}:${limitPeriod}:${limitMs}:${from}`
    const under = done < limitMs
    if (!under && seen.current?.key === key && seen.current.under) {
      deliverLimitReached(name, limit)
    }
    seen.current = { key, under }

    const timeout = setTimeout(
      () => setCheckedAt((previous) => Math.max(Date.now(), previous + 1)),
      Math.max(0, nextLimitCheck(limit, done, now) - now),
    )
    return () => clearTimeout(timeout)
  }, [id, name, limitMs, limitPeriod, from, to, result, checkedAt])
}
