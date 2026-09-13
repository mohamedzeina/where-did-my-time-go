import { describe, expect, it } from 'vitest'
import type { Session } from '../db/types'
import { bucketize, bucketUnitFor, heatLevel, startOfWeek, summarize, timeTicks } from './insights'

const HOUR = 3_600_000
const at = (d: number, h = 0, m = 0) => new Date(2026, 8, d, h, m).getTime()
const session = (activityId: string, start: number, end: number | null): Session => ({
  id: `${activityId}-${start}`,
  activityId,
  start,
  end,
  note: '',
  tags: [],
})

describe('startOfWeek', () => {
  it('goes back to Monday', () => {
    // 2026-09-11 is a Friday; that week's Monday is the 7th.
    expect(startOfWeek(at(11, 15))).toBe(at(7))
    expect(startOfWeek(at(7, 1))).toBe(at(7))
    expect(startOfWeek(at(13, 23))).toBe(at(7))
  })
})

describe('bucketUnitFor', () => {
  it('uses days up to 45 days, weeks beyond', () => {
    expect(bucketUnitFor(at(1), at(11))).toBe('day')
    expect(bucketUnitFor(new Date(2026, 6, 1).getTime(), at(11))).toBe('week')
  })
})

describe('bucketize', () => {
  it('splits time per day and activity, clipping across midnight', () => {
    const sessions = [
      session('gym', at(9, 7), at(9, 8)),
      session('work', at(9, 23), at(10, 1)),
      session('work', at(10, 9), null),
    ]
    const buckets = bucketize(sessions, at(9), at(12), at(10, 10), 'day')

    expect(buckets.map((b) => [b.start, b.total])).toEqual([
      [at(9), 2 * HOUR],
      [at(10), 2 * HOUR],
      [at(11), 0],
    ])
    expect(Object.fromEntries(buckets[0].byActivity)).toEqual({ gym: HOUR, work: HOUR })
    expect(Object.fromEntries(buckets[1].byActivity)).toEqual({ work: 2 * HOUR })
  })

  it('groups into Monday weeks, clamped to the range', () => {
    const buckets = bucketize([session('a', at(8, 9), at(8, 10))], at(9), at(21), at(20), 'week')
    expect(buckets.map((b) => [b.start, b.end])).toEqual([
      [at(9), at(14)],
      [at(14), at(21)],
    ])
    expect(buckets[0].total).toBe(0)
  })
})

describe('timeTicks', () => {
  it('picks round steps covering the maximum', () => {
    expect(timeTicks(3.5 * HOUR)).toEqual([0, 1, 2, 3, 4].map((h) => h * HOUR))
    expect(timeTicks(7 * HOUR)).toEqual([0, 2, 4, 6, 8].map((h) => h * HOUR))
    expect(timeTicks(40 * 60_000)).toEqual([0, 15, 30, 45].map((m) => m * 60_000))
  })
})

describe('summarize', () => {
  it('totals, averages over started days, and finds the longest session', () => {
    const long = session('work', at(9, 9), at(9, 12))
    const summary = summarize(
      [session('gym', at(9, 7), at(9, 8)), long, session('gym', at(10, 7), at(10, 8))],
      at(9),
      at(16),
      at(10, 20),
    )
    expect(summary).toMatchObject({ total: 5 * HOUR, days: 2, sessionCount: 3 })
    expect(summary.dailyAverage).toBe(2.5 * HOUR)
    expect(summary.longest).toEqual({ session: long, ms: 3 * HOUR })
  })
})

describe('heatLevel', () => {
  it('steps by hours tracked', () => {
    expect([0, HOUR, 3 * HOUR, 5 * HOUR, 9 * HOUR].map(heatLevel)).toEqual([0, 1, 2, 3, 4])
  })
})
