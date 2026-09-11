import { describe, expect, it } from 'vitest'
import { dayOfYear, dayProgress, daysInYear, formatClock, formatUtcOffset } from './day'

describe('dayProgress', () => {
  it('is 0 at midnight and 0.5 at noon', () => {
    expect(dayProgress(new Date(2026, 8, 11, 0, 0))).toBe(0)
    expect(dayProgress(new Date(2026, 8, 11, 12, 0))).toBe(0.5)
  })

  it('approaches 1 just before midnight', () => {
    expect(dayProgress(new Date(2026, 8, 11, 23, 59, 59))).toBeCloseTo(1, 4)
  })
})

describe('formatClock', () => {
  it('pads hours and minutes', () => {
    expect(formatClock(new Date(2026, 8, 11, 7, 5))).toBe('07:05')
    expect(formatClock(new Date(2026, 8, 11, 23, 40))).toBe('23:40')
  })

  it('can include seconds', () => {
    expect(formatClock(new Date(2026, 8, 11, 7, 5, 9), true)).toBe('07:05:09')
  })
})

describe('dayOfYear', () => {
  it('counts from 1 on January 1st', () => {
    expect(dayOfYear(new Date(2026, 0, 1, 23, 0))).toBe(1)
    expect(dayOfYear(new Date(2026, 8, 11))).toBe(254)
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365)
    expect(dayOfYear(new Date(2028, 11, 31))).toBe(366)
  })
})

describe('daysInYear', () => {
  it('knows leap years', () => {
    expect(daysInYear(2026)).toBe(365)
    expect(daysInYear(2028)).toBe(366)
    expect(daysInYear(2100)).toBe(365)
  })
})

describe('formatUtcOffset', () => {
  it('formats the local offset with a sign', () => {
    expect(formatUtcOffset(new Date(2026, 8, 11))).toMatch(/^utc[+-]\d{2}:\d{2}$/)
  })
})
