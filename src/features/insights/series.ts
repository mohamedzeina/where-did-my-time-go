import type { Activity } from '../../db/types'
import type { ActivityTotal } from '../../lib/totals'

/** A stack layer: one activity, or everything past the eighth folded into "Other". */
export interface Series {
  id: string
  name: string
  color: string
  activityIds: string[]
}

/** The palette has eight colors, so a stack never shows more than eight layers. */
export const MAX_SERIES = 8

/**
 * Stack layers for a range: the top activities by time, largest first, with anything past
 * the eighth folded into "Other". Colors follow the activity, so filtering never repaints
 * one that stays.
 */
export function seriesFor(totals: ActivityTotal[], activities: Map<string, Activity>): Series[] {
  const named = totals.length > MAX_SERIES ? totals.slice(0, MAX_SERIES - 1) : totals
  const series: Series[] = named.map(({ activityId }) => {
    const activity = activities.get(activityId)
    return {
      id: activityId,
      name: activity?.name ?? 'Deleted activity',
      color: activity?.color ?? 'var(--text-faint)',
      activityIds: [activityId],
    }
  })
  const rest = totals.slice(named.length)
  if (rest.length > 0) {
    series.push({
      id: 'other',
      name: `Other (${rest.length})`,
      color: 'var(--text-faint)',
      activityIds: rest.map((t) => t.activityId),
    })
  }
  return series
}
