import { describe, expect, it } from 'vitest'
import type { Activity } from '../../db/types'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { MAX_SERIES, seriesFor } from './series'

const activities = new Map<string, Activity>(
  Array.from({ length: 10 }, (_, i) => [
    `a${i}`,
    {
      id: `a${i}`,
      name: `Activity ${i}`,
      color: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length].hex,
      archived: false,
      createdAt: i,
    },
  ]),
)
const totals = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ activityId: `a${i}`, ms: (n - i) * 1000 }))

describe('seriesFor', () => {
  it('keeps each activity as its own layer, in its own color, up to eight', () => {
    const series = seriesFor(totals(8), activities)
    expect(series).toHaveLength(MAX_SERIES)
    expect(series[2]).toEqual({
      id: 'a2',
      name: 'Activity 2',
      color: ACTIVITY_COLORS[2].hex,
      activityIds: ['a2'],
    })
  })

  it('folds everything past the seventh into "Other"', () => {
    const series = seriesFor(totals(10), activities)
    expect(series).toHaveLength(MAX_SERIES)
    expect(series[7]).toMatchObject({
      id: 'other',
      name: 'Other (3)',
      activityIds: ['a7', 'a8', 'a9'],
    })
  })
})
