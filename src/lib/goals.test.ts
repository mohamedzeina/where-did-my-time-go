import { describe, expect, it } from 'vitest'
import type { Activity, Goal, Session } from '../db/types'
import { formatAmount, formatGoal, goalPeriod, goalProgress, goalRecord } from './goals'

const HOUR = 3_600_000
// 2026-09-11 is a Friday; its week starts Monday the 7th.
const at = (d: number, h = 0, m = 0) => new Date(2026, 8, d, h, m).getTime()
const session = (activityId: string, start: number, end: number | null): Session => ({
  id: `${activityId}-${start}`,
  activityId,
  start,
  end,
  note: '',
  tags: [],
})
const withGoal = (goal: Goal): Activity & { goal: Goal } => ({
  id: 'work',
  name: 'Deep work',
  color: '#111',
  archived: false,
  createdAt: 0,
  goal,
})

describe('goalPeriod', () => {
  it('is today for a daily goal and Monday to Monday for a weekly one', () => {
    expect(goalPeriod({ period: 'day', ms: HOUR }, at(11, 15))).toEqual({
      from: at(11),
      to: at(12),
    })
    expect(goalPeriod({ period: 'week', ms: HOUR }, at(11, 15))).toEqual({
      from: at(7),
      to: at(14),
    })
  })
})

describe('goalProgress', () => {
  it('counts this period only, running time included, for this activity only', () => {
    const sessions = [
      session('work', at(10, 9), at(10, 12)), // yesterday: not today, but this week
      session('work', at(11, 9), at(11, 10)),
      session('gym', at(11, 10), at(11, 11)),
      session('work', at(11, 14), null),
    ]
    const now = at(11, 15)

    expect(goalProgress(withGoal({ period: 'day', ms: 4 * HOUR }), sessions, now)).toEqual({
      done: 2 * HOUR,
      target: 4 * HOUR,
      fraction: 0.5,
      met: false,
    })
    expect(goalProgress(withGoal({ period: 'week', ms: 4 * HOUR }), sessions, now)).toMatchObject({
      done: 5 * HOUR,
      fraction: 1,
      met: true,
    })
  })
})

describe('formatting', () => {
  it('says amounts the way people do', () => {
    expect(formatAmount(4 * HOUR)).toBe('4h')
    expect(formatAmount(1.5 * HOUR)).toBe('1h 30m')
    expect(formatAmount(45 * 60_000)).toBe('45m')
    expect(formatGoal({ period: 'week', ms: 3 * HOUR })).toBe('3h a week')
  })
})

describe('goalRecord', () => {
  it('marks each day met or missed, without counting an unfinished today as a miss', () => {
    const sessions = [
      session('work', at(8, 9), at(8, 12)), // 3h: met
      session('work', at(9, 9), at(9, 10)), // 1h: missed
      session('work', at(11, 9), at(11, 10)), // today, 1h so far
    ]
    const record = goalRecord(
      withGoal({ period: 'day', ms: 2 * HOUR }),
      sessions,
      at(8),
      at(12),
      at(11, 12),
    )

    expect(record.periods.map((p) => [p.start, p.met, p.current])).toEqual([
      [at(8), true, false],
      [at(9), false, false],
      [at(10), false, false],
      [at(11), false, true],
    ])
    expect(record).toMatchObject({ metCount: 1, countable: 3 })
  })

  it('judges whole weeks, even when the range starts mid-week', () => {
    const sessions = [session('work', at(7, 9), at(7, 12))] // Monday: 3h
    const record = goalRecord(
      withGoal({ period: 'week', ms: 2 * HOUR }),
      sessions,
      at(10),
      at(12),
      at(11, 12),
    )

    expect(record.periods).toEqual([{ start: at(7), done: 3 * HOUR, met: true, current: true }])
    expect(record).toMatchObject({ metCount: 1, countable: 1 })
  })
})
