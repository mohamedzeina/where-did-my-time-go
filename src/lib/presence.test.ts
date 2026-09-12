import { describe, expect, it } from 'vitest'
import { AWAY_MS, unwatchedGap } from './presence'

const START = 1_000_000

describe('unwatchedGap', () => {
  it('finds nothing when the app was stamping the clock all along', () => {
    expect(unwatchedGap(START + 60_000, START + 70_000, START)).toBeUndefined()
  })

  it('finds nothing without a stamp to compare against', () => {
    expect(unwatchedGap(undefined, START + AWAY_MS * 10, START)).toBeUndefined()
  })

  it('ignores a hole shorter than the threshold', () => {
    expect(unwatchedGap(START, START + AWAY_MS - 1, START)).toBeUndefined()
  })

  it('reports the hole between the last stamp and now', () => {
    const now = START + 60_000 + AWAY_MS
    expect(unwatchedGap(START + 60_000, now, START)).toEqual({ from: START + 60_000, to: now })
  })

  it('never reaches back before the session it belongs to', () => {
    const now = START + AWAY_MS
    expect(unwatchedGap(START - 3_600_000, now, START)).toEqual({ from: START, to: now })
  })

  it('treats a stamp from the future as no time to account for', () => {
    expect(unwatchedGap(START + 3_600_000, START + AWAY_MS, START)).toBeUndefined()
  })

  it('takes its own threshold', () => {
    expect(unwatchedGap(START, START + 30_000, START, 20_000)).toEqual({
      from: START,
      to: START + 30_000,
    })
  })
})
