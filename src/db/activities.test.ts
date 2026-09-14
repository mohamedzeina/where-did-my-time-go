import { beforeEach, describe, expect, it } from 'vitest'
import {
  createActivity,
  deleteActivity,
  getActivity,
  listActivities,
  updateActivity,
} from './activities'
import { db } from './db'
import { addSession, getRunningSession, listSessions, startSession } from './sessions'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('createActivity', () => {
  it('stores a trimmed, unarchived activity', async () => {
    const created = await createActivity({ name: '  Deep work ', color: '#ffb23e' }, 1000)

    expect(created).toMatchObject({
      name: 'Deep work',
      color: '#ffb23e',
      archived: false,
      createdAt: 1000,
    })
    expect(await getActivity(created.id)).toEqual(created)
  })

  it('rejects empty names', async () => {
    await expect(createActivity({ name: '   ', color: '#fff' })).rejects.toThrow(/name/)
  })

  it('rejects a name that is already taken, ignoring case', async () => {
    await createActivity({ name: 'Gym', color: '#fff' })
    await expect(createActivity({ name: 'gym', color: '#000' })).rejects.toThrow(/already/)
  })
})

describe('listActivities', () => {
  it('lists in creation order and hides archived ones by default', async () => {
    const reading = await createActivity({ name: 'Reading', color: '#111' }, 2)
    const coding = await createActivity({ name: 'Coding', color: '#222' }, 1)
    await updateActivity(reading.id, { archived: true })

    expect((await listActivities()).map((a) => a.name)).toEqual(['Coding'])
    expect((await listActivities({ includeArchived: true })).map((a) => a.id)).toEqual([
      coding.id,
      reading.id,
    ])
  })
})

describe('updateActivity', () => {
  it('renames and recolors', async () => {
    const activity = await createActivity({ name: 'Codng', color: '#111' })
    const updated = await updateActivity(activity.id, { name: 'Coding ', color: '#222' })

    expect(updated).toMatchObject({ name: 'Coding', color: '#222' })
    expect(await getActivity(activity.id)).toEqual(updated)
  })

  it('allows keeping the same name with different casing', async () => {
    const activity = await createActivity({ name: 'gym', color: '#111' })
    await expect(updateActivity(activity.id, { name: 'Gym' })).resolves.toMatchObject({
      name: 'Gym',
    })
  })

  it("rejects renaming to another activity's name", async () => {
    await createActivity({ name: 'Gym', color: '#111' })
    const other = await createActivity({ name: 'Run', color: '#222' })
    await expect(updateActivity(other.id, { name: 'GYM' })).rejects.toThrow(/already/)
  })

  it('stops the timer when archiving the running activity', async () => {
    const activity = await createActivity({ name: 'Gym', color: '#111' })
    await startSession(activity.id, 1000)

    await updateActivity(activity.id, { archived: true })

    expect(await getRunningSession()).toBeUndefined()
  })

  it('throws for an unknown activity', async () => {
    await expect(updateActivity('nope', { name: 'X' })).rejects.toThrow(/not found/)
  })
})

describe('goals', () => {
  it('sets, changes and clears a goal', async () => {
    const gym = await createActivity({ name: 'Gym', color: '#111' })

    await updateActivity(gym.id, { goal: { period: 'week', ms: 3 * 3_600_000 } })
    expect((await getActivity(gym.id))?.goal).toEqual({ period: 'week', ms: 3 * 3_600_000 })

    await updateActivity(gym.id, { name: 'Weights' })
    expect((await getActivity(gym.id))?.goal).toEqual({ period: 'week', ms: 3 * 3_600_000 })

    await updateActivity(gym.id, { goal: null })
    expect(await getActivity(gym.id)).not.toHaveProperty('goal')
  })

  it('keeps goals to whole minutes, and at least one', async () => {
    const gym = await createActivity({ name: 'Gym', color: '#111' })

    await updateActivity(gym.id, { goal: { period: 'day', ms: 1.33 * 3_600_000 } })
    expect((await getActivity(gym.id))?.goal).toEqual({ period: 'day', ms: 80 * 60_000 })

    await updateActivity(gym.id, { goal: { kind: 'limit', period: 'day', ms: 20_000 } })
    expect((await getActivity(gym.id))?.goal).toEqual({ kind: 'limit', period: 'day', ms: 60_000 })
  })

  it('stores a limit with its kind, and a target without one', async () => {
    const gym = await createActivity({ name: 'Gym', color: '#111' })

    await updateActivity(gym.id, { goal: { kind: 'limit', period: 'day', ms: 3_600_000 } })
    expect((await getActivity(gym.id))?.goal).toEqual({
      kind: 'limit',
      period: 'day',
      ms: 3_600_000,
    })

    await updateActivity(gym.id, { goal: { kind: 'target', period: 'day', ms: 3_600_000 } })
    expect((await getActivity(gym.id))?.goal).toEqual({ period: 'day', ms: 3_600_000 })
  })

  it.each([
    [{ period: 'day', ms: 0 }, /above zero/],
    [{ period: 'day', ms: 25 * 3_600_000 }, /only has 24 hours/],
    [{ period: 'week', ms: 169 * 3_600_000 }, /only has 168 hours/],
  ] as const)('rejects %o', async (goal, message) => {
    const gym = await createActivity({ name: 'Gym', color: '#111' })
    await expect(updateActivity(gym.id, { goal })).rejects.toThrow(message)
  })
})

describe('deleteActivity', () => {
  it('removes the activity and all of its sessions', async () => {
    const gym = await createActivity({ name: 'Gym', color: '#111' })
    const run = await createActivity({ name: 'Run', color: '#222' })
    await addSession({ activityId: gym.id, start: 0, end: 10 })
    await addSession({ activityId: run.id, start: 20, end: 30 })

    await deleteActivity(gym.id)

    expect(await getActivity(gym.id)).toBeUndefined()
    const left = await listSessions({ from: 0, to: 100 })
    expect(left.map((s) => s.activityId)).toEqual([run.id])
  })
})
