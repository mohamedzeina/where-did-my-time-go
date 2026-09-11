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

const tiles = () => within(screen.getByRole('list', { name: '' })).queryAllByRole('listitem')

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

  it('shows a hint when there are no activities', async () => {
    render(<ActivitiesPanel running={null} />)
    expect(await screen.findByText(/add an activity/i)).toBeInTheDocument()
    expect(tiles()).toHaveLength(1)
  })
})
