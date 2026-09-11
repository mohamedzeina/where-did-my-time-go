import type { Activity } from '../../db/types'
import type { Summary } from '../../lib/insights'
import { formatHoursMinutes, type ActivityTotal } from '../../lib/totals'

interface StatTilesProps {
  summary: Summary
  top?: ActivityTotal
  activities: Map<string, Activity>
}

/**
 * The range in three numbers, with the total as the one loud figure: how much you tracked,
 * what that averages per day, and what took the most of it.
 */
export function StatTiles({ summary, top, activities }: StatTilesProps) {
  const topActivity = top && activities.get(top.activityId)
  const share = top && summary.total > 0 ? Math.round((top.ms / summary.total) * 100) : 0

  return (
    <dl className="stats">
      <div className="stat is-hero">
        <dt>Tracked</dt>
        <dd className="stat-value">{formatHoursMinutes(summary.total)}</dd>
        <dd className="stat-note">
          across {summary.sessionCount} {summary.sessionCount === 1 ? 'session' : 'sessions'}
        </dd>
      </div>
      <div className="stat">
        <dt>Daily average</dt>
        <dd className="stat-value">{formatHoursMinutes(summary.dailyAverage)}</dd>
        <dd className="stat-note">
          over {summary.days} {summary.days === 1 ? 'day' : 'days'}
        </dd>
      </div>
      <div className="stat">
        <dt>Most time on</dt>
        <dd className="stat-value">{topActivity?.name ?? '—'}</dd>
        <dd className="stat-note">
          {top ? `${formatHoursMinutes(top.ms)}, ${share}% of tracked` : 'nothing yet'}
        </dd>
      </div>
    </dl>
  )
}
