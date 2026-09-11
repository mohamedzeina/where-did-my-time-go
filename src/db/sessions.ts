import { db, type SessionRow } from './db'
import type { Session } from './types'

export interface NewSession {
  activityId: string
  start: number
  end: number
  note?: string
}

export type SessionChanges = Partial<Pick<Session, 'activityId' | 'start' | 'note'>> & {
  /** A stopped session can't be restarted, so `end` can only be moved, not cleared. */
  end?: number
}

export interface SessionQuery {
  /** Epoch ms, inclusive. */
  from: number
  /** Epoch ms, exclusive. */
  to: number
  activityId?: string
}

function toSession(row: SessionRow): Session {
  const { id, activityId, start, end, note } = row
  return { id, activityId, start, end, note }
}

function toRow(session: Session): SessionRow {
  return session.end === null ? { ...session, running: 1 } : { ...session }
}

function assertValidRange(start: number, end: number | null) {
  if (end !== null && end <= start) throw new Error('A session must end after it starts.')
}

async function assertActivityUsable(activityId: string) {
  const activity = await db.activities.get(activityId)
  if (!activity) throw new Error(`Activity ${activityId} not found.`)
  if (activity.archived) throw new Error(`"${activity.name}" is archived. Unarchive it first.`)
}

async function runningRow(): Promise<SessionRow | undefined> {
  return db.sessions.where('running').equals(1).first()
}

/** The session currently being timed, if any. */
export async function getRunningSession(): Promise<Session | undefined> {
  const row = await runningRow()
  return row && toSession(row)
}

/**
 * Starts timing `activityId` at `at`. Any other running session is stopped at the same
 * moment, so only one session ever runs. Starting the activity that's already running is a
 * no-op and returns that session.
 */
export async function startSession(activityId: string, at = Date.now()): Promise<Session> {
  return db.transaction('rw', db.activities, db.sessions, async () => {
    await assertActivityUsable(activityId)

    const running = await runningRow()
    if (running?.activityId === activityId) return toSession(running)
    if (running) {
      await db.sessions.put(toRow({ ...toSession(running), end: Math.max(at, running.start) }))
    }

    const session: Session = { id: crypto.randomUUID(), activityId, start: at, end: null, note: '' }
    await db.sessions.add(toRow(session))
    return session
  })
}

/** Stops the running session at `at` and returns it, or `undefined` if nothing was running. */
export async function stopSession(at = Date.now()): Promise<Session | undefined> {
  return db.transaction('rw', db.sessions, async () => {
    const running = await runningRow()
    if (!running) return undefined
    const stopped = { ...toSession(running), end: Math.max(at, running.start) }
    await db.sessions.put(toRow(stopped))
    return stopped
  })
}

/** Records a finished session after the fact, for time you forgot to track. */
export async function addSession({ activityId, start, end, note = '' }: NewSession) {
  assertValidRange(start, end)
  return db.transaction('rw', db.activities, db.sessions, async () => {
    await assertActivityUsable(activityId)
    const session: Session = { id: crypto.randomUUID(), activityId, start, end, note }
    await db.sessions.add(toRow(session))
    return session
  })
}

export async function updateSession(id: string, changes: SessionChanges): Promise<Session> {
  return db.transaction('rw', db.activities, db.sessions, async () => {
    const existing = await db.sessions.get(id)
    if (!existing) throw new Error(`Session ${id} not found.`)

    const updated: Session = { ...toSession(existing), ...changes }
    assertValidRange(updated.start, updated.end)
    if (changes.activityId && changes.activityId !== existing.activityId) {
      await assertActivityUsable(changes.activityId)
    }

    await db.sessions.put(toRow(updated))
    return updated
  })
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id)
}

/**
 * Sessions that overlap `[from, to)`, oldest first. A session that crosses a boundary (say,
 * one that runs past midnight) is included whole; clip it when totalling.
 */
export async function listSessions({ from, to, activityId }: SessionQuery): Promise<Session[]> {
  const rows = await db.sessions
    .where('start')
    .below(to)
    .filter((row) => (row.end ?? Infinity) > from)
    .filter((row) => !activityId || row.activityId === activityId)
    .toArray()
  return rows.map(toSession)
}

/** How many sessions, running or finished, belong to an activity. */
export async function countSessions(activityId: string): Promise<number> {
  return db.sessions.where('activityId').equals(activityId).count()
}
