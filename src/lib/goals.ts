import type { Activity, Goal, Session } from '../db/types'
import { startOfWeek } from './insights'
import { addDays, clipSession, endOfDay, startOfDay } from './totals'

/** The day or week (Monday to Monday) a goal is measured over, containing `now`. */
export function goalPeriod(goal: Goal, now: number): { from: number; to: number } {
  if (goal.period === 'day') return { from: startOfDay(now), to: endOfDay(now) }
  const from = startOfWeek(now)
  return { from, to: addDays(from, 7) }
}

export interface GoalProgress {
  done: number
  target: number
  /** 0 to 1. */
  fraction: number
  met: boolean
}

/** Time spent on `activity` so far in its goal's current period. Running time counts. */
export function goalProgress(
  activity: Activity & { goal: Goal },
  sessions: Session[],
  now: number,
): GoalProgress {
  const { from, to } = goalPeriod(activity.goal, now)
  let done = 0
  for (const session of sessions) {
    if (session.activityId !== activity.id) continue
    const part = clipSession(session, from, to, now)
    if (part) done += part.end - part.start
  }
  const target = activity.goal.ms
  return { done, target, fraction: Math.min(1, done / target), met: done >= target }
}

/** A goal amount the way people say it: `4h`, `1h 30m`, `45m`. */
export function formatAmount(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** e.g. `4h a day`, `3h a week`. */
export function formatGoal(goal: Goal): string {
  return `${formatAmount(goal.ms)} a ${goal.period}`
}

export interface GoalRecord {
  /** One entry per day or week in the range, oldest first, up to the current one. */
  periods: { start: number; done: number; met: boolean; current: boolean }[]
  /** Finished periods where the goal was met, plus the current one if already met. */
  metCount: number
  /** Finished periods, plus the current one if already met (it can still be met otherwise). */
  countable: number
}

/**
 * How a goal went over the days (or whole weeks) touching `[from, to)`, up to now: each one
 * and whether it was met. Weeks are judged whole, so pass sessions from the Monday before
 * `from`. The current period only counts once it's met, so an unfinished today isn't a miss.
 */
export function goalRecord(
  activity: Activity & { goal: Goal },
  sessions: Session[],
  from: number,
  to: number,
  now: number,
): GoalRecord {
  const { period, ms: target } = activity.goal
  const mine = sessions.filter((s) => s.activityId === activity.id)
  const last = Math.min(to, endOfDay(now))
  const current = period === 'day' ? startOfDay(now) : startOfWeek(now)

  const periods: GoalRecord['periods'] = []
  for (let start = period === 'day' ? startOfDay(from) : startOfWeek(from); start < last;) {
    const end = addDays(start, period === 'day' ? 1 : 7)
    let done = 0
    for (const session of mine) {
      const part = clipSession(session, start, end, now)
      if (part) done += part.end - part.start
    }
    periods.push({ start, done, met: done >= target, current: start === current })
    start = end
  }

  const countable = periods.filter((p) => !p.current || p.met)
  return {
    periods,
    metCount: countable.filter((p) => p.met).length,
    countable: countable.length,
  }
}
