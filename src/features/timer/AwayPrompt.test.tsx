import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { createActivity } from '../../db/activities'
import { db } from '../../db/db'
import { getRunningSession, listSessions, startSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { AWAY_MS, markSeen } from '../../lib/presence'

let gym: Activity

/** A session that started three hours ago, last watched by the app two hours ago. */
async function sessionAbandonedAt(lastSeen: number) {
  const session = await startSession(gym.id, Date.now() - 3 * 3_600_000)
  markSeen(lastSeen)
  return session
}

const twoHoursAgo = () => Date.now() - 2 * 3_600_000

beforeEach(async () => {
  window.location.hash = ''
  localStorage.clear()
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex }, 1)
})

describe('away detection', () => {
  it('asks about time the app counted while it wasn’t running', async () => {
    await sessionAbandonedAt(twoHoursAgo())
    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/unaccounted/)
    expect(alert).toHaveTextContent(/Gym kept counting/)
    expect(alert).toHaveTextContent(/the app wasn’t running/)
  })

  it('stays quiet when the app was watching all along', async () => {
    await sessionAbandonedAt(Date.now() - 1000)
    render(<App />)

    await screen.findByText('recording')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stays quiet over a gap too short to be an absence', async () => {
    await sessionAbandonedAt(Date.now() - (AWAY_MS - 30_000))
    render(<App />)

    await screen.findByText('recording')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stays quiet when nothing is running', async () => {
    markSeen(twoHoursAgo())
    render(<App />)

    await screen.findByText('idle')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('trims the away time out and keeps timing the same activity', async () => {
    const left = twoHoursAgo()
    const abandoned = await sessionAbandonedAt(left)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Trim it out' }))

    await waitFor(async () => expect((await getRunningSession())?.id).not.toBe(abandoned.id))
    const sessions = await listSessions({ from: 0, to: Infinity })
    expect(sessions).toHaveLength(2)
    expect(sessions[0]).toEqual({ ...abandoned, end: left })
    expect(sessions[1].activityId).toBe(gym.id)
    expect(sessions[1].start).toBeGreaterThanOrEqual(left)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stops the session where you left, leaving nothing running', async () => {
    const left = twoHoursAgo()
    const abandoned = await sessionAbandonedAt(left)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /^Stop at / }))

    await waitFor(async () => expect(await getRunningSession()).toBeUndefined())
    expect(await listSessions({ from: 0, to: Infinity })).toEqual([{ ...abandoned, end: left }])
  })

  it('keeps the time as tracked and dismisses the question', async () => {
    const abandoned = await sessionAbandonedAt(twoHoursAgo())
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Keep it' }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(await getRunningSession()).toEqual(abandoned)
  })

  it('offers to discard when the timer had barely started before the gap', async () => {
    // Started, then left within the 10 s minimum: there's nothing in front of the gap to keep.
    const start = Date.now() - 2 * 3_600_000
    await startSession(gym.id, start)
    markSeen(start + 5_000)
    const user = userEvent.setup()
    render(<App />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/discards the session/)
    expect(screen.queryByRole('button', { name: /^Stop at / })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Discard it' }))

    await waitFor(async () => expect(await listSessions({ from: 0, to: Infinity })).toEqual([]))
  })

  it('takes Space out of play while the question is up, so it can’t stop the timer', async () => {
    const abandoned = await sessionAbandonedAt(twoHoursAgo())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('alert')

    await user.keyboard(' ')

    expect(await getRunningSession()).toEqual(abandoned)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
