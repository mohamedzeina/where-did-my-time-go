import type { Session } from '../db/types'

/** Local midnight at the start of the day containing `t` (epoch ms). */
export function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Local midnight at the end of the day containing `t`. Handles 23- and 25-hour DST days. */
export function endOfDay(t: number): number {
  const d = new Date(startOfDay(t))
  d.setDate(d.getDate() + 1)
  return d.getTime()
}

/**
 * The part of `session` inside `[from, to)`, or `null` if it falls outside. A running session
 * counts up to `now`.
 */
export function clipSession(
  session: Session,
  from: number,
  to: number,
  now: number,
): { start: number; end: number } | null {
  const start = Math.max(session.start, from)
  const end = Math.min(session.end ?? Math.max(now, session.start), to)
  return end > start ? { start, end } : null
}

export interface ActivityTotal {
  activityId: string
  ms: number
}

/** Time per activity inside `[from, to)`, largest first. */
export function totalsByActivity(
  sessions: Session[],
  from: number,
  to: number,
  now: number,
): ActivityTotal[] {
  const totals = new Map<string, number>()
  for (const session of sessions) {
    const part = clipSession(session, from, to, now)
    if (part)
      totals.set(session.activityId, (totals.get(session.activityId) ?? 0) + part.end - part.start)
  }
  return [...totals].map(([activityId, ms]) => ({ activityId, ms })).sort((a, b) => b.ms - a.ms)
}

/** A total as hours and minutes, e.g. `2h 05m`, `45m`, or `<1m` for a few seconds. */
export function formatHoursMinutes(ms: number): string {
  if (ms > 0 && ms < 60_000) return '<1m'
  const minutes = Math.floor(Math.max(0, ms) / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
