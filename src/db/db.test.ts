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
