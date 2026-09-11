import type { Session } from '../db/types'

/** Local midnight at the start of the day containing `t` (epoch ms). */
export function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Local midnight at the end of the day containing `t`. Handles 23- and 25-hour DST days. */
export function endOfDay(t: number): number {
  return addDays(startOfDay(t), 1)
}

/** Shifts a local time by whole calendar days, staying on the same wall-clock time across DST. */
export function addDays(t: number, days: number): number {
  const d = new Date(t)
  d.setDate(d.getDate() + days)
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

/** Time per activity inside `[from, to)`, largest (as displayed) first. */
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
  // Sorted by the value shown, not exact ms, so rows with equal labels don't trade places as
  // a running timer ticks; the sort is stable, so ties stay in order of first tracked.
  return [...totals]
    .map(([activityId, ms]) => ({ activityId, ms }))
    .sort((a, b) => shownMs(b.ms) - shownMs(a.ms))
}

/**
 * `ms` rounded down to what {@link formatHoursMinutes} shows: whole seconds under a minute,
 * whole minutes above. Size bars from this so a bar only moves when its label changes.
 */
export function shownMs(ms: number): number {
  const unit = ms < 60_000 ? 1_000 : 60_000
  return Math.floor(Math.max(0, ms) / unit) * unit
}

/** Bar lengths for totals, each as a fraction of the largest, matching their labels. */
export function barShares(totals: ActivityTotal[]): number[] {
  const shown = totals.map((t) => shownMs(t.ms))
  const longest = Math.max(...shown, 0)
  return shown.map((ms) => (longest > 0 ? ms / longest : 0))
}

/**
 * A total as hours and minutes, e.g. `2h 05m` or `45m`. Under a minute it counts seconds
 * (`48s`), so short sessions of different lengths never share one label.
 */
export function formatHoursMinutes(ms: number): string {
  if (ms > 0 && ms < 1_000) return '<1s'
  if (ms > 0 && ms < 60_000) return `${Math.floor(ms / 1_000)}s`
  const minutes = Math.floor(Math.max(0, ms) / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}
