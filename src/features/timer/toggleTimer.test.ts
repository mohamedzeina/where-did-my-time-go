import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity, updateActivity } from '../../db/activities'
import { db } from '../../db/db'
import { addSession, getRunningSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { resumeTarget, toggleTimer } from './toggleTimer'

let gym: Activity
let reading: Activity

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: '#111' }, 1)
  reading = await createActivity({ name: 'Reading', color: '#222' }, 2)
})

describe('resumeTarget', () => {
  it('is the first activity when nothing has been tracked', async () => {
    expect((await resumeTarget())?.id).toBe(gym.id)
  })

  it('is the most recently tracked activity', async () => {
    await addSession({ activityId: reading.id, start: 0, end: 10 })
    await addSession({ activityId: gym.id, start: 20, end: 30 })
    await addSession({ activityId: reading.id, start: 40, end: 50 })
    expect((await resumeTarget())?.id).toBe(reading.id)
  })

  it('skips archived activities', async () => {
    await addSession({ activityId: gym.id, start: 0, end: 10 })
    await addSession({ activityId: reading.id, start: 20, end: 30 })
    await updateActivity(reading.id, { archived: true })
    expect((await resumeTarget())?.id).toBe(gym.id)
  })

  it('is undefined when there are no activities', async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    expect(await resumeTarget()).toBeUndefined()
  })
})

describe('toggleTimer', () => {
  it('starts the resume target, then stops it', async () => {
    await addSession({ activityId: reading.id, start: 0, end: 10 })

    expect(await toggleTimer()).toBe('started')
    expect((await getRunningSession())?.activityId).toBe(reading.id)

    expect(await toggleTimer()).toBe('stopped')
    expect(await getRunningSession()).toBeUndefined()
  })

  it('does nothing without activities', async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    expect(await toggleTimer()).toBe('nothing')
  })
})
