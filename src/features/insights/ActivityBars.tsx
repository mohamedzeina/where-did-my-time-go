import type { CSSProperties } from 'react'
import type { Activity } from '../../db/types'
import { barShares, formatHoursMinutes, type ActivityTotal } from '../../lib/totals'

interface ActivityBarsProps {
  totals: ActivityTotal[]
  activities: Map<string, Activity>
  total: number
}

/**
 * Time per activity, largest first, as thin bars scaled to the largest. Every value is
 * printed beside its bar, so this doubles as its own table.
 */
export function ActivityBars({ totals, activities, total }: ActivityBarsProps) {
  const shares = barShares(totals)

  return (
    <ul className="activity-bars" aria-label="Time per activity">
      {totals.map(({ activityId, ms }, i) => {
        const activity = activities.get(activityId)
        return (
          <li
            key={activityId}
            className="activity-bar"
            style={{ '--bar-color': activity?.color, '--share': shares[i] } as CSSProperties}
          >
            <span className="activity-bar-name">{activity?.name ?? 'Deleted activity'}</span>
            <span className="activity-bar-track" aria-hidden="true">
              <span className="activity-bar-fill" />
            </span>
            <span className="activity-bar-time">{formatHoursMinutes(ms)}</span>
            <span className="activity-bar-share">{Math.round((ms / total) * 100)}%</span>
          </li>
        )
      })}
    </ul>
  )
}
