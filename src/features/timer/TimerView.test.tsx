import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { createActivity } from '../../db/activities'
import { db } from '../../db/db'
import { getRunningSession, listSessions, startSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { TimerView } from './TimerView'

let gym: Activity
let reading: Activity

beforeEach(async () => {
  window.location.hash = ''
  await Promise.all(db.tables.map((table) => table.clear()))
  // Distinct creation times keep "first activity" stable (Gym), even within one millisecond.
  gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex }, 1)
  reading = await createActivity({ name: 'Reading', color: ACTIVITY_COLORS[1].hex }, 2)
})

describe('TimerView', () => {
  it('starts timing the activity whose tile is pressed', async () => {
    const user = userEvent.setup()
    render(<TimerView />)

    await user.click(await screen.findByRole('button', { name: 'Start Gym' }))

    expect(await screen.findByText('recording')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop Gym' })).toHaveAttribute('aria-pressed', 'true')
    expect((await getRunningSession())?.activityId).toBe(gym.id)
  })

  it('switches to another activity, closing the first session', async () => {
    const user = userEvent.setup()
    render(<TimerView />)

    await user.click(await screen.findByRole('button', { name: 'Start Gym' }))
    await screen.findByRole('button', { name: 'Stop Gym' })
    await user.click(screen.getByRole('button', { name: 'Start Reading' }))

    await screen.findByRole('button', { name: 'Stop Reading' })
    expect(screen.getByRole('button', { name: 'Start Gym' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    const [gymSession] = await listSessions({ from: 0, to: Infinity, activityId: gym.id })
    expect(gymSession.end).not.toBeNull()
    expect((await getRunningSession())?.activityId).toBe(reading.id)
  })

  it('stops from the Stop button', async () => {
    const user = userEvent.setup()
    render(<TimerView />)

    await user.click(await screen.findByRole('button', { name: 'Start Gym' }))
    await user.click(await screen.findByRole('button', { name: 'Stop' }))

    expect(await screen.findByText('idle')).toBeInTheDocument()
    expect(await getRunningSession()).toBeUndefined()
  })

  it('stops when the running tile is pressed again', async () => {
    const user = userEvent.setup()
    render(<TimerView />)

    await user.click(await screen.findByRole('button', { name: 'Start Gym' }))
    await user.click(await screen.findByRole('button', { name: 'Stop Gym' }))

    await screen.findByText('idle')
    expect(await getRunningSession()).toBeUndefined()
  })

  it('picks up a timer that was already running, as after a reload', async () => {
    await startSession(reading.id, Date.now() - 65_000)
    render(<TimerView />)

    // The big clock's readable text (the tile and today's log show the same time).
    expect(
      await screen.findByText(/^01:0[56]$/, { selector: '.clock .visually-hidden' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Reading', { selector: 'strong' })).toBeInTheDocument()
  })
})

describe('Space shortcut', () => {
  it('starts the last activity and stops it again', async () => {
    const user = userEvent.setup()
    render(<App />)
    // The hint names the activity once the database has answered, so wait for the final text.
    await waitFor(() =>
      expect(document.querySelector('.view-lede')).toHaveTextContent('Or press Space for Gym.'),
    )

    await user.keyboard(' ')
    expect(await screen.findByRole('button', { name: 'Stop Gym' })).toBeInTheDocument()

    // Focus is on the body again (not the tile), so Space goes to the timer.
    ;(document.activeElement as HTMLElement | null)?.blur()
    await user.keyboard(' ')
    expect(await screen.findByText('idle')).toBeInTheDocument()
    expect(await getRunningSession()).toBeUndefined()
  })

  it('leaves Space alone while typing', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /new activity/i }))
    await user.keyboard('Board games')

    expect(screen.getByRole('textbox', { name: 'New activity name' })).toHaveValue('Board games')
    expect(await getRunningSession()).toBeUndefined()
  })
})

describe('tab title', () => {
  it('shows the running time and activity', async () => {
    await startSession(gym.id, Date.now() - 3_725_000)
    render(<App />)

    await waitFor(() => expect(document.title).toMatch(/^1:02:0[56] · Gym$/))
  })

  it('goes back to the view name when stopped', async () => {
    const user = userEvent.setup()
    await startSession(gym.id)
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Stop' }))
    await waitFor(() => expect(document.title).toBe('Timer | where did my time go?'))
  })
})
