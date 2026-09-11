import type { Session } from '../db/types'
import { addDays, endOfDay, startOfDay } from './totals'

export const RANGE_PRESETS = [
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'this-month', label: 'This month' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom dates' },
] as const

export type RangePreset = (typeof RANGE_PRESETS)[number]['id']

export interface DateRange {
  /** Local midnight at the start of the first day, epoch ms. */
  from: number
  /** Local midnight after the last day, epoch ms (exclusive). */
  to: number
}

/** The days a preset covers, ending today. `custom` uses the given `YYYY-MM-DD` dates. */
export function resolveRange(
  preset: RangePreset,
  now: number,
  custom?: { from: string; to: string },
): DateRange {
  const to = endOfDay(now)
  switch (preset) {
    case 'week':
      return { from: addDays(startOfDay(now), -6), to }
    case 'month':
      return { from: addDays(startOfDay(now), -29), to }
    case 'this-month': {
      const d = new Date(now)
      return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to }
    }
    case 'all':
      return { from: 0, to }
    case 'custom': {
      const from = custom?.from ? fromDateInput(custom.from) : startOfDay(now)
      const last = custom?.to ? fromDateInput(custom.to) : startOfDay(now)
      return { from: Math.min(from, last), to: endOfDay(Math.max(from, last)) }
    }
  }
}

export interface DayGroup {
  /** Local midnight of the day. */
  day: number
  /** Newest first. */
  sessions: Session[]
  /** Sum of the listed sessions' full durations (running ones count up to `now`). */
  total: number
}

/**
 * The first `limit` sessions across day groups, keeping each day's full total so a partly
 * shown day still reports all of its time. Groups come in, trimmed groups come out.
 */
export function takeSessions(groups: DayGroup[], limit: number): DayGroup[] {
  const shown: DayGroup[] = []
  let left = limit
  for (const group of groups) {
    if (left <= 0) break
    shown.push({ ...group, sessions: group.sessions.slice(0, left) })
    left -= group.sessions.length
  }
  return shown
}

/** Groups sessions by the day they started, newest day and newest session first. */
export function groupByDay(sessions: Session[], now: number): DayGroup[] {
  const groups = new Map<number, DayGroup>()
  for (const session of [...sessions].sort((a, b) => b.start - a.start)) {
    const day = startOfDay(session.start)
    const group = groups.get(day) ?? { day, sessions: [], total: 0 }
    group.sessions.push(session)
    group.total += (session.end ?? Math.max(now, session.start)) - session.start
    groups.set(day, group)
  }
  return [...groups.values()]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Epoch ms to the `YYYY-MM-DD` value of an `<input type="date">`, in local time. */
export function toDateInput(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Epoch ms to the `HH:MM:SS` value of an `<input type="time" step="1">`, in local time. */
export function toTimeInput(t: number): string {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Local midnight of a `YYYY-MM-DD` date. */
export function fromDateInput(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** A local date plus an `HH:MM` or `HH:MM:SS` time, as epoch ms. */
export function fromDateTimeInputs(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss = 0] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, ss).getTime()
}

/**
 * Start and end from a date and two clock times. An end before the start is read as the
 * next day, so 23:30 – 00:15 is a 45-minute session across midnight. An end equal to the
 * start stays put (a zero-length session, which saving rejects).
 */
export function sessionTimesFromInputs(
  date: string,
  startTime: string,
  endTime: string,
): { start: number; end: number; crossesMidnight: boolean } {
  const start = fromDateTimeInputs(date, startTime)
  let end = fromDateTimeInputs(date, endTime)
  const crossesMidnight = end < start
  if (crossesMidnight) {
    const next = new Date(end)
    next.setDate(next.getDate() + 1)
    end = next.getTime()
  }
  return { start, end, crossesMidnight }
}

/** "Today", "Yesterday", or a short date such as "Thu, 10 Sep" in the viewer's locale. */
export function formatDayLabel(day: number, now: number): string {
  const today = startOfDay(now)
  if (day === today) return 'Today'
  if (day === addDays(today, -1)) return 'Yesterday'
  const sameYear = new Date(day).getFullYear() === new Date(now).getFullYear()
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  }).format(day)
}
