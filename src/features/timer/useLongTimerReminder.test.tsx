import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createActivity } from '../../db/activities'
import { db } from '../../db/db'
import { startSession, stopSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { setReminderEvery } from '../../lib/reminders'
import { deliverReminder } from './reminder'
import { useLongTimerReminder } from './useLongTimerReminder'
import { useRunningTimer } from './useRunningTimer'

vi.mock('./reminder', () => ({ deliverReminder: vi.fn() }))
const delivered = vi.mocked(deliverReminder)

const HOUR = 3_600_000

/**
 * Nothing but the hook, so advancing hours doesn't drag the clock through 3,600 ticks. It
 * reports what's running so a test can wait for the database before moving time.
 */
function Harness() {
  const running = useRunningTimer()
  useLongTimerReminder()
  return <span>{running === undefined ? 'loading' : (running?.activity.name ?? 'idle')}</span>
}

let gym: Activity

beforeEach(async () => {
  localStorage.clear()
  delivered.mockClear()
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: '#111' }, 1)
  // Only the hook's own timers are faked. IndexedDB drives its transactions off microtasks
  // and setImmediate, and faking those ends every transaction before Dexie can use it.
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'Date'] })
})

afterEach(() => vi.useRealTimers())

describe('useLongTimerReminder', () => {
  it('speaks up once the timer passes the interval, and again each one after', async () => {
    setReminderEvery(HOUR)
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')

    await vi.advanceTimersByTimeAsync(HOUR)
    expect(delivered).toHaveBeenCalledTimes(1)
    expect(delivered).toHaveBeenLastCalledWith('Gym', expect.any(Number))

    await vi.advanceTimersByTimeAsync(HOUR)
    expect(delivered).toHaveBeenCalledTimes(2)
  })

  it('says nothing before the interval is up', async () => {
    setReminderEvery(2 * HOUR)
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')

    await vi.advanceTimersByTimeAsync(2 * HOUR - 1000)
    expect(delivered).not.toHaveBeenCalled()
  })

  it('says nothing while reminders are off', async () => {
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')

    await vi.advanceTimersByTimeAsync(6 * HOUR)
    expect(delivered).not.toHaveBeenCalled()
  })

  it('says nothing when no timer is running', async () => {
    setReminderEvery(HOUR)
    render(<Harness />)
    await screen.findByText('idle')

    await vi.advanceTimersByTimeAsync(6 * HOUR)
    expect(delivered).not.toHaveBeenCalled()
  })

  it('stops once the timer does', async () => {
    setReminderEvery(HOUR)
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')

    await stopSession(Date.now() + 60_000)
    await screen.findByText('idle')
    // The harness and the hook watch the database separately, so let anything already
    // scheduled fall due before asking whether reminders have actually stopped.
    await vi.advanceTimersByTimeAsync(2 * HOUR)
    delivered.mockClear()

    await vi.advanceTimersByTimeAsync(6 * HOUR)
    expect(delivered).not.toHaveBeenCalled()
  })
})
