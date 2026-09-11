import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity } from '../../db/activities'
import { db } from '../../db/db'
import { addSession, startSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { startOfDay } from '../../lib/totals'
import { TimerView } from '../timer/TimerView'
import { TodayPanel } from './TodayPanel'

const MIN = 60_000
let gym: Activity
let reading: Activity
let midnight: number

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
  reading = await createActivity({ name: 'Reading', color: ACTIVITY_COLORS[1].hex })
  midnight = startOfDay(Date.now())
})

describe('TodayPanel', () => {
  it('invites you to start when nothing is tracked', async () => {
    render(<TodayPanel />)
    expect(await screen.findByText(/nothing tracked yet today/i)).toBeInTheDocument()
  })

  it('totals time per activity, largest first, and lists sessions newest first', async () => {
    // Kept within the first minutes after midnight so the test holds at any time of day.
    await addSession({ activityId: gym.id, start: midnight, end: midnight + 2 * MIN })
    await addSession({ activityId: reading.id, start: midnight + 3 * MIN, end: midnight + 8 * MIN })
    await addSession({ activityId: gym.id, start: midnight + 9 * MIN, end: midnight + 10 * MIN })
    render(<TodayPanel />)

    const totals = within(await screen.findByRole('list', { name: 'Time per activity today' }))
    expect(totals.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Reading5m',
      'Gym3m',
    ])

    const log = within(screen.getByRole('list', { name: "Today's sessions, newest first" }))
    expect(log.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '00:09 – 00:10Gym1m',
      '00:03 – 00:08Reading5m',
      '00:00 – 00:02Gym2m',
    ])
  })

  it('only counts the part of a session after midnight', async () => {
    await addSession({ activityId: gym.id, start: midnight - 30 * MIN, end: midnight + 4 * MIN })
    render(<TodayPanel />)

    const totals = within(await screen.findByRole('list', { name: 'Time per activity today' }))
    expect(totals.getByRole('listitem')).toHaveTextContent('Gym4m')
    expect(screen.getByText(/^yesterday 23:30 – 00:04$/)).toBeInTheDocument()
  })

  it('shows a timer as soon as it is stopped', async () => {
    await startSession(gym.id, Date.now() - 2 * MIN)
    const user = userEvent.setup()
    render(<TimerView />)

    const log = await screen.findByRole('list', { name: "Today's sessions, newest first" })
    expect(within(log).getByText(/– now$/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(await within(log).findByText(/^(yesterday )?\d\d:\d\d – \d\d:\d\d$/)).toBeInTheDocument()
    expect(within(log).getByText(/^2m$/)).toBeInTheDocument()
  })

  it('tells short sessions apart by their seconds', async () => {
    await addSession({ activityId: gym.id, start: midnight, end: midnight + 48_000 })
    await addSession({ activityId: reading.id, start: midnight + MIN, end: midnight + MIN + 7_000 })
    render(<TodayPanel />)

    const totals = within(await screen.findByRole('list', { name: 'Time per activity today' }))
    expect(totals.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Gym48s',
      'Reading7s',
    ])
    expect(screen.getByText('55s')).toBeInTheDocument()
  })

  it('counts a running timer in the totals', async () => {
    await startSession(reading.id, Date.now() - 5 * MIN)
    render(<TodayPanel />)

    const totals = within(await screen.findByRole('list', { name: 'Time per activity today' }))
    expect(totals.getByRole('listitem')).toHaveTextContent(/Reading(4|5)m/)
  })
})
