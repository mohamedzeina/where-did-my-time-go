import { useLiveQuery } from 'dexie-react-hooks'
import type { CSSProperties } from 'react'
import { Clock } from '../../components/Clock'
import { stopSession } from '../../db/sessions'
import { formatClock } from '../../lib/day'
import { formatDuration } from '../../lib/duration'
import { resumeTarget } from './toggleTimer'
import { useElapsed, type RunningTimer } from './useRunningTimer'

/** The big LED clock, its status line, and the Stop button while something is running. */
export function TimerReadout({ running }: { running: RunningTimer | null }) {
  const elapsed = useElapsed(running?.session.start)
  const next = useLiveQuery(resumeTarget, [])

  if (!running) {
    return (
      <div className="timer-head">
        <div className="readout">
          <p className="readout-status">
            <span className="readout-dot" aria-hidden="true" />
            idle
          </p>
          <div className="readout-frame">
            <Clock value={formatDuration(0)} idle />
          </div>
        </div>
        <p className="view-lede">
          No timer running. Pick an activity to start one.
          {next && (
            <span className="key-hint">
              {' '}
              Or press <kbd className="key">Space</kbd> for {next.name}.
            </span>
          )}
        </p>
      </div>
    )
  }

  const { session, activity } = running
  return (
    <div className="timer-head" style={{ '--clock-color': activity.color } as CSSProperties}>
      <div className="readout">
        <p className="readout-status is-running">
          <span className="readout-dot" aria-hidden="true" />
          recording
        </p>
        <div className="readout-frame">
          <Clock value={formatDuration(elapsed)} />
        </div>
      </div>
      <div className="timer-controls">
        <p className="view-lede">
          Tracking <strong className="timer-activity">{activity.name}</strong> since{' '}
          {formatClock(new Date(session.start))}.
        </p>
        <button
          type="button"
          className="stop-button"
          aria-keyshortcuts="Space"
          onClick={() => void stopSession()}
        >
          <span className="stop-icon" aria-hidden="true" />
          Stop
          <kbd className="key key-hint" aria-hidden="true">
            Space
          </kbd>
        </button>
      </div>
    </div>
  )
}

/**
 * Live elapsed time for small readouts (running tile, session lists), always with hours
 * (`0:12:34`) so it can't be mistaken for the clock times beside it.
 */
export function ElapsedText({ start }: { start: number }) {
  return <>{formatDuration(useElapsed(start), { alwaysHours: true })}</>
}
