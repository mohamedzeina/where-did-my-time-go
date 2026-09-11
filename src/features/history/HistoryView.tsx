import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type CSSProperties } from 'react'
import { listActivities } from '../../db/activities'
import { listSessions } from '../../db/sessions'
import type { Activity, Session } from '../../db/types'
import { formatClock } from '../../lib/day'
import {
  formatDayLabel,
  groupByDay,
  RANGE_PRESETS,
  resolveRange,
  toDateInput,
  type RangePreset,
} from '../../lib/ranges'
import { formatHoursMinutes, startOfDay } from '../../lib/totals'
import { useNow } from '../../lib/useNow'
import { ElapsedText } from '../timer/TimerReadout'
import { SessionEditor } from './SessionEditor'
import '../views.css'
import './history.css'

/** Every session, grouped by day, with filters and in-place editing. */
export function HistoryView() {
  const now = useNow(30_000).getTime()
  const [preset, setPreset] = useState<RangePreset>('week')
  const [custom, setCustom] = useState(() => ({ from: toDateInput(now), to: toDateInput(now) }))
  const [activityFilter, setActivityFilter] = useState('')
  const [editingId, setEditingId] = useState<string>()
  const [adding, setAdding] = useState(false)

  const { from, to } = resolveRange(preset, now, custom)
  const data = useLiveQuery(async () => {
    const [sessions, activities] = await Promise.all([
      listSessions({ from, to, activityId: activityFilter || undefined }),
      listActivities({ includeArchived: true }),
    ])
    return { sessions, activities }
  }, [from, to, activityFilter])

  const groups = data ? groupByDay(data.sessions, now) : []
  const activityById = new Map(data?.activities.map((a) => [a.id, a]))
  const total = groups.reduce((sum, g) => sum + g.total, 0)
  const count = data?.sessions.length ?? 0

  return (
    <section className="view view-history" aria-labelledby="view-title">
      <div className="history-head">
        <h1 id="view-title" className="view-title">
          History
        </h1>
        <button
          type="button"
          className="text-button is-primary"
          onClick={() => {
            setEditingId(undefined)
            setAdding(true)
          }}
        >
          + Add session
        </button>
      </div>

      <div className="filters">
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
        <label className="field">
          <span className="field-label">Activity</span>
          <select
            className="input"
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value)}
          >
            <option value="">All activities</option>
            {data?.activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
                {activity.archived ? ' (archived)' : ''}
              </option>
            ))}
          </select>
        </label>
        {data && (
          <p className="history-summary">
            <strong>{formatHoursMinutes(total)}</strong> across {count}{' '}
            {count === 1 ? 'session' : 'sessions'}
          </p>
        )}
      </div>

      {adding && data && (
        <SessionEditor activities={data.activities} onDone={() => setAdding(false)} />
      )}

      {data && groups.length === 0 && (
        <p className="view-lede">
          No sessions in this range. Pick a wider range, or add one you forgot to track.
        </p>
      )}

      {groups.map((group) => (
        <section
          key={group.day}
          className="history-day"
          aria-label={formatDayLabel(group.day, now)}
        >
          <div className="section-head">
            <h2 className="section-title">{formatDayLabel(group.day, now)}</h2>
            <span className="history-day-total">{formatHoursMinutes(group.total)}</span>
          </div>
          <ol className="history-sessions">
            {group.sessions.map((session) =>
              editingId === session.id && data ? (
                <li key={session.id}>
                  <SessionEditor
                    session={session}
                    activities={data.activities}
                    onDone={() => setEditingId(undefined)}
                  />
                </li>
              ) : (
                <HistoryRow
                  key={session.id}
                  session={session}
                  activity={activityById.get(session.activityId)}
                  onEdit={() => {
                    setAdding(false)
                    setEditingId(session.id)
                  }}
                />
              ),
            )}
          </ol>
        </section>
      ))}
    </section>
  )
}

function HistoryRow({
  session,
  activity,
  onEdit,
}: {
  session: Session
  activity?: Activity
  onEdit: () => void
}) {
  const running = session.end === null
  const range = `${formatClock(new Date(session.start))} – ${
    running ? 'now' : formatClock(new Date(session.end!))
  }`
  const nextDay = !running && startOfDay(session.end!) > startOfDay(session.start)
  const name = activity?.name ?? 'Deleted activity'

  return (
    <li
      className={running ? 'history-row is-running' : 'history-row'}
      style={{ '--tile-color': activity?.color } as CSSProperties}
    >
      <span className="session-time">
        {range}
        {nextDay && <span className="history-next-day"> +1</span>}
      </span>
      <span className="history-what">
        <span className="session-name">{name}</span>
        {session.note && <span className="history-note">{session.note}</span>}
      </span>
      <span className="session-duration">
        {running ? (
          <>
            <span className="tile-rec" aria-hidden="true" />
            <ElapsedText start={session.start} />
          </>
        ) : (
          formatHoursMinutes(session.end! - session.start)
        )}
      </span>
      <button
        type="button"
        className="text-button"
        aria-label={`Edit ${name}, ${range}`}
        onClick={onEdit}
      >
        Edit
      </button>
    </li>
  )
}
