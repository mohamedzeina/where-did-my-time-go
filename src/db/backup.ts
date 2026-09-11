import { assertValidGoal } from './activities'
import { db, type SessionRow } from './db'
import type { Activity, Goal, Session } from './types'

export const BACKUP_APP = 'where-did-my-time-go'
export const BACKUP_VERSION = 1

/** Everything the app stores, as written to a backup file. */
export interface Backup {
  app: typeof BACKUP_APP
  version: number
  /** Epoch ms. */
  exportedAt: number
  activities: Activity[]
  sessions: Session[]
}

function toSession({ id, activityId, start, end, note }: SessionRow): Session {
  return { id, activityId, start, end, note }
}

/** A snapshot of all activities and sessions, running session included. */
export async function exportData(now = Date.now()): Promise<Backup> {
  return db.transaction('r', db.activities, db.sessions, async () => ({
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now,
    activities: await db.activities.orderBy('createdAt').toArray(),
    sessions: (await db.sessions.orderBy('start').toArray()).map(toSession),
  }))
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

/**
 * Checks that `value` (already JSON-parsed) is a backup this version can restore, and returns
 * it typed. Throws with a message that says what's wrong with the file.
 */
export function parseBackup(value: unknown): Backup {
  if (!isObject(value) || value.app !== BACKUP_APP) {
    throw new Error("This file isn't a where-did-my-time-go backup.")
  }
  if (typeof value.version !== 'number' || value.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of the app. Update the app first.')
  }
  if (!Array.isArray(value.activities) || !Array.isArray(value.sessions)) {
    throw new Error('This backup is missing its activities or sessions.')
  }

  const activities = value.activities.map((a, i): Activity => {
    if (
      !isObject(a) ||
      typeof a.id !== 'string' ||
      typeof a.name !== 'string' ||
      typeof a.color !== 'string' ||
      typeof a.archived !== 'boolean' ||
      !isTime(a.createdAt)
    ) {
      throw new Error(`Activity ${i + 1} in this backup is damaged.`)
    }
    const activity: Activity = {
      id: a.id,
      name: a.name,
      color: a.color,
      archived: a.archived,
      createdAt: a.createdAt,
    }
    // Goals arrived after the first backup format; older files simply don't have them.
    if (a.goal !== undefined) {
      const goal = a.goal
      try {
        if (!isObject(goal)) throw new Error()
        const parsed = { period: goal.period, ms: goal.ms } as Goal
        assertValidGoal(parsed)
        activity.goal = parsed
      } catch {
        throw new Error(`The goal on activity ${i + 1} in this backup is damaged.`)
      }
    }
    return activity
  })
  const activityIds = new Set(activities.map((a) => a.id))
  if (activityIds.size !== activities.length) {
    throw new Error('This backup lists the same activity twice.')
  }

  const sessions = value.sessions.map((s, i): Session => {
    if (
      !isObject(s) ||
      typeof s.id !== 'string' ||
      typeof s.activityId !== 'string' ||
      !isTime(s.start) ||
      !(s.end === null || (isTime(s.end) && s.end > s.start)) ||
      typeof s.note !== 'string'
    ) {
      throw new Error(`Session ${i + 1} in this backup is damaged.`)
    }
    if (!activityIds.has(s.activityId)) {
      throw new Error(`Session ${i + 1} belongs to an activity that isn't in the backup.`)
    }
    return { id: s.id, activityId: s.activityId, start: s.start, end: s.end, note: s.note }
  })
  if (new Set(sessions.map((s) => s.id)).size !== sessions.length) {
    throw new Error('This backup lists the same session twice.')
  }
  if (sessions.filter((s) => s.end === null).length > 1) {
    throw new Error('This backup has more than one timer running, which the app never does.')
  }

  return {
    app: BACKUP_APP,
    version: value.version,
    exportedAt: isTime(value.exportedAt) ? value.exportedAt : 0,
    activities,
    sessions,
  }
}

/** Replaces everything stored with the backup's contents, all or nothing. */
export async function restoreData(backup: Backup): Promise<void> {
  await db.transaction('rw', db.activities, db.sessions, async () => {
    await db.sessions.clear()
    await db.activities.clear()
    await db.activities.bulkAdd(backup.activities)
    await db.sessions.bulkAdd(
      backup.sessions.map((s): SessionRow => (s.end === null ? { ...s, running: 1 } : { ...s })),
    )
  })
}

/** Deletes every activity and session. Starter activities are not re-created. */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.activities, db.sessions, async () => {
    await db.sessions.clear()
    await db.activities.clear()
  })
}

/** How much is stored, for the data view. */
export async function countData(): Promise<{ activities: number; sessions: number }> {
  const [activities, sessions] = await Promise.all([db.activities.count(), db.sessions.count()])
  return { activities, sessions }
}
