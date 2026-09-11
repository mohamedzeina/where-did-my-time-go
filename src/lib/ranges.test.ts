import { describe, expect, it } from 'vitest'
import type { Session } from '../db/types'
import {
  formatDayLabel,
  fromDateInput,
  groupByDay,
  resolveRange,
  sessionTimesFromInputs,
  toDateInput,
  toTimeInput,
} from './ranges'

const at = (d: number, h = 0, m = 0) => new Date(2026, 8, d, h, m).getTime()
const session = (id: string, start: number, end: number | null): Session => ({
  id,
  activityId: 'a',
  start,
  end,
  note: '',
})

describe('resolveRange', () => {
  const now = at(11, 15)

  it('covers the last 7 and 30 days including today', () => {
    expect(resolveRange('week', now)).toEqual({ from: at(5), to: at(12) })
    expect(resolveRange('month', now)).toEqual({
      from: new Date(2026, 7, 13).getTime(),
      to: at(12),
    })
  })

  it('covers this calendar month and all time', () => {
    expect(resolveRange('this-month', now)).toEqual({ from: at(1), to: at(12) })
    expect(resolveRange('all', now)).toEqual({ from: 0, to: at(12) })
  })

  it('uses custom dates inclusively, in either order', () => {
    expect(resolveRange('custom', now, { from: '2026-09-03', to: '2026-09-04' })).toEqual({
      from: at(3),
      to: at(5),
    })
    expect(resolveRange('custom', now, { from: '2026-09-04', to: '2026-09-03' })).toEqual({
      from: at(3),
      to: at(5),
    })
  })
})

describe('groupByDay', () => {
  it('groups by start day, newest first, with totals', () => {
    const groups = groupByDay(
      [
        session('a', at(9, 8), at(9, 9)),
        session('b', at(10, 9), at(10, 11)),
        session('c', at(10, 14), at(10, 14, 30)),
        session('d', at(11, 8), null),
      ],
      at(11, 8, 15),
    )

    expect(groups.map((g) => [g.day, g.sessions.map((s) => s.id), g.total])).toEqual([
      [at(11), ['d'], 15 * 60_000],
      [at(10), ['c', 'b'], 150 * 60_000],
      [at(9), ['a'], 60 * 60_000],
    ])
  })
})

describe('input conversions', () => {
  it('round-trips dates and times in local time', () => {
    const t = at(3, 7, 5)
    expect(toDateInput(t)).toBe('2026-09-03')
    expect(toTimeInput(t)).toBe('07:05')
    expect(fromDateInput('2026-09-03')).toBe(at(3))
  })

  it('reads an end before the start as the next day', () => {
    expect(sessionTimesFromInputs('2026-09-03', '09:00', '10:30')).toEqual({
      start: at(3, 9),
      end: at(3, 10, 30),
      crossesMidnight: false,
    })
    expect(sessionTimesFromInputs('2026-09-03', '23:30', '00:15')).toEqual({
      start: at(3, 23, 30),
      end: at(4, 0, 15),
      crossesMidnight: true,
    })
  })
})

describe('formatDayLabel', () => {
  it('names today and yesterday', () => {
    expect(formatDayLabel(at(11), at(11, 15))).toBe('Today')
    expect(formatDayLabel(at(10), at(11, 15))).toBe('Yesterday')
    expect(formatDayLabel(at(3), at(11, 15))).toMatch(/3/)
  })
})
