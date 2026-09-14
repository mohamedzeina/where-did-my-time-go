import { db } from './db'
import { stopSession } from './sessions'
import type { Activity, Goal } from './types'

export interface NewActivity {
  name: string
  color: string
}

export type ActivityChanges = Partial<Pick<Activity, 'name' | 'color' | 'archived'>> & {
  /** A new goal, or `null` to remove it. */
  goal?: Goal | null
}

const PERIOD_MS = { day: 24 * 3_600_000, week: 7 * 24 * 3_600_000 }

/** Goals are kept to whole minutes, the finest a goal label ever shows. */
export const GOAL_STEP_MS = 60_000

/** Throws if a goal is impossible: nothing, or more time than its period has. */
export function assertValidGoal(goal: Goal): void {
  if (goal.kind !== undefined && goal.kind !== 'target' && goal.kind !== 'limit') {
    throw new Error('Pick a goal or a limit.')
  }
  if (goal.period !== 'day' && goal.period !== 'week') throw new Error('Pick a day or a week.')
  if (!(goal.ms > 0)) throw new Error('Set a goal above zero, or clear it.')
  if (goal.ms > PERIOD_MS[goal.period]) {
    throw new Error(`A ${goal.period} only has ${goal.period === 'day' ? 24 : 168} hours.`)
  }
}

/**
 * A goal as it's stored, once checked: whole minutes, at least one, and only a limit spells
 * out its kind. Hours typed with decimals would otherwise leave seconds a label can't show
 * (1.33h is 1h 19m 48s, shown as 1h 20m) and a percentage that never agrees with it.
 */
export function cleanGoal(goal: Goal): Goal {
  assertValidGoal(goal)
  const { period } = goal
  const ms = Math.max(GOAL_STEP_MS, Math.round(goal.ms / GOAL_STEP_MS) * GOAL_STEP_MS)
  return goal.kind === 'limit' ? { kind: 'limit', period, ms } : { period, ms }
}

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

/**
 * Renames, recolors, (un)archives or sets the goal of an activity. Archiving stops its timer
 * if it's running.
 */
export async function updateActivity(id: string, changes: ActivityChanges): Promise<Activity> {
  if (changes.goal) assertValidGoal(changes.goal)
  return db.transaction('rw', db.activities, db.sessions, async () => {
    const existing = await db.activities.get(id)
    if (!existing) throw new Error(`Activity ${id} not found.`)

    const { goal, ...rest } = changes
    const updated: Activity = { ...existing, ...rest }
    if (goal) updated.goal = cleanGoal(goal)
    if (goal === null) delete updated.goal
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
