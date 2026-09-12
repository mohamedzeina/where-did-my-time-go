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

/**
 * Timed sessions shorter than this aren't kept: stopping one discards it, and switching away
 * from one just changes its activity. Mis-taps and rapid clicking leave nothing behind.
 * Sessions added or edited by hand in History aren't held to it.
 */
export const MIN_SESSION_MS = 10_000

export interface StopResult {
  session: Session
  /** False when the session was under {@link MIN_SESSION_MS} and was discarded instead. */
  kept: boolean
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
 * no-op and returns that session. Switching away from a session younger than
 * {@link MIN_SESSION_MS} is treated as correcting a mis-tap: that session keeps its start
 * and simply changes activity.
 */
export async function startSession(activityId: string, at = Date.now()): Promise<Session> {
  return db.transaction('rw', db.activities, db.sessions, async () => {
    await assertActivityUsable(activityId)

    const running = await runningRow()
    if (running?.activityId === activityId) return toSession(running)
    if (running && at - running.start < MIN_SESSION_MS) {
      const corrected = { ...toSession(running), activityId }
      await db.sessions.put(toRow(corrected))
      return corrected
    }
    if (running) {
      await db.sessions.put(toRow({ ...toSession(running), end: Math.max(at, running.start) }))
    }

    const session: Session = { id: crypto.randomUUID(), activityId, start: at, end: null, note: '' }
    await db.sessions.add(toRow(session))
    return session
  })
}

/**
 * Stops the running session at `at`. A session under {@link MIN_SESSION_MS} is deleted
 * rather than kept. Returns `undefined` if nothing was running.
 */
export async function stopSession(at = Date.now()): Promise<StopResult | undefined> {
  return db.transaction('rw', db.sessions, async () => {
    const running = await runningRow()
    if (!running) return undefined
    const session = { ...toSession(running), end: Math.max(at, running.start) }
    if (session.end - session.start < MIN_SESSION_MS) {
      await db.sessions.delete(session.id)
      return { session, kept: false }
    }
    await db.sessions.put(toRow(session))
    return { session, kept: true }
  })
}

/** What to do with a stretch of the running session that nobody was there for. */
export type GapAction = 'trim' | 'stop'

export interface GapResolution {
  /** The session up to the moment you left, or `undefined` if that was too short to keep. */
  kept?: Session
  /** A fresh running session for the same activity, when the away time was trimmed out. */
  resumed?: Session
}

/**
 * Settles time inside the running session that the app couldn't vouch for, because it wasn't
 * running or the machine was idle. `trim` cuts the away time out and picks the same activity
 * back up at `backAt`; `stop` ends the session where you left and leaves nothing running.
 *
 * What's left leading up to `awayFrom` is held to {@link MIN_SESSION_MS} like any other timed
 * session, so a timer started moments before you disappeared leaves nothing behind. Does
 * nothing at all if the session has since been stopped or deleted, say in another tab.
 */
export async function resolveGap(
  sessionId: string,
  awayFrom: number,
  action: GapAction,
  backAt = Date.now(),
): Promise<GapResolution> {
  return db.transaction('rw', db.activities, db.sessions, async () => {
    const row = await db.sessions.get(sessionId)
    if (!row || row.end !== null) return {}

    const cut = Math.max(awayFrom, row.start)
    let kept: Session | undefined
    if (cut - row.start < MIN_SESSION_MS) {
      await db.sessions.delete(row.id)
    } else {
      kept = { ...toSession(row), end: cut }
      await db.sessions.put(toRow(kept))
    }
    if (action === 'stop') return { kept }

    // Archiving stops the running timer, so this only trips when it happened between the
    // question and the answer — and then there's nothing sensible to pick back up.
    const activity = await db.activities.get(row.activityId)
    if (!activity || activity.archived) return { kept }

    const resumed: Session = {
      id: crypto.randomUUID(),
      activityId: row.activityId,
      start: Math.max(backAt, cut),
      end: null,
      note: '',
    }
    await db.sessions.add(toRow(resumed))
    return { kept, resumed }
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

/** When the earliest session started, or `undefined` if nothing has been tracked yet. */
export async function firstSessionStart(): Promise<number | undefined> {
  return (await db.sessions.orderBy('start').first())?.start
}

/** How many sessions, running or finished, belong to an activity. */
export async function countSessions(activityId: string): Promise<number> {
  return db.sessions.where('activityId').equals(activityId).count()
}
