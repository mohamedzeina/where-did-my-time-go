import type { CSSProperties } from 'react'
import type { Activity, Session } from '../../db/types'
import { formatClock } from '../../lib/day'
import { formatHoursMinutes, totalsByActivity } from '../../lib/totals'
import { ElapsedText } from '../timer/TimerReadout'
import { useToday } from './useToday'
import './today.css'

/** Today at a glance: tracked vs. elapsed, time per activity, and the sessions themselves. */
export function TodayPanel() {
  const today = useToday()
  if (!today) return null

  const { from, to, now, sessions, activities } = today
  const totals = totalsByActivity(sessions, from, to, now)
  const tracked = totals.reduce((sum, t) => sum + t.ms, 0)
  const longest = totals[0]?.ms ?? 1

  return (
    <section className="today" aria-labelledby="today-title">
      <div className="section-head">
        <h2 id="today-title" className="section-title">
          Today
        </h2>
        <p className="today-summary">
          <strong>{formatHoursMinutes(tracked)}</strong> tracked of {formatHoursMinutes(now - from)}{' '}
          so far
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="today-empty">
          Nothing tracked yet today. Start a timer and it shows up here.
        </p>
      ) : (
        <div className="today-body">
          <ul className="today-totals" aria-label="Time per activity today">
            {totals.map(({ activityId, ms }) => {
              const activity = activities.get(activityId)
              return (
                <li
                  key={activityId}
                  className="total"
                  style={
                    {
                      '--tile-color': activity?.color,
                      '--share': ms / longest,
                    } as CSSProperties
                  }
                >
                  <span className="total-name">{activity?.name ?? 'Deleted activity'}</span>
                  <span className="total-track" aria-hidden="true">
                    <span className="total-bar" />
                  </span>
                  <span className="total-time">{formatHoursMinutes(ms)}</span>
                </li>
              )
            })}
          </ul>

          <ol className="today-sessions" aria-label="Today's sessions, newest first">
            {[...sessions].reverse().map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                activity={activities.get(session.activityId)}
                dayStart={from}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}

function SessionRow({
  session,
  activity,
  dayStart,
}: {
  session: Session
  activity?: Activity
  dayStart: number
}) {
  const running = session.end === null
  const startLabel = `${session.start < dayStart ? 'yesterday ' : ''}${formatClock(new Date(session.start))}`

  return (
    <li
      className={running ? 'session is-running' : 'session'}
      style={{ '--tile-color': activity?.color } as CSSProperties}
    >
      <span className="session-time">
        {startLabel} – {running ? 'now' : formatClock(new Date(session.end!))}
      </span>
      <span className="session-name">{activity?.name ?? 'Deleted activity'}</span>
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
    </li>
  )
}
