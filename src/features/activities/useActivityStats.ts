import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'
import { announce } from '../../app/notice'
import { listSessions } from '../../db/sessions'
import type { Activity, Goal } from '../../db/types'
import { goalPeriod, goalProgress, type GoalProgress } from '../../lib/goals'
import { bucketize, startOfWeek } from '../../lib/insights'
import { addDays, endOfDay, startOfDay } from '../../lib/totals'
import { useTicker } from '../../lib/useTicker'
import type { RunningTimer } from '../timer/useRunningTimer'

export interface ActivityStats {
  /** Tracked today, in ms. */
  today: number
  /** The last 7 days in ms, oldest first, today last. */
  week: number[]
  /** Only for activities with a goal. */
  progress?: GoalProgress
}

const hasGoal = (a: Activity): a is Activity & { goal: Goal } => a.goal !== undefined

/**
 * Per-activity numbers for the timer list: the last seven days, today's total, and progress
 * toward a goal. One query covers all three, and it ticks in step with the running timer.
 * Reaching a goal while you watch says so once; goals already met on load stay quiet.
 */
export function useActivityStats(
  activities: Activity[],
  running: RunningTimer | null,
): Map<string, ActivityStats> {
  const now = useTicker(running?.session.start)
  const sevenDaysAgo = addDays(startOfDay(now), -6)
  // Far enough back for both the sparkline and the current week of any weekly goal.
  const from = Math.min(sevenDaysAgo, startOfWeek(now))
  const to = endOfDay(now)
  const sessions = useLiveQuery(() => listSessions({ from, to }), [from, to])

  const stats = new Map<string, ActivityStats>()
  if (sessions) {
    const days = bucketize(sessions, sevenDaysAgo, to, now, 'day')
    for (const activity of activities) {
      const week = days.map((day) => day.byActivity.get(activity.id) ?? 0)
      stats.set(activity.id, {
        today: week[week.length - 1] ?? 0,
        week,
        progress: hasGoal(activity) ? goalProgress(activity, sessions, now) : undefined,
      })
    }
  }

  // One key per activity, goal and period, so a new day or a changed goal starts fresh.
  const keyed = activities.filter(hasGoal).flatMap((activity) => {
    const progress = stats.get(activity.id)?.progress
    return progress
      ? [
          {
            activity,
            key: `${activity.id}:${activity.goal.period}:${activity.goal.ms}:${goalPeriod(activity.goal, now).from}`,
            met: progress.met,
          },
        ]
      : []
  })
  const signature = keyed.map((k) => `${k.key}=${k.met}`).join('|')

  const seen = useRef<Map<string, boolean>>(null)
  useEffect(() => {
    const previous = seen.current
    for (const { activity, key, met } of keyed) {
      if (met && previous?.get(key) === false) {
        announce(
          `${activity.name}: ${activity.goal.period === 'day' ? 'daily' : 'weekly'} goal reached.`,
        )
      }
    }
    seen.current = new Map(keyed.map((k) => [k.key, k.met]))
    // `signature` captures everything `keyed` holds that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  return stats
}
