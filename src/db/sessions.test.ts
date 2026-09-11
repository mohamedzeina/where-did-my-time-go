import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity, updateActivity } from './activities'
import { db } from './db'
import {
  addSession,
  countSessions,
  deleteSession,
  getRunningSession,
  listSessions,
  startSession,
  stopSession,
  updateSession,
} from './sessions'
import type { Activity } from './types'

let gym: Activity
let reading: Activity

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  gym = await createActivity({ name: 'Gym', color: '#111' })
  reading = await createActivity({ name: 'Reading', color: '#222' })
})

describe('startSession', () => {
  it('starts a running session', async () => {
    const session = await startSession(gym.id, 1000)

    expect(session).toMatchObject({ activityId: gym.id, start: 1000, end: null, note: '' })
    expect(await getRunningSession()).toEqual(session)
  })

  it('stops the running session when another activity starts', async () => {
    const first = await startSession(gym.id, 1000)
    const second = await startSession(reading.id, 5000)

    expect(await getRunningSession()).toEqual(second)
    const [stopped] = await listSessions({ from: 0, to: 10_000, activityId: gym.id })
    expect(stopped).toEqual({ ...first, end: 5000 })
  })

  it('keeps the current session when the same activity is started again', async () => {
    const first = await startSession(gym.id, 1000)
    const again = await startSession(gym.id, 5000)

    expect(again).toEqual(first)
    expect(await listSessions({ from: 0, to: 10_000 })).toHaveLength(1)
  })

  it('refuses unknown and archived activities', async () => {
    await expect(startSession('nope')).rejects.toThrow(/not found/)
    await updateActivity(gym.id, { archived: true })
    await expect(startSession(gym.id)).rejects.toThrow(/archived/)
  })
})

describe('stopSession', () => {
  it('ends the running session', async () => {
    const session = await startSession(gym.id, 1000)
    const stopped = await stopSession(4000)

    expect(stopped).toEqual({ ...session, end: 4000 })
    expect(await getRunningSession()).toBeUndefined()
  })

  it('does nothing when no timer is running', async () => {
    expect(await stopSession()).toBeUndefined()
  })

  it('never ends a session before it started', async () => {
    await startSession(gym.id, 5000)
    expect((await stopSession(4000))?.end).toBe(5000)
  })
})

describe('addSession', () => {
  it('records a finished session with a note', async () => {
    const session = await addSession({ activityId: gym.id, start: 0, end: 60_000, note: 'Legs' })

    expect(session).toMatchObject({ start: 0, end: 60_000, note: 'Legs' })
    expect(await getRunningSession()).toBeUndefined()
  })

  it('rejects sessions that end before they start', async () => {
    await expect(addSession({ activityId: gym.id, start: 100, end: 100 })).rejects.toThrow(/end/)
  })
})

describe('updateSession', () => {
  it('moves times, changes activity and edits the note', async () => {
    const session = await addSession({ activityId: gym.id, start: 0, end: 100 })

    const updated = await updateSession(session.id, {
      activityId: reading.id,
      start: 50,
      end: 200,
      note: 'Fixed',
    })

    expect(updated).toEqual({
      ...session,
      activityId: reading.id,
      start: 50,
      end: 200,
      note: 'Fixed',
    })
  })

  it('can edit the running session without stopping it', async () => {
    const running = await startSession(gym.id, 1000)
    await updateSession(running.id, { start: 500, note: 'Warm-up' })

    expect(await getRunningSession()).toMatchObject({ start: 500, end: null, note: 'Warm-up' })
  })

  it('stops the running session when an end is set', async () => {
    const running = await startSession(gym.id, 1000)
    await updateSession(running.id, { end: 2000 })

    expect(await getRunningSession()).toBeUndefined()
  })

  it('rejects an invalid range', async () => {
    const session = await addSession({ activityId: gym.id, start: 0, end: 100 })
    await expect(updateSession(session.id, { start: 150 })).rejects.toThrow(/end/)
  })
})

describe('deleteSession', () => {
  it('removes the session', async () => {
    const session = await addSession({ activityId: gym.id, start: 0, end: 100 })
    await deleteSession(session.id)
    expect(await listSessions({ from: 0, to: 1000 })).toEqual([])
  })
})

describe('countSessions', () => {
  it("counts an activity's finished and running sessions", async () => {
    await addSession({ activityId: gym.id, start: 0, end: 100 })
    await addSession({ activityId: reading.id, start: 0, end: 100 })
    await startSession(gym.id, 200)

    expect(await countSessions(gym.id)).toBe(2)
    expect(await countSessions(reading.id)).toBe(1)
  })
})

describe('listSessions', () => {
  it('returns sessions overlapping the range, oldest first', async () => {
    const before = await addSession({ activityId: gym.id, start: 0, end: 100 })
    const crossesStart = await addSession({ activityId: gym.id, start: 150, end: 250 })
    const inside = await addSession({ activityId: reading.id, start: 300, end: 400 })
    const after = await addSession({ activityId: gym.id, start: 500, end: 600 })
    const running = await startSession(reading.id, 450)

    const found = await listSessions({ from: 200, to: 500 })

    expect(found.map((s) => s.id)).toEqual([crossesStart.id, inside.id, running.id])
    expect(found.map((s) => s.id)).not.toContain(before.id)
    expect(found.map((s) => s.id)).not.toContain(after.id)
  })

  it('filters by activity', async () => {
    await addSession({ activityId: gym.id, start: 0, end: 100 })
    const mine = await addSession({ activityId: reading.id, start: 0, end: 100 })

    expect(await listSessions({ from: 0, to: 1000, activityId: reading.id })).toEqual([mine])
  })
})
