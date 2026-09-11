import type { Session } from '../db/types'
import { addDays, clipSession, endOfDay, startOfDay } from './totals'

const HOUR = 3_600_000

/** Monday 00:00 of the week containing `t`, local time. */
export function startOfWeek(t: number): number {
  const day = startOfDay(t)
  const sinceMonday = (new Date(day).getDay() + 6) % 7
  return addDays(day, -sinceMonday)
}

export type BucketUnit = 'day' | 'week'

/** Daily columns stay readable up to about six weeks; past that, one column per week. */
export function bucketUnitFor(from: number, to: number): BucketUnit {
  return daysBetween(from, to) > 45 ? 'week' : 'day'
}

/** Whole calendar days from `from` to `to` (both local midnights). */
export function daysBetween(from: number, to: number): number {
  return Math.round((to - from) / (24 * HOUR))
}

export interface Bucket {
  /** Start of the day or week, clamped to the range. */
  start: number
  /** Exclusive end, clamped to the range. */
  end: number
  byActivity: Map<string, number>
  total: number
}

/** Time per activity in each day or week of `[from, to)`, oldest first. Empty buckets included. */
export function bucketize(
  sessions: Session[],
  from: number,
  to: number,
  now: number,
  unit: BucketUnit,
): Bucket[] {
  const buckets: Bucket[] = []
  let cursor = unit === 'week' ? startOfWeek(from) : startOfDay(from)
  while (cursor < to) {
    const next = addDays(cursor, unit === 'week' ? 7 : 1)
    const start = Math.max(cursor, from)
    const end = Math.min(next, to)
    const byActivity = new Map<string, number>()
    let total = 0
    for (const session of sessions) {
      const part = clipSession(session, start, end, now)
      if (!part) continue
      const ms = part.end - part.start
      byActivity.set(session.activityId, (byActivity.get(session.activityId) ?? 0) + ms)
      total += ms
    }
    buckets.push({ start, end, byActivity, total })
    cursor = next
  }
  return buckets
}

/**
 * Round gridline values for a time axis, in ms, starting at 0 and covering `max`. Steps are
 * hours people count in (15m, 30m, 1h, 2h…), aiming for at most five lines.
 */
export function timeTicks(max: number): number[] {
  const steps = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 168].map((h) => h * HOUR)
  const step = steps.find((s) => max / s <= 4) ?? steps[steps.length - 1]
  const ticks = [0]
  while (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

export interface Summary {
  total: number
  /** Calendar days in the range up to today, for the daily average. */
  days: number
  dailyAverage: number
  sessionCount: number
  longest?: { session: Session; ms: number }
}

/** Headline numbers for a range. Only days that have started count toward the average. */
export function summarize(sessions: Session[], from: number, to: number, now: number): Summary {
  let total = 0
  let longest: Summary['longest']
  let sessionCount = 0
  for (const session of sessions) {
    const part = clipSession(session, from, to, now)
    if (!part) continue
    sessionCount++
    total += part.end - part.start
    const full = (session.end ?? Math.max(now, session.start)) - session.start
    if (!longest || full > longest.ms) longest = { session, ms: full }
  }
  const days = Math.max(1, daysBetween(from, Math.min(to, endOfDay(now))))
  return { total, days, dailyAverage: total / days, sessionCount, longest }
}

/** How dark a heatmap day is: 0 for nothing tracked, then 1–4 by hours tracked. */
export function heatLevel(ms: number): 0 | 1 | 2 | 3 | 4 {
  if (ms <= 0) return 0
  if (ms <= 2 * HOUR) return 1
  if (ms <= 4 * HOUR) return 2
  if (ms <= 6 * HOUR) return 3
  return 4
}

export const HEAT_LEVEL_LABELS = ['None', 'Up to 2h', '2–4h', '4–6h', 'Over 6h'] as const
