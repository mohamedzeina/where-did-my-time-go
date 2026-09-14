import { Dexie } from 'dexie'
import { afterEach, expect, it } from 'vitest'
import { ACTIVITY_COLORS } from '../lib/palette'
import { DEFAULT_ACTIVITY_NAMES, TimeDatabase } from './db'

let fresh: TimeDatabase | undefined

afterEach(async () => {
  await fresh?.delete()
})

it('creates the starter activities in order, each with its own color', async () => {
  fresh = new TimeDatabase('seed-test')
  const activities = await fresh.activities.orderBy('createdAt').toArray()

  expect(activities.map((a) => a.name)).toEqual(DEFAULT_ACTIVITY_NAMES)
  expect(activities.map((a) => a.color)).toEqual(
    ACTIVITY_COLORS.slice(0, DEFAULT_ACTIVITY_NAMES.length).map((c) => c.hex),
  )
  expect(activities.every((a) => !a.archived)).toBe(true)
})

it('does not re-create starters once the database exists', async () => {
  fresh = new TimeDatabase('seed-test')
  const [first] = await fresh.activities.toArray()
  await fresh.activities.delete(first.id)
  fresh.close()

  fresh = new TimeDatabase('seed-test')
  expect(await fresh.activities.count()).toBe(DEFAULT_ACTIVITY_NAMES.length - 1)
})

it('gives sessions from before tags an empty list of them', async () => {
  const old = new Dexie('upgrade-test')
  old.version(1).stores({ activities: 'id, createdAt', sessions: 'id, activityId, start, running' })
  await old.table('sessions').add({ id: 's', activityId: 'a', start: 1, end: 2, note: 'Legs' })
  old.close()

  fresh = new TimeDatabase('upgrade-test')
  expect(await fresh.sessions.toArray()).toEqual([
    { id: 's', activityId: 'a', start: 1, end: 2, note: 'Legs', tags: [] },
  ])
})

it('rounds goals saved with seconds left over to whole minutes', async () => {
  const old = new Dexie('goal-upgrade-test')
  old.version(2).stores({
    activities: 'id, createdAt',
    sessions: 'id, activityId, start, running, *tags',
  })
  await old.table('activities').bulkAdd([
    {
      id: 'a',
      name: 'A',
      color: '#111',
      archived: false,
      createdAt: 1,
      goal: { period: 'day', ms: 4_788_000 },
    },
    {
      id: 'b',
      name: 'B',
      color: '#222',
      archived: false,
      createdAt: 2,
      goal: { kind: 'limit', period: 'day', ms: 12_000 },
    },
    { id: 'c', name: 'C', color: '#333', archived: false, createdAt: 3 },
  ])
  old.close()

  fresh = new TimeDatabase('goal-upgrade-test')
  const goals = (await fresh.activities.orderBy('createdAt').toArray()).map((a) => a.goal)
  expect(goals).toEqual([
    { period: 'day', ms: 80 * 60_000 },
    { kind: 'limit', period: 'day', ms: 60_000 },
    undefined,
  ])
})
