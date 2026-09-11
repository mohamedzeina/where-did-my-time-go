import { announce } from '../../app/notice'
import { listActivities } from '../../db/activities'
import { db } from '../../db/db'
import { getRunningSession, MIN_SESSION_MS, startSession, stopSession } from '../../db/sessions'
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

/**
 * Stops the running timer, saying so when it was too short to keep. Every Stop control in
 * the app goes through here.
 */
export async function stopTimer(): Promise<'stopped' | 'discarded' | 'nothing'> {
  const result = await stopSession()
  if (!result) return 'nothing'
  if (result.kept) return 'stopped'
  announce(`Too short to keep (under ${MIN_SESSION_MS / 1000}s).`)
  return 'discarded'
}

/** Stops the running timer, or starts the resume target. Reports what it did. */
export async function toggleTimer(): Promise<'stopped' | 'discarded' | 'started' | 'nothing'> {
  if (await getRunningSession()) return stopTimer()
  const target = await resumeTarget()
  if (!target) return 'nothing'
  await startSession(target.id)
  return 'started'
}
