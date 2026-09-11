import { describe, expect, it } from 'vitest'
import { ACTIVITY_COLORS, nextActivityColor } from './palette'

describe('nextActivityColor', () => {
  it('starts with the first color', () => {
    expect(nextActivityColor([])).toBe(ACTIVITY_COLORS[0].hex)
  })

  it('skips colors already in use, ignoring case', () => {
    expect(nextActivityColor([ACTIVITY_COLORS[0].hex.toUpperCase()])).toBe(ACTIVITY_COLORS[1].hex)
    expect(nextActivityColor([ACTIVITY_COLORS[1].hex])).toBe(ACTIVITY_COLORS[0].hex)
  })

  it('wraps around once every color is taken', () => {
    const all = ACTIVITY_COLORS.map((c) => c.hex)
    expect(nextActivityColor(all)).toBe(ACTIVITY_COLORS[0].hex)
    expect(nextActivityColor([...all, all[0]])).toBe(ACTIVITY_COLORS[1].hex)
  })
})
