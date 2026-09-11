import type { Activity, Session } from '../db/types'
import { toDateInput, toTimeInput } from './ranges'

/**
 * One CSV field. Quotes it when needed, and defuses text that a spreadsheet would run as a
 * formula (a note starting with `=` becomes `'=`).
 */
export function csvField(value: string | number): string {
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const SESSION_CSV_HEADER = [
  'date',
  'start',
  'end',
  'duration_minutes',
  'activity',
  'note',
] as const

/**
 * Sessions as CSV, oldest first, in local time. A running session has an empty end and
 * counts up to `now`. Starts with a byte-order mark so Excel reads it as UTF-8.
 */
export function sessionsToCsv(
  sessions: Session[],
  activities: Map<string, Activity>,
  now = Date.now(),
): string {
  const rows = [...sessions]
    .sort((a, b) => a.start - b.start)
    .map((s) =>
      [
        toDateInput(s.start),
        toTimeInput(s.start),
        s.end === null ? '' : toTimeInput(s.end),
        (((s.end ?? now) - s.start) / 60_000).toFixed(2),
        activities.get(s.activityId)?.name ?? 'Deleted activity',
        s.note,
      ]
        .map(csvField)
        .join(','),
    )
  return '﻿' + [SESSION_CSV_HEADER.join(','), ...rows].join('\r\n') + '\r\n'
}
