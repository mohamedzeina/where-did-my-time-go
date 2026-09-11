import { db } from './db'
import { stopSession } from './sessions'
import type { Activity } from './types'

export interface NewActivity {
  name: string
  color: string
}

export type ActivityChanges = Partial<Pick<Activity, 'name' | 'color' | 'archived'>>

async function cleanName(name: string, exceptId?: string): Promise<string> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Give the activity a name.')

  const clash = await db.activities
    .filter((a) => a.id !== exceptId && a.name.toLowerCase() === trimmed.toLowerCase())
    .first()
  if (clash) throw new Error(`There's already an activity called "${clash.name}".`)

  return trimmed
}

export async function createActivity({ name, color }: NewActivity, now = Date.now()) {
  return db.transaction('rw', db.activities, async () => {
    const activity: Activity = {
      id: crypto.randomUUID(),
      name: await cleanName(name),
      color,
      archived: false,
      createdAt: now,
    }
    await db.activities.add(activity)
    return activity
  })
}

export async function getActivity(id: string): Promise<Activity | undefined> {
  return db.activities.get(id)
}

/** Activities in the order they were created. Archived ones are left out unless asked for. */
export async function listActivities({ includeArchived = false } = {}): Promise<Activity[]> {
  const all = await db.activities.orderBy('createdAt').toArray()
  return includeArchived ? all : all.filter((a) => !a.archived)
}

/** Renames, recolors or (un)archives an activity. Archiving stops its timer if it's running. */
export async function updateActivity(id: string, changes: ActivityChanges): Promise<Activity> {
  return db.transaction('rw', db.activities, db.sessions, async () => {
    const existing = await db.activities.get(id)
    if (!existing) throw new Error(`Activity ${id} not found.`)

    const updated: Activity = { ...existing, ...changes }
    if (changes.name !== undefined) updated.name = await cleanName(changes.name, id)
    await db.activities.put(updated)

    if (changes.archived) {
      const running = await db.sessions.where('running').equals(1).first()
      if (running?.activityId === id) await stopSession()
    }

    return updated
  })
}

/** Deletes an activity together with all of its sessions. */
export async function deleteActivity(id: string): Promise<void> {
  await db.transaction('rw', db.activities, db.sessions, async () => {
    await db.sessions.where('activityId').equals(id).delete()
    await db.activities.delete(id)
  })
}
