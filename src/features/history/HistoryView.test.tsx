import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity } from '../../db/activities'
import { db } from '../../db/db'
import { addSession, getRunningSession, listSessions, startSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { toDateInput } from '../../lib/ranges'
import { startOfDay } from '../../lib/totals'
import { HistoryView } from './HistoryView'

const MIN = 60_000
const DAY = 24 * 60 * MIN
let gym: Activity
let reading: Activity
let today: number

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
  reading = await createActivity({ name: 'Reading', color: ACTIVITY_COLORS[1].hex })
  today = startOfDay(Date.now())
})

const allSessions = () => listSessions({ from: 0, to: Infinity })

describe('HistoryView', () => {
  it('groups sessions by day, newest first, with day totals', async () => {
    await addSession({
      activityId: gym.id,
      start: today - DAY + 60 * MIN,
      end: today - DAY + 90 * MIN,
    })
    await addSession({ activityId: reading.id, start: today, end: today + 5 * MIN, note: 'Dune' })
    render(<HistoryView />)

    await screen.findByRole('region', { name: 'Today' })
    const days = screen.getAllByRole('region', { name: /^(Today|Yesterday)$/ })
    expect(days.map((d) => d.getAttribute('aria-label'))).toEqual(['Today', 'Yesterday'])
    expect(within(days[0]).getByText('Dune')).toBeInTheDocument()
    expect(within(days[1]).getByText('30m', { selector: '.history-day-total' })).toBeInTheDocument()
    expect(screen.getByText(/across 2 sessions/)).toBeInTheDocument()
  })

  it('shows the newest 100 sessions, then more on request', async () => {
    // 150 one-minute sessions through yesterday, newest last.
    const yesterday = startOfDay(today - 12 * 60 * MIN)
    for (let i = 0; i < 150; i++) {
      await addSession({
        activityId: gym.id,
        start: yesterday + i * 2 * MIN,
        end: yesterday + i * 2 * MIN + MIN,
      })
    }
    const user = userEvent.setup()
    render(<HistoryView />)

    expect(await screen.findByText('Showing 100 of 150 sessions')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Edit Gym/ })).toHaveLength(100)
    // The day total counts every session, not just the ones on the page.
    expect(screen.getByText('2h 30m', { selector: '.history-day-total' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show 50 more' }))

    expect(await screen.findAllByRole('button', { name: /^Edit Gym/ })).toHaveLength(150)
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it('starts again from the top when the filters change', async () => {
    const yesterday = startOfDay(today - 12 * 60 * MIN)
    for (let i = 0; i < 120; i++) {
      await addSession({
        activityId: gym.id,
        start: yesterday + i * 2 * MIN,
        end: yesterday + i * 2 * MIN + MIN,
      })
    }
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: 'Show 20 more' }))
    expect(await screen.findAllByRole('button', { name: /^Edit Gym/ })).toHaveLength(120)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Range' }), 'Last 30 days')
    expect(await screen.findByText('Showing 100 of 120 sessions')).toBeInTheDocument()
  })

  it('filters by activity', async () => {
    await addSession({ activityId: gym.id, start: today, end: today + MIN })
    await addSession({ activityId: reading.id, start: today + 2 * MIN, end: today + 3 * MIN })
    const user = userEvent.setup()
    render(<HistoryView />)

    await screen.findByText(/across 2 sessions/)
    await user.selectOptions(screen.getByRole('combobox', { name: 'Activity' }), 'Reading')

    expect(await screen.findByText(/across 1 session$/)).toBeInTheDocument()
    expect(screen.queryByText('Gym', { selector: '.session-name' })).not.toBeInTheDocument()
  })

  it('leaves out sessions older than the range', async () => {
    await addSession({ activityId: gym.id, start: today - 20 * DAY, end: today - 20 * DAY + MIN })
    const user = userEvent.setup()
    render(<HistoryView />)

    expect(await screen.findByText(/no sessions in this range/i)).toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Range' }), 'Last 30 days')
    expect(await screen.findByText(/across 1 session$/)).toBeInTheDocument()
  })

  it('fixes a mistaken session', async () => {
    // Yesterday, so the edited end is in the past whatever time the tests run.
    const yesterday = startOfDay(today - 12 * 60 * MIN)
    const session = await addSession({
      activityId: gym.id,
      start: yesterday,
      end: yesterday + 10 * MIN,
    })
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: /^Edit Gym/ }))
    const form = screen.getByRole('form', { name: 'Edit session' })
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Activity' }), 'Reading')
    const end = within(form).getByLabelText(/^End/)
    await user.clear(end)
    await user.type(end, '00:25')
    await user.type(within(form).getByRole('textbox', { name: 'Note' }), 'Was reading')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    await waitFor(async () =>
      expect(await allSessions()).toEqual([
        { ...session, activityId: reading.id, end: yesterday + 25 * MIN, note: 'Was reading' },
      ]),
    )
    expect(await screen.findByText('Was reading')).toBeInTheDocument()
  })

  it('adds a forgotten session, crossing midnight when the end is earlier', async () => {
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: '+ Add session' }))
    const form = screen.getByRole('form', { name: 'Add session' })
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Activity' }), 'Reading')
    const date = within(form).getByLabelText('Date')
    await user.clear(date)
    await user.type(date, toDateInput(today - 2 * DAY + 12 * 60 * MIN))
    const start = within(form).getByLabelText('Start')
    await user.clear(start)
    await user.type(start, '23:30')
    const end = within(form).getByLabelText(/^End/)
    await user.clear(end)
    await user.type(end, '00:15')
    expect(within(form).getByText('next day')).toBeInTheDocument()
    await user.click(within(form).getByRole('button', { name: 'Add session' }))

    await waitFor(async () => {
      const [added] = await allSessions()
      expect(added).toMatchObject({ activityId: reading.id })
      expect(added.end! - added.start).toBe(45 * MIN)
    })
  })

  it('refuses a session that would end in the future', async () => {
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: '+ Add session' }))
    const form = screen.getByRole('form', { name: 'Add session' })
    const start = within(form).getByLabelText('Start')
    await user.clear(start)
    await user.type(start, '23:59')
    const end = within(form).getByLabelText(/^End/)
    await user.clear(end)
    await user.type(end, '23:58')
    await user.click(within(form).getByRole('button', { name: 'Add session' }))

    // 23:59 → 23:58 next day ends in the future for today's date.
    expect(await within(form).findByRole('alert')).toHaveTextContent(/future/)
    expect(await allSessions()).toEqual([])
  })

  it('keeps the seconds of a short session through an edit', async () => {
    const yesterday = startOfDay(today - 12 * 60 * MIN)
    const start = yesterday + 17 * 60 * MIN + 12_000
    const session = await addSession({ activityId: gym.id, start, end: start + 47_000 })
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: /^Edit Gym/ }))
    const form = screen.getByRole('form', { name: 'Edit session' })
    expect(within(form).getByLabelText('Start')).toHaveValue('17:00:12')
    expect(within(form).getByLabelText(/^End/)).toHaveValue('17:00:59')
    expect(within(form).queryByText('next day')).not.toBeInTheDocument()
    await user.type(within(form).getByRole('textbox', { name: 'Note' }), 'Quick set')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    await waitFor(async () =>
      expect(await allSessions()).toEqual([{ ...session, note: 'Quick set' }]),
    )
  })

  it('refuses an end equal to the start instead of making it a day long', async () => {
    const yesterday = startOfDay(today - 12 * 60 * MIN)
    await addSession({ activityId: gym.id, start: yesterday + 60 * MIN, end: yesterday + 61 * MIN })
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: /^Edit Gym/ }))
    const form = screen.getByRole('form', { name: 'Edit session' })
    const end = within(form).getByLabelText(/^End/)
    await user.clear(end)
    await user.type(end, '01:00:00')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    expect(await within(form).findByRole('alert')).toHaveTextContent('must end after it starts')
  })

  it('deletes a session after confirming', async () => {
    await addSession({ activityId: gym.id, start: today, end: today + MIN })
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: /^Edit Gym/ }))
    await user.click(screen.getByRole('button', { name: 'Delete session' }))
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(async () => expect(await allSessions()).toEqual([]))
  })

  it('edits a running session without stopping it', async () => {
    await startSession(gym.id, Date.now() - 5 * MIN)
    const user = userEvent.setup()
    render(<HistoryView />)

    await user.click(await screen.findByRole('button', { name: /^Edit Gym/ }))
    expect(screen.getByText('still running')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'Legs')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(async () => expect((await getRunningSession())?.note).toBe('Legs'))
  })
})
