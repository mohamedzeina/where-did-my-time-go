import { Dexie, type EntityTable } from 'dexie'
import { ACTIVITY_COLORS } from '../lib/palette'
import type { Activity, Session } from './types'

/**
 * How a session is stored. IndexedDB can't index `null`, so the one running session also
 * carries `running: 1`, which makes "what's running?" a single indexed lookup. Everything
 * outside this folder sees plain `Session` objects.
 */
export type SessionRow = Session & { running?: 1 }

/** Starter activities, created once when the database is first made. */
export const DEFAULT_ACTIVITY_NAMES = ['Deep work', 'Meetings', 'Learning', 'Exercise', 'Break']

export class TimeDatabase extends Dexie {
  activities!: EntityTable<Activity, 'id'>
  sessions!: EntityTable<SessionRow, 'id'>

  constructor(name = 'where-did-my-time-go') {
    super(name)
    this.version(1).stores({
      activities: 'id, createdAt',
      sessions: 'id, activityId, start, running',
    })

    // Runs only when the database is created, so archiving or renaming the starters sticks.
    this.on('populate', (tx) => {
      const now = Date.now()
      const starters: Activity[] = DEFAULT_ACTIVITY_NAMES.map((name, i) => ({
        id: crypto.randomUUID(),
        name,
        color: ACTIVITY_COLORS[i].hex,
        archived: false,
        createdAt: now + i,
      }))
      return tx.table<Activity, string>('activities').bulkAdd(starters)
    })
  }
}

export const db = new TimeDatabase()
