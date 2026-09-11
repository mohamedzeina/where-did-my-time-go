import { useLiveQuery } from 'dexie-react-hooks'
import { listActivities } from '../../db/activities'
import { listSessions } from '../../db/sessions'
import type { Activity, Session } from '../../db/types'
import { endOfDay, startOfDay } from '../../lib/totals'
import { useNow } from '../../lib/useNow'

export interface Today {
  /** Local midnight today, epoch ms. */
  from: number
  /** Local midnight tomorrow, epoch ms. */
  to: number
  /** Refreshed every `refreshMs`, for counting running sessions. */
  now: number
  /** Today's sessions, oldest first, including one still running. */
  sessions: Session[]
  /** Every activity by id, archived ones included, so old sessions keep their name and color. */
  activities: Map<string, Activity>
}

/** Today's sessions and the activities they belong to, live. Rolls over at midnight. */
export function useToday(refreshMs = 15_000): Today | undefined {
  const now = useNow(refreshMs).getTime()
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
