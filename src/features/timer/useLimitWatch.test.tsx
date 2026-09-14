import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createActivity, updateActivity } from '../../db/activities'
import { db } from '../../db/db'
import { addSession, startSession, stopSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { deliverLimitReached } from './limit'
import { useLimitWatch } from './useLimitWatch'
import { useRunningTimer } from './useRunningTimer'

vi.mock('./limit', () => ({ deliverLimitReached: vi.fn() }))
const delivered = vi.mocked(deliverLimitReached)

const MIN = 60_000
const HOUR = 60 * MIN
const LIMIT = { kind: 'limit', period: 'day', ms: HOUR } as const

/** Nothing but the hook, reporting what's running so a test can wait for the database. */
function Harness() {
  const running = useRunningTimer()
  useLimitWatch()
  return <span>{running === undefined ? 'loading' : (running?.activity.name ?? 'idle')}</span>
}

/**
 * The harness only shows that the timer loaded; the hook runs its own query for the day's
 * sessions. Give that a moment of real time to land before the clock jumps ahead, or the
 * hook's first look already finds the limit passed and, rightly, stays quiet.
 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 100))

let gym: Activity

beforeEach(async () => {
  delivered.mockClear()
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: '#111' }, 1)
  await updateActivity(gym.id, { goal: LIMIT })
  // Only the hook's own timers are faked; IndexedDB needs real microtasks and setImmediate.
  // Noon, so nothing a test does runs into midnight, when a daily limit starts over.
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(new Date(2026, 8, 14, 12, 0))
})

afterEach(() => vi.useRealTimers())

describe('useLimitWatch', () => {
  it('speaks up once when the running timer reaches the limit', async () => {
    // 40 minutes already today, so the limit falls 20 minutes into the timer.
    await addSession({
      activityId: gym.id,
      start: Date.now() - 2 * HOUR,
      end: Date.now() - 80 * MIN,
    })
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')
    await settle()

    await vi.advanceTimersByTimeAsync(19 * MIN)
    expect(delivered).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2 * MIN)
    await waitFor(() => expect(delivered).toHaveBeenCalledTimes(1))
    expect(delivered).toHaveBeenLastCalledWith('Gym', LIMIT)

    await vi.advanceTimersByTimeAsync(2 * HOUR)
    expect(delivered).toHaveBeenCalledTimes(1)
  })

  it('stays quiet about a limit already reached before the timer started', async () => {
    await addSession({ activityId: gym.id, start: Date.now() - 3 * HOUR, end: Date.now() - HOUR })
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')
    await settle()

    await vi.advanceTimersByTimeAsync(3 * HOUR)
    expect(delivered).not.toHaveBeenCalled()
  })

  it('says nothing about a goal that is a target', async () => {
    await updateActivity(gym.id, { goal: { period: 'day', ms: HOUR } })
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')
    await settle()

    await vi.advanceTimersByTimeAsync(2 * HOUR)
    expect(delivered).not.toHaveBeenCalled()
  })

  it('says nothing once the timer has stopped', async () => {
    await startSession(gym.id, Date.now())
    render(<Harness />)
    await screen.findByText('Gym')
    await settle()

    await stopSession(Date.now() + 10 * MIN)
    await screen.findByText('idle')
    await vi.advanceTimersByTimeAsync(3 * HOUR)
    expect(delivered).not.toHaveBeenCalled()
  })
})
