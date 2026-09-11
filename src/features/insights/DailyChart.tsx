import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { timeTicks, type Bucket, type BucketUnit } from '../../lib/insights'
import { formatHoursMinutes } from '../../lib/totals'
import { ChartTooltip } from './ChartTooltip'
import type { Series } from './series'

interface DailyChartProps {
  buckets: Bucket[]
  unit: BucketUnit
  series: Series[]
  now: number
}

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const longDate = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function bucketTitle(bucket: Bucket, unit: BucketUnit): string {
  return unit === 'week'
    ? `Week of ${shortDate.format(bucket.start)}`
    : longDate.format(bucket.start)
}

/** Axis label under a column; sparse when there are many columns. */
function axisLabel(bucket: Bucket, index: number, count: number, unit: BucketUnit): string {
  if (unit === 'day' && count <= 7) return weekday.format(bucket.start)
  const every = count <= 14 ? 2 : count <= 31 ? 5 : Math.ceil(count / 6)
  if (index % every !== 0) return ''
  return unit === 'day' ? String(new Date(bucket.start).getDate()) : shortDate.format(bucket.start)
}

/** Axis tick text: `0`, `30m`, `2h`, `1h 30m`. */
function formatTick(ms: number): string {
  if (ms === 0) return '0'
  const minutes = Math.round(ms / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`
}

function seriesValue(bucket: Bucket, series: Series): number {
  return series.activityIds.reduce((sum, id) => sum + (bucket.byActivity.get(id) ?? 0), 0)
}

/**
 * Time per day (or week), stacked by activity. Columns are thin with a rounded top and a
 * surface gap between layers; hovering or focusing a column shows its breakdown. Arrow
 * keys move between columns. A table view carries the same numbers.
 */
export function DailyChart({ buckets, unit, series, now }: DailyChartProps) {
  const [active, setActive] = useState<number>()
  const [focusIndex, setFocusIndex] = useState(buckets.length - 1)
  const [asTable, setAsTable] = useState(false)
  const slots = useRef<(HTMLDivElement | null)[]>([])

  const max = Math.max(...buckets.map((b) => b.total), 0)
  const ticks = timeTicks(max || 3_600_000)
  const top = ticks[ticks.length - 1]
  const peak = max > 0 ? buckets.findIndex((b) => b.total === max) : -1
  const label = unit === 'week' ? 'Weekly totals' : 'Daily totals'

  const move = (event: KeyboardEvent, index: number) => {
    const next =
      event.key === 'ArrowRight'
        ? index + 1
        : event.key === 'ArrowLeft'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? buckets.length - 1
              : undefined
    if (next === undefined) return
    event.preventDefault()
    const clamped = Math.min(buckets.length - 1, Math.max(0, next))
    setFocusIndex(clamped)
    slots.current[clamped]?.focus()
  }

  const rowsFor = (bucket: Bucket) =>
    series
      .map((s) => ({ s, ms: seriesValue(bucket, s) }))
      .filter(({ ms }) => ms > 0)
      .map(({ s, ms }) => ({
        key: s.id,
        color: s.color,
        label: s.name,
        value: formatHoursMinutes(ms),
      }))

  return (
    <div className="chart">
      <div className="chart-head">
        <ul className="chart-legend" aria-label="Legend">
          {series.map((s) => (
            <li key={s.id}>
              <span className="chart-swatch" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-button"
          aria-pressed={asTable}
          onClick={() => setAsTable(!asTable)}
        >
          {asTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {asTable ? (
        <div className="chart-table-wrap">
          <table className="chart-table">
            <caption className="visually-hidden">{label}</caption>
            <thead>
              <tr>
                <th scope="col">{unit === 'week' ? 'Week' : 'Day'}</th>
                {series.map((s) => (
                  <th key={s.id} scope="col">
                    {s.name}
                  </th>
                ))}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket) => (
                <tr key={bucket.start}>
                  <th scope="row">{bucketTitle(bucket, unit)}</th>
                  {series.map((s) => (
                    <td key={s.id}>{formatHoursMinutes(seriesValue(bucket, s))}</td>
                  ))}
                  <td>{formatHoursMinutes(bucket.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-frame" onPointerLeave={() => setActive(undefined)}>
          <div className="chart-axis" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} style={{ '--at': tick / top } as CSSProperties}>
                {formatTick(tick)}
              </span>
            ))}
          </div>
          <div className="chart-plot">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="chart-gridline"
                style={{ '--at': tick / top } as CSSProperties}
              />
            ))}
            <div className="chart-columns" role="group" aria-label={label}>
              {buckets.map((bucket, index) => {
                const future = bucket.start > now
                return (
                  <div
                    key={bucket.start}
                    ref={(el) => {
                      slots.current[index] = el
                    }}
                    className={active === index ? 'chart-slot is-active' : 'chart-slot'}
                    role="img"
                    tabIndex={index === focusIndex ? 0 : -1}
                    aria-label={`${bucketTitle(bucket, unit)}: ${formatHoursMinutes(bucket.total)}${rowsFor(
                      bucket,
                    )
                      .map((r) => `, ${r.label} ${r.value}`)
                      .join('')}`}
                    onPointerEnter={() => setActive(index)}
                    onFocus={() => {
                      setActive(index)
                      setFocusIndex(index)
                    }}
                    onBlur={() => setActive(undefined)}
                    onKeyDown={(event) => move(event, index)}
                  >
                    {bucket.total > 0 && (
                      <div
                        className="chart-bar"
                        style={{ '--size': bucket.total / top } as CSSProperties}
                      >
                        {series.map((s) => {
                          const ms = seriesValue(bucket, s)
                          return ms > 0 ? (
                            <span
                              key={s.id}
                              className="chart-segment"
                              style={{ flexGrow: ms, background: s.color }}
                            />
                          ) : null
                        })}
                      </div>
                    )}
                    {index === peak && (
                      <span
                        className="chart-peak"
                        style={{ '--size': bucket.total / top } as CSSProperties}
                      >
                        {formatHoursMinutes(bucket.total)}
                      </span>
                    )}
                    <span className="chart-x">
                      {future ? '' : axisLabel(bucket, index, buckets.length, unit)}
                    </span>
                  </div>
                )
              })}
            </div>
            {active !== undefined && (
              <ChartTooltip
                x={(active + 0.5) / buckets.length}
                title={bucketTitle(buckets[active], unit)}
                value={formatHoursMinutes(buckets[active].total)}
                rows={rowsFor(buckets[active])}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
