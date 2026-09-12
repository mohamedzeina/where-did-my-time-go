import { beforeEach, describe, expect, it } from 'vitest'
import { nextReminderAt, reminderEvery, setReminderEvery } from './reminders'

const HOUR = 3_600_000
const START = 1_000_000

describe('nextReminderAt', () => {
  it('is off when there is no interval', () => {
    expect(nextReminderAt(START, 0, START + 10 * HOUR)).toBeUndefined()
  })

  it('lands on the first whole interval of the session', () => {
    expect(nextReminderAt(START, 2 * HOUR, START)).toBe(START + 2 * HOUR)
    expect(nextReminderAt(START, 2 * HOUR, START + HOUR)).toBe(START + 2 * HOUR)
  })

  it('moves on to the next interval once one has passed', () => {
    expect(nextReminderAt(START, 2 * HOUR, START + 2 * HOUR + 1)).toBe(START + 4 * HOUR)
    expect(nextReminderAt(START, 2 * HOUR, START + 7 * HOUR)).toBe(START + 8 * HOUR)
  })

  it('does not repeat one just delivered', () => {
    expect(nextReminderAt(START, HOUR, START + HOUR)).toBe(START + 2 * HOUR)
  })

  // Reloading mid-session must not restart the count, or a restless morning would never
  // reach a reminder at all.
  it('keeps the same schedule whenever it is asked', () => {
    const due = nextReminderAt(START, 2 * HOUR, START + 90 * 60_000)
    expect(nextReminderAt(START, 2 * HOUR, START + 119 * 60_000)).toBe(due)
  })

  it('copes with a clock that moved behind the session start', () => {
    expect(nextReminderAt(START, HOUR, START - 5 * HOUR)).toBe(START + HOUR)
  })
})

describe('the reminder interval', () => {
  beforeEach(() => localStorage.clear())

  it('is off until one is chosen', () => {
    expect(reminderEvery()).toBe(0)
  })

  it('remembers a choice', () => {
    setReminderEvery(2 * HOUR)
    expect(reminderEvery()).toBe(2 * HOUR)
  })

  it('ignores a stored value that is not one of the choices', () => {
    localStorage.setItem('wdmtg:remind-every', '37')
    expect(reminderEvery()).toBe(0)
  })
})
