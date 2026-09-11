import { useState } from 'react'
import type { Activity } from '../../db/types'
import { formatHoursMinutes, type ActivityTotal } from '../../lib/totals'

interface DonutChartProps {
  totals: ActivityTotal[]
  activities: Map<string, Activity>
  total: number
}

/** Part-to-whole reads at a glance only while the slices are few; the rest fold into Other. */
const MAX_SLICES = 6
/** Gap between slices, in percent of the ring, so neighbours read as separate. */
const GAP = 0.8

/**
 * Where the time went: a donut of each activity's share, with the exact times beside it. The
 * middle shows the total, or whichever slice is under the pointer.
 */
export function DonutChart({ totals, activities, total }: DonutChartProps) {
  const [active, setActive] = useState<number>()
  if (total <= 0) return null

  const named = totals.length > MAX_SLICES ? totals.slice(0, MAX_SLICES - 1) : totals
  const rest = totals.slice(named.length)
  const slices = [
    ...named.map(({ activityId, ms }) => ({
      key: activityId,
      name: activities.get(activityId)?.name ?? 'Deleted activity',
      color: activities.get(activityId)?.color ?? 'var(--text-faint)',
      ms,
    })),
    ...(rest.length > 0
      ? [
          {
            key: 'other',
            name: `Other (${rest.length})`,
            color: 'var(--text-faint)',
            ms: rest.reduce((sum, t) => sum + t.ms, 0),
          },
        ]
      : []),
  ]

  let start = 0
  const arcs = slices.map((slice) => {
    const pct = (slice.ms / total) * 100
    const arc = { ...slice, pct, start }
    start += pct
    return arc
  })
  const focused = active !== undefined ? arcs[active] : undefined

  return (
    <div className="donut" onPointerLeave={() => setActive(undefined)}>
      <div className="donut-ring-wrap">
        <svg className="donut-ring" viewBox="0 0 100 100" role="presentation">
          {arcs.map((arc, i) => (
            <circle
              key={arc.key}
              className={active === i ? 'donut-slice is-active' : 'donut-slice'}
              cx="50"
              cy="50"
              r="40"
              pathLength={100}
              stroke={arc.color}
              strokeDasharray={`${Math.max(0.5, arc.pct - GAP)} ${100 - Math.max(0.5, arc.pct - GAP)}`}
              strokeDashoffset={-arc.start}
              tabIndex={0}
              role="img"
              aria-label={`${arc.name}: ${formatHoursMinutes(arc.ms)}, ${Math.round(arc.pct)}%`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(undefined)}
            />
          ))}
        </svg>
        <p className="donut-center" aria-hidden="true">
          <span className="donut-value">{formatHoursMinutes(focused ? focused.ms : total)}</span>
          <span className="donut-label">
            {focused ? `${focused.name}, ${Math.round(focused.pct)}%` : 'tracked'}
          </span>
        </p>
      </div>

      <ul className="donut-list" aria-label="Time per activity">
        {arcs.map((arc, i) => (
          <li
            key={arc.key}
            className={active === i ? 'is-active' : undefined}
            onPointerEnter={() => setActive(i)}
          >
            <span className="chart-swatch" style={{ background: arc.color }} />
            <span className="donut-name">{arc.name}</span>
            <span className="donut-time">{formatHoursMinutes(arc.ms)}</span>
            <span className="donut-pct">{Math.round(arc.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
