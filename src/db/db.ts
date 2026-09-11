import { Dexie, type EntityTable } from 'dexie'
import type { Activity, Session } from './types'

/**
 * How a session is stored. IndexedDB can't index `null`, so the one running session also
 * carries `running: 1`, which makes "what's running?" a single indexed lookup. Everything
 * outside this folder sees plain `Session` objects.
 */
export type SessionRow = Session & { running?: 1 }

export class TimeDatabase extends Dexie {
  activities!: EntityTable<Activity, 'id'>
  sessions!: EntityTable<SessionRow, 'id'>

  constructor(name = 'where-did-my-time-go') {
    super(name)
    this.version(1).stores({
      activities: 'id, createdAt',
      sessions: 'id, activityId, start, running',
    })
  }
}

export const db = new TimeDatabase()
