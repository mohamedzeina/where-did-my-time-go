import { useState } from 'react'
import { listActivities } from '../../db/activities'
import { firstSessionStart, listSessions } from '../../db/sessions'
import { bucketize, bucketUnitFor, startOfWeek, summarize } from '../../lib/insights'
import { RANGE_PRESETS, resolveRange, toDateInput, type RangePreset } from '../../lib/ranges'
import { addDays, endOfDay, startOfDay, totalsByActivity } from '../../lib/totals'
import { useNow } from '../../lib/useNow'
import { useStableLiveQuery } from '../../lib/useStableLiveQuery'
import { ActivityBars } from './ActivityBars'
import { CalendarHeatmap } from './CalendarHeatmap'
import { DailyChart } from './DailyChart'
import { seriesFor } from './series'
import { StatTiles } from './StatTiles'
import '../views.css'
import './insights.css'

const HEATMAP_WEEKS = 26

/** Where the time went: a half-year heatmap, then headline numbers and charts for a range. */
export function InsightsView() {
  const now = useNow(30_000).getTime()
  const [preset, setPreset] = useState<RangePreset>('week')
  const [custom, setCustom] = useState(() => ({ from: toDateInput(now), to: toDateInput(now) }))

  const heatFrom = addDays(startOfWeek(now), -(HEATMAP_WEEKS - 1) * 7)
  const heatTo = endOfDay(now)
  const heat = useStableLiveQuery(async () => {
    const sessions = await listSessions({ from: heatFrom, to: heatTo })
    const days = bucketize(sessions, heatFrom, heatTo, Date.now(), 'day')
    return new Map(days.map((d) => [d.start, d.total]))
  }, [heatFrom, heatTo])

  const range = resolveRange(preset, now, custom)
  const { data, stale } = useStableLiveQuery(async () => {
    const earliest = preset === 'all' ? await firstSessionStart() : undefined
    const from = preset === 'all' ? startOfDay(earliest ?? now) : range.from
    const [sessions, activities] = await Promise.all([
      listSessions({ from, to: range.to }),
      listActivities({ includeArchived: true }),
    ])
    return { from, sessions, activities: new Map(activities.map((a) => [a.id, a])) }
  }, [preset, range.from, range.to])

  const from = data?.from ?? range.from
  const totals = data ? totalsByActivity(data.sessions, from, range.to, now) : []
  const summary = data && summarize(data.sessions, from, range.to, now)
  const unit = bucketUnitFor(from, range.to)
  const buckets = data ? bucketize(data.sessions, from, range.to, now, unit) : []

  return (
    <section className="view view-insights" aria-labelledby="view-title">
      <h1 id="view-title" className="view-title">
        Insights
      </h1>

      <section className="insights-block" aria-labelledby="heatmap-title">
        <div className="section-head">
          <h2 id="heatmap-title" className="section-title">
            Last {HEATMAP_WEEKS} weeks
          </h2>
        </div>
        {heat.data && <CalendarHeatmap from={heatFrom} to={heatTo} totals={heat.data} />}
      </section>

      <div className="filters insights-filters">
        <label className="field">
          <span className="field-label">Range</span>
          <select
            className="input"
            value={preset}
            onChange={(event) => setPreset(event.target.value as RangePreset)}
          >
            {RANGE_PRESETS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {preset === 'custom' && (
          <>
            <label className="field">
              <span className="field-label">From</span>
              <input
                className="input"
                type="date"
                value={custom.from}
                onChange={(event) => setCustom({ ...custom, from: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">To</span>
              <input
                className="input"
                type="date"
                value={custom.to}
                onChange={(event) => setCustom({ ...custom, to: event.target.value })}
              />
            </label>
          </>
        )}
      </div>

      {data && summary && (
        <div className={stale ? 'insights-range is-stale' : 'insights-range'}>
          <StatTiles summary={summary} top={totals[0]} activities={data.activities} now={now} />

          {summary.total === 0 ? (
            <p className="view-lede">
              Nothing tracked in this range yet. Pick a wider range, or start a timer.
            </p>
          ) : (
            <>
              <section className="insights-block" aria-labelledby="per-activity-title">
                <div className="section-head">
                  <h2 id="per-activity-title" className="section-title">
                    Per activity
                  </h2>
                </div>
                <ActivityBars totals={totals} activities={data.activities} total={summary.total} />
              </section>

              <section className="insights-block" aria-labelledby="over-time-title">
                <div className="section-head">
                  <h2 id="over-time-title" className="section-title">
                    {unit === 'week' ? 'Week by week' : 'Day by day'}
                  </h2>
                </div>
                <DailyChart
                  buckets={buckets}
                  unit={unit}
                  series={seriesFor(totals, data.activities)}
                  now={now}
                />
              </section>
            </>
          )}
        </div>
      )}
    </section>
  )
}
