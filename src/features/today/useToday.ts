import { useLiveQuery } from 'dexie-react-hooks'
import { listActivities } from '../../db/activities'
import { listSessions } from '../../db/sessions'
import type { Activity, Session } from '../../db/types'
import { endOfDay, startOfDay } from '../../lib/totals'

export interface Today {
  /** Local midnight today, epoch ms. */
  from: number
  /** Local midnight tomorrow, epoch ms. */
  to: number
  /** The caller's current time, for counting a running session. */
  now: number
  /** Today's sessions, oldest first, including one still running. */
  sessions: Session[]
  /** Every activity by id, archived ones included, so old sessions keep their name and color. */
  activities: Map<string, Activity>
}

/**
 * Today's sessions and the activities they belong to, live, for the day containing `now`.
 * The caller decides how often `now` moves on (and so when it rolls over at midnight).
 */
export function useToday(now: number): Today | undefined {
  const from = startOfDay(now)
  const to = endOfDay(now)

  const data = useLiveQuery(async () => {
    const [sessions, activities] = await Promise.all([
      listSessions({ from, to }),
      listActivities({ includeArchived: true }),
    ])
    return { sessions, activities: new Map(activities.map((a) => [a.id, a])) }
  }, [from, to])

  return data && { from, to, now, ...data }
}
