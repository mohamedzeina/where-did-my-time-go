import { useState, type CSSProperties } from 'react'
import { HEAT_LEVEL_LABELS, heatLevel } from '../../lib/insights'
import { addDays, formatHoursMinutes } from '../../lib/totals'
import { ChartTooltip } from './ChartTooltip'

interface CalendarHeatmapProps {
  /** A Monday, local midnight: the first cell. */
  from: number
  /** Local midnight after today: cells stop here. */
  to: number
  /** Tracked ms per day, keyed by local midnight. */
  totals: Map<number, number>
}

const monthName = new Intl.DateTimeFormat(undefined, { month: 'short' })
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

/**
 * Months at a glance: one cell per day, weeks as columns (Monday on top), shaded green by
 * hours tracked. History lists the same days with their totals, so nothing is chart-only.
 */
export function CalendarHeatmap({ from, to, totals }: CalendarHeatmapProps) {
  const [active, setActive] = useState<number>()

  const days: number[] = []
  for (let day = from; day < to; day = addDays(day, 1)) days.push(day)
  const weeks = Math.ceil(days.length / 7)
  const trackedDays = days.filter((d) => (totals.get(d) ?? 0) > 0)
  const total = trackedDays.reduce((sum, d) => sum + (totals.get(d) ?? 0), 0)

  // A month label over the week column holding the 1st of that month. The first column gets
  // its month too, unless the next month's label follows too closely to fit.
  const firstOfMonth = (week: number) =>
    days.slice(week * 7, week * 7 + 7).find((d) => new Date(d).getDate() === 1)
  const monthLabels = Array.from({ length: weeks }, (_, week) => {
    const first = firstOfMonth(week)
    if (first !== undefined) return monthName.format(first)
    const crowded = [1, 2, 3].some((next) => firstOfMonth(next) !== undefined)
    return week === 0 && !crowded ? monthName.format(days[0]) : ''
  })

  return (
    <div className="chart heatmap">
      <div className="chart-head">
        <p className="heatmap-summary">
          <strong>{formatHoursMinutes(total)}</strong> over {trackedDays.length} tracked{' '}
          {trackedDays.length === 1 ? 'day' : 'days'}
        </p>
      </div>

      <div className="heatmap-frame" onPointerLeave={() => setActive(undefined)}>
        <div
          className="heatmap-months"
          aria-hidden="true"
          style={{ '--weeks': weeks } as CSSProperties}
        >
          {monthLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className="heatmap-body">
          <div className="heatmap-rows" aria-hidden="true">
            {ROW_LABELS.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          <div
            className="heatmap-grid"
            role="img"
            aria-label={`Tracked time per day over the last ${weeks} weeks: ${formatHoursMinutes(total)} over ${trackedDays.length} days. History lists each day with its total.`}
            style={{ '--weeks': weeks } as CSSProperties}
          >
            {days.map((day, i) => {
              const ms = totals.get(day) ?? 0
              return (
                <span
                  key={day}
                  className={active === i ? 'heat-cell is-active' : 'heat-cell'}
                  data-level={heatLevel(ms)}
                  onPointerEnter={() => setActive(i)}
                />
              )
            })}
          </div>
          {active !== undefined && (
            <ChartTooltip
              x={(Math.floor(active / 7) + 0.5) / weeks}
              title={longDate.format(days[active])}
              value={
                (totals.get(days[active]) ?? 0) > 0
                  ? formatHoursMinutes(totals.get(days[active])!)
                  : 'Nothing tracked'
              }
            />
          )}
        </div>
        <ul className="heatmap-legend" aria-label="Shading">
          {HEAT_LEVEL_LABELS.map((label, level) => (
            <li key={label}>
              <span className="heat-cell" data-level={level} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
