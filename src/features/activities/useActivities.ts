import { useLiveQuery } from 'dexie-react-hooks'
import { listActivities } from '../../db/activities'
import type { Activity } from '../../db/types'

/** All activities, kept in sync with the database. `undefined` while the first read runs. */
export function useActivities(): { active: Activity[]; archived: Activity[] } | undefined {
  const all = useLiveQuery(() => listActivities({ includeArchived: true }), [])
  if (!all) return undefined
  return {
    active: all.filter((a) => !a.archived),
    archived: all.filter((a) => a.archived),
  }
}

/** Turns a rejected promise into a message for the person using the app. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}
