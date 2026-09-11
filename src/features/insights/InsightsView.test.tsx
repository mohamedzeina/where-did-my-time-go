import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity } from '../../db/activities'
import { db } from '../../db/db'
import { addSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { startOfDay } from '../../lib/totals'
import { InsightsView } from './InsightsView'

const MIN = 60_000
const HOUR = 60 * MIN
let gym: Activity
let reading: Activity
let yesterday: number

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
  reading = await createActivity({ name: 'Reading', color: ACTIVITY_COLORS[1].hex })
  // Yesterday, so the whole day is in the past whenever the tests run.
  yesterday = startOfDay(startOfDay(Date.now()) - 1)
  await addSession({ activityId: gym.id, start: yesterday + 7 * HOUR, end: yesterday + 8 * HOUR })
  await addSession({
    activityId: reading.id,
    start: yesterday + 20 * HOUR,
    end: yesterday + 23 * HOUR,
  })
})

describe('InsightsView', () => {
  it('shows the headline numbers for the range', async () => {
    render(<InsightsView />)

    const stats = await screen.findByText('Tracked')
    const tiles = stats.closest('dl')!
    expect(within(tiles).getByText('4h 00m')).toBeInTheDocument()
    expect(within(tiles).getByText('across 2 sessions')).toBeInTheDocument()
    expect(within(tiles).getByText('Reading', { selector: '.stat-value' })).toBeInTheDocument()
    expect(within(tiles).getByText('3h 00m, 75% of tracked')).toBeInTheDocument()
  })

  it('lists time per activity, largest first, with shares', async () => {
    render(<InsightsView />)

    const bars = within(await screen.findByRole('list', { name: 'Time per activity' }))
    expect(bars.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Reading3h 00m75%',
      'Gym1h 00m25%',
    ])
  })

  it('reads out a column on focus and moves with the arrow keys', async () => {
    render(<InsightsView />)

    const columns = await screen.findAllByRole('img', { name: /: / })
    const dayColumns = columns.filter((c) => c.classList.contains('chart-slot'))
    expect(dayColumns).toHaveLength(7)
    // The last column (today) is the one in the tab order.
    expect(dayColumns[6]).toHaveAttribute('tabindex', '0')

    fireEvent.focus(dayColumns[6])
    fireEvent.keyDown(dayColumns[6], { key: 'ArrowLeft' })
    expect(dayColumns[5]).toHaveFocus()
    expect(dayColumns[5]).toHaveAccessibleName(/4h 00m, Reading 3h 00m, Gym 1h 00m$/)
    expect(document.querySelector('.chart-tooltip')).toHaveTextContent('4h 00m')
  })

  it('offers every chart as a table', async () => {
    const user = userEvent.setup()
    render(<InsightsView />)

    const toggles = await screen.findAllByRole('button', { name: 'Show table' })
    for (const toggle of toggles) await user.click(toggle)

    const tables = screen.getAllByRole('table')
    expect(tables).toHaveLength(2)
    // Heatmap table: only days with tracked time.
    expect(within(tables[0]).getAllByRole('row')).toHaveLength(2)
    expect(within(tables[0]).getByText('4h 00m')).toBeInTheDocument()
    // Daily table: one row per day plus the header, with a column per activity.
    expect(within(tables[1]).getAllByRole('row')).toHaveLength(8)
    expect(within(tables[1]).getByRole('columnheader', { name: 'Reading' })).toBeInTheDocument()
  })

  it('says so when a range has nothing tracked', async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    render(<InsightsView />)
    expect(await screen.findByText(/nothing tracked in this range yet/i)).toBeInTheDocument()
  })
})
