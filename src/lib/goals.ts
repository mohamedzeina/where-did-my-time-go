import type { Activity, Goal, Session } from '../db/types'
import { startOfWeek } from './insights'
import { addDays, clipSession, endOfDay, startOfDay } from './totals'

/** The day or week (Monday to Monday) a goal is measured over, containing `now`. */
export function goalPeriod(goal: Goal, now: number): { from: number; to: number } {
  if (goal.period === 'day') return { from: startOfDay(now), to: endOfDay(now) }
  const from = startOfWeek(now)
  return { from, to: addDays(from, 7) }
}

/** Whether a goal is a ceiling (at most) rather than a target (at least). */
export const isLimit = (goal: Goal) => goal.kind === 'limit'

export interface GoalProgress {
  done: number
  target: number
  /** 0 to 1. */
  fraction: number
  /** The amount has been reached, whichever way the goal points. */
  met: boolean
  limit: boolean
  /** Only ever true for a limit: more time than it allows. */
  over: boolean
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
  const limit = isLimit(activity.goal)
  return {
    done,
    target,
    fraction: Math.min(1, done / target),
    met: done >= target,
    limit,
    over: limit && done > target,
  }
}

/** A goal amount the way people say it: `4h`, `1h 30m`, `45m`. */
export function formatAmount(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** e.g. `4h a day`, `3h a week`, `at most 2h a day`. */
export function formatGoal(goal: Goal): string {
  return `${isLimit(goal) ? 'at most ' : ''}${formatAmount(goal.ms)} a ${goal.period}`
}

/**
 * When a running limit next needs looking at: the moment it's reached if the timer keeps
 * going, or the start of the next period, when the count starts over, if that comes first or
 * the limit is already reached.
 */
export function nextLimitCheck(goal: Goal, done: number, now: number): number {
  const { to } = goalPeriod(goal, now)
  return done < goal.ms ? Math.min(now + goal.ms - done, to) : to
}

export interface GoalRecord {
  /**
   * One entry per day or week in the range, oldest first, up to the current one. `met` means
   * the target was reached, or for a limit, that time stayed within it.
   */
  periods: { start: number; done: number; met: boolean; current: boolean }[]
  /** Settled periods where the goal was met. */
  metCount: number
  /**
   * Finished periods, plus the current one once it's settled: a target once it's met, a limit
   * once it's broken. Until then either could still go the other way.
   */
  countable: number
}

/**
 * How a goal went over the days (or whole weeks) touching `[from, to)`, up to now: each one
 * and whether it was met. Weeks are judged whole, so pass sessions from the Monday before
 * `from`. The current period only counts once it's settled, so an unfinished today is neither
 * a missed target nor a kept limit.
 */
export function goalRecord(
  activity: Activity & { goal: Goal },
  sessions: Session[],
  from: number,
  to: number,
  now: number,
): GoalRecord {
  const { period, ms: target } = activity.goal
  const limit = isLimit(activity.goal)
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
    const met = limit ? done <= target : done >= target
    periods.push({ start, done, met, current: start === current })
    start = end
  }

  const countable = periods.filter((p) => !p.current || (limit ? !p.met : p.met))
  return {
    periods,
    metCount: countable.filter((p) => p.met).length,
    countable: countable.length,
  }
}
