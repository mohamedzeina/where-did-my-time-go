import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity, listActivities, updateActivity } from './activities'
import {
  BACKUP_APP,
  BACKUP_VERSION,
  clearAllData,
  countData,
  exportData,
  parseBackup,
  restoreData,
} from './backup'
import { db } from './db'
import { addSession, getRunningSession, listSessions, startSession } from './sessions'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

async function seed() {
  const gym = await createActivity({ name: 'Gym', color: '#111' }, 1)
  await updateActivity(gym.id, { goal: { period: 'week', ms: 3 * 3_600_000 } })
  const old = await createActivity({ name: 'Old', color: '#222' }, 2)
  await addSession({
    activityId: gym.id,
    start: 1000,
    end: 5000,
    note: 'Legs, "heavy"',
    tags: ['legs'],
  })
  await addSession({ activityId: old.id, start: 6000, end: 7000 })
  await updateActivity(old.id, { archived: true })
  await startSession(gym.id, 8000)
}

describe('backup round trip', () => {
  it('restores exactly what was exported, running timer included', async () => {
    await seed()
    const backup = parseBackup(JSON.parse(JSON.stringify(await exportData(9999))))
    const before = {
      activities: await listActivities({ includeArchived: true }),
      sessions: await listSessions({ from: 0, to: Infinity }),
    }

    await clearAllData()
    expect(await countData()).toEqual({ activities: 0, sessions: 0 })

    await restoreData(backup)
    expect(await listActivities({ includeArchived: true })).toEqual(before.activities)
    expect(before.activities[0].goal).toEqual({ period: 'week', ms: 3 * 3_600_000 })
    expect(await listSessions({ from: 0, to: Infinity })).toEqual(before.sessions)
    expect((await getRunningSession())?.start).toBe(8000)
  })

  it('replaces whatever was there before', async () => {
    await seed()
    const backup = await exportData()
    await clearAllData()
    const stray = await createActivity({ name: 'Stray', color: '#333' })
    await addSession({ activityId: stray.id, start: 0, end: 1 })

    await restoreData(backup)

    expect((await listActivities({ includeArchived: true })).map((a) => a.name)).toEqual([
      'Gym',
      'Old',
    ])
    expect(await countData()).toEqual({ activities: 2, sessions: 3 })
  })
})

describe('parseBackup', () => {
  const valid = () => ({
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: 1,
    activities: [{ id: 'a', name: 'Gym', color: '#111', archived: false, createdAt: 1 }],
    sessions: [{ id: 's', activityId: 'a', start: 10, end: 20, note: '', tags: [] }],
  })

  it('accepts a valid backup', () => {
    expect(parseBackup(valid())).toEqual(valid())
  })

  it('accepts a backup from before tags, with none on its sessions', () => {
    const { tags: _, ...untagged } = valid().sessions[0]
    expect(parseBackup({ ...valid(), sessions: [untagged] }).sessions[0].tags).toEqual([])
  })

  it.each([
    ['something else entirely', [1, 2, 3], /isn't a where-did-my-time-go backup/],
    ['a newer version', { ...valid(), version: BACKUP_VERSION + 1 }, /newer version/],
    ['a damaged activity', { ...valid(), activities: [{ id: 'a' }] }, /Activity 1 .* damaged/],
    [
      'an impossible goal',
      {
        ...valid(),
        activities: [{ ...valid().activities[0], goal: { period: 'day', ms: 90_000_000 } }],
      },
      /goal on activity 1 .* damaged/,
    ],
    [
      'a session that ends before it starts',
      { ...valid(), sessions: [{ id: 's', activityId: 'a', start: 20, end: 10, note: '' }] },
      /Session 1 .* damaged/,
    ],
    [
      'damaged tags',
      { ...valid(), sessions: [{ ...valid().sessions[0], tags: 'legs' }] },
      /Session 1 .* damaged/,
    ],
    [
      'an orphaned session',
      { ...valid(), sessions: [{ id: 's', activityId: 'zzz', start: 1, end: 2, note: '' }] },
      /isn't in the backup/,
    ],
    [
      'two running timers',
      {
        ...valid(),
        sessions: [
          { id: 's1', activityId: 'a', start: 1, end: null, note: '' },
          { id: 's2', activityId: 'a', start: 2, end: null, note: '' },
        ],
      },
      /more than one timer/,
    ],
  ])('rejects %s', (_, input, message) => {
    expect(() => parseBackup(input)).toThrow(message)
  })
})
