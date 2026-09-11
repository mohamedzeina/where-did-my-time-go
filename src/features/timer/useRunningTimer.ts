import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { getActivity } from '../../db/activities'
import { getRunningSession } from '../../db/sessions'
import type { Activity, Session } from '../../db/types'

export interface RunningTimer {
  session: Session
  activity: Activity
}

/**
 * What's being timed right now, kept in sync with the database (so it survives reloads and
 * updates across tabs). `undefined` while loading, `null` when nothing is running.
 */
export function useRunningTimer(): RunningTimer | null | undefined {
  return useLiveQuery(async () => {
    const session = await getRunningSession()
    if (!session) return null
    const activity = await getActivity(session.activityId)
    return activity ? { session, activity } : null
  }, [])
}

/**
 * Milliseconds since `start`, re-rendering on each whole second counted from `start` so the
 * display never skips or repeats a second. Returns 0 when there's no start.
 */
export function useElapsed(start: number | undefined): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (start === undefined) return
    let timeout: ReturnType<typeof setTimeout>
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const msToNextSecond = 1000 - ((((t - start) % 1000) + 1000) % 1000)
      timeout = setTimeout(tick, msToNextSecond + 5)
    }
    tick()
    return () => clearTimeout(timeout)
  }, [start])

  return start === undefined ? 0 : Math.max(0, now - start)
}
