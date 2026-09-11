import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity, getActivity, listActivities, updateActivity } from '../../db/activities'
import { db } from '../../db/db'
import { addSession, countSessions } from '../../db/sessions'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { ActivitiesPanel } from './ActivitiesPanel'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('ActivitiesPanel', () => {
  it('lists active activities and hides archived ones', async () => {
    await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    const old = await createActivity({ name: 'Old hobby', color: ACTIVITY_COLORS[1].hex })
    await updateActivity(old.id, { archived: true })

    render(<ActivitiesPanel running={null} />)

    expect(await screen.findByText('Gym')).toBeInTheDocument()
    expect(screen.queryByText('Old hobby')).not.toBeInTheDocument()
  })

  it('creates an activity with the next free color', async () => {
    await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: /new activity/i }))
    expect(screen.getByRole('radio', { name: ACTIVITY_COLORS[1].name })).toBeChecked()
    await user.type(screen.getByRole('textbox', { name: 'New activity name' }), 'Reading{Enter}')

    expect(await screen.findByText('Reading')).toBeInTheDocument()
    const reading = (await listActivities()).find((a) => a.name === 'Reading')
    expect(reading?.color).toBe(ACTIVITY_COLORS[1].hex)
  })

  it('explains why a duplicate name was refused', async () => {
    await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: /new activity/i }))
    await user.type(screen.getByRole('textbox', { name: 'New activity name' }), 'gym{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent(/already an activity called "Gym"/)
    expect(await listActivities()).toHaveLength(1)
  })

  it('renames, recolors and archives in edit mode', async () => {
    const gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    const nameField = screen.getByRole('textbox', { name: 'Name of Gym' })
    await user.clear(nameField)
    await user.type(nameField, 'Weights{Enter}')
    await waitFor(async () => expect((await getActivity(gym.id))?.name).toBe('Weights'))

    await user.click(screen.getByRole('radio', { name: ACTIVITY_COLORS[6].name }))
    await waitFor(async () =>
      expect((await getActivity(gym.id))?.color).toBe(ACTIVITY_COLORS[6].hex),
    )

    await user.click(screen.getByRole('button', { name: 'Archive Weights' }))
    await waitFor(async () => expect((await getActivity(gym.id))?.archived).toBe(true))
    expect(await screen.findByRole('heading', { name: 'Archived' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Unarchive Weights' }))
    await waitFor(async () => expect((await getActivity(gym.id))?.archived).toBe(false))
  })

  it('deletes an archived activity and its sessions after confirming', async () => {
    const gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    await addSession({ activityId: gym.id, start: 0, end: 10 })
    await addSession({ activityId: gym.id, start: 20, end: 30 })
    await updateActivity(gym.id, { archived: true })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Delete Gym' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Delete Gym and its 2 sessions? This can't be undone.",
    )
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect(await getActivity(gym.id)).toBeUndefined())
    expect(await countSessions(gym.id)).toBe(0)
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Archived' })).not.toBeInTheDocument(),
    )
  })

  it('keeps the activity when the delete is called off', async () => {
    const gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    await updateActivity(gym.id, { archived: true })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Delete Gym' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delete Gym? It has no tracked time.',
    )

    await user.keyboard('{Enter}')

    expect(await screen.findByRole('button', { name: 'Delete Gym' })).toBeInTheDocument()
    expect(await getActivity(gym.id)).toBeDefined()
  })

  it('sets a goal in edit mode and shows progress on the tile', async () => {
    const gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    // One minute, right after midnight, so the test holds at any time of day.
    await addSession({
      activityId: gym.id,
      start: midnight.getTime(),
      end: midnight.getTime() + 60_000,
    })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.type(screen.getByRole('textbox', { name: 'Goal hours for Gym' }), '1,5{Enter}')
    await waitFor(async () =>
      expect((await getActivity(gym.id))?.goal).toEqual({ period: 'day', ms: 1.5 * 3_600_000 }),
    )

    const hours = screen.getByRole('textbox', { name: 'Goal hours for Gym' })
    await user.clear(hours)
    await user.type(hours, '2{Enter}')
    const period = screen.getByRole('group', { name: 'Goal period for Gym' })
    await user.click(within(period).getByRole('radio', { name: 'week' }))
    await waitFor(async () =>
      expect((await getActivity(gym.id))?.goal).toEqual({ period: 'week', ms: 2 * 3_600_000 }),
    )

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(
      await screen.findByRole('button', { name: 'Start Gym, 1m of 2h this week' }),
    ).toBeInTheDocument()
  })

  it('clears a goal when the hours are emptied', async () => {
    const gym = await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    await updateActivity(gym.id, { goal: { period: 'day', ms: 3_600_000 } })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByRole('textbox', { name: 'Goal hours for Gym' }))
    await user.tab()

    await waitFor(async () => expect(await getActivity(gym.id)).not.toHaveProperty('goal'))
  })

  it('explains a goal that is not a number', async () => {
    await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex })
    const user = userEvent.setup()
    render(<ActivitiesPanel running={null} />)

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.type(screen.getByRole('textbox', { name: 'Goal hours for Gym' }), 'lots{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('like 2 or 1.5')
  })

  it('shows a hint when there are no activities', async () => {
    render(<ActivitiesPanel running={null} />)
    expect(await screen.findByText(/add an activity/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /^Start / })).toHaveLength(0)
    expect(screen.getByRole('button', { name: /new activity/i })).toBeInTheDocument()
  })
})
