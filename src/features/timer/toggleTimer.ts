import { listActivities } from '../../db/activities'
import { db } from '../../db/db'
import { getRunningSession, startSession, stopSession } from '../../db/sessions'
import type { Activity } from '../../db/types'

/**
 * The activity Space would start: the one tracked most recently that isn't archived, or the
 * first activity if nothing has been tracked yet.
 */
export async function resumeTarget(): Promise<Activity | undefined> {
  const active = await listActivities()
  const byId = new Map(active.map((a) => [a.id, a]))
  const recent = await db.sessions.orderBy('start').reverse().limit(100).toArray()
  const last = recent.find((s) => byId.has(s.activityId))
  return last ? byId.get(last.activityId) : active[0]
}

/** Stops the running timer, or starts the resume target. Reports what it did. */
export async function toggleTimer(): Promise<'stopped' | 'started' | 'nothing'> {
  if (await getRunningSession()) {
    await stopSession()
    return 'stopped'
  }
  const target = await resumeTarget()
  if (!target) return 'nothing'
  await startSession(target.id)
  return 'started'
}
