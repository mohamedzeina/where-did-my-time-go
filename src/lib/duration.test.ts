import { describe, expect, it } from 'vitest'
import { formatDuration } from './duration'

describe('formatDuration', () => {
  it('formats sub-hour durations as MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(65_000)).toBe('01:05')
  })

  it('adds hours when needed', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00')
    expect(formatDuration(37_230_000)).toBe('10:20:30')
  })

  it('drops partial seconds and clamps negatives', () => {
    expect(formatDuration(1_999)).toBe('00:01')
    expect(formatDuration(-5_000)).toBe('00:00')
  })
})
