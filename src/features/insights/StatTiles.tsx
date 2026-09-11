import type { Activity } from '../../db/types'
import { formatDayLabel } from '../../lib/ranges'
import { formatHoursMinutes, startOfDay, type ActivityTotal } from '../../lib/totals'
import type { Summary } from '../../lib/insights'

interface StatTilesProps {
  summary: Summary
  top?: ActivityTotal
  activities: Map<string, Activity>
  now: number
}

/** The range's headline numbers. */
export function StatTiles({ summary, top, activities, now }: StatTilesProps) {
  const topActivity = top && activities.get(top.activityId)
  const longestActivity = summary.longest && activities.get(summary.longest.session.activityId)
  const share = top && summary.total > 0 ? Math.round((top.ms / summary.total) * 100) : 0
  const longestDay =
    summary.longest && formatDayLabel(startOfDay(summary.longest.session.start), now)
  const longestWhen =
    longestDay === 'Today' || longestDay === 'Yesterday' ? longestDay.toLowerCase() : longestDay

  return (
    <dl className="stats">
      <div className="stat">
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
      <div className="stat">
        <dt>Longest session</dt>
        <dd className="stat-value">
          {summary.longest ? formatHoursMinutes(summary.longest.ms) : '—'}
        </dd>
        <dd className="stat-note">
          {summary.longest
            ? `${longestActivity?.name ?? 'Deleted activity'}, ${longestWhen}`
            : 'nothing yet'}
        </dd>
      </div>
    </dl>
  )
}
