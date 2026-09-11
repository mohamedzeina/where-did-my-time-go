import { describe, expect, it } from 'vitest'
import type { Session } from '../db/types'
import { clipSession, endOfDay, formatHoursMinutes, startOfDay, totalsByActivity } from './totals'

const at = (h: number, m = 0) => new Date(2026, 8, 11, h, m).getTime()
const session = (activityId: string, start: number, end: number | null): Session => ({
  id: `${activityId}-${start}`,
  activityId,
  start,
  end,
  note: '',
})

describe('startOfDay / endOfDay', () => {
  it('bracket the local calendar day', () => {
    expect(startOfDay(at(15, 30))).toBe(at(0))
    expect(endOfDay(at(15, 30))).toBe(new Date(2026, 8, 12).getTime())
  })
})

describe('clipSession', () => {
  it('keeps a session that sits inside the range', () => {
    expect(clipSession(session('a', at(9), at(10)), at(0), at(24), at(12))).toEqual({
      start: at(9),
      end: at(10),
    })
  })

  it('trims a session that crosses midnight', () => {
    const lateNight = session('a', at(0) - 3_600_000, at(1))
    expect(clipSession(lateNight, at(0), at(24), at(12))).toEqual({ start: at(0), end: at(1) })
  })

  it('counts a running session up to now', () => {
    expect(clipSession(session('a', at(9), null), at(0), at(24), at(9, 30))).toEqual({
      start: at(9),
      end: at(9, 30),
    })
  })

  it('returns null outside the range', () => {
    expect(clipSession(session('a', at(9), at(10)), at(11), at(12), at(12))).toBeNull()
  })
})

describe('totalsByActivity', () => {
  it('sums per activity, largest first, clipped to the range', () => {
    const sessions = [
      session('gym', at(7), at(8)),
      session('work', at(9), at(11)),
      session('gym', at(18), at(18, 30)),
      session('work', at(23), null),
    ]
    expect(totalsByActivity(sessions, at(0), at(12), at(23, 30))).toEqual([
      { activityId: 'work', ms: 2 * 3_600_000 },
      { activityId: 'gym', ms: 3_600_000 },
    ])
  })
})

describe('formatHoursMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatHoursMinutes(0)).toBe('0m')
    expect(formatHoursMinutes(30_000)).toBe('<1m')
    expect(formatHoursMinutes(45 * 60_000)).toBe('45m')
    expect(formatHoursMinutes(125 * 60_000 + 59_000)).toBe('2h 05m')
  })
})
