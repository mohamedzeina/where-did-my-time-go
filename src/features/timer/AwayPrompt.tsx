import { MIN_SESSION_MS } from '../../db/sessions'
import { formatClock } from '../../lib/day'
import { formatDuration } from '../../lib/duration'
import type { AwayWatch } from './useAwayWatch'
import './away.css'

const REASON = {
  closed: 'the app wasn’t running',
  idle: 'this PC was idle or locked',
} as const

/**
 * The one interruption in the app: time a timer counted while nobody was watching, and the
 * three ways out of it. It sits above every view rather than inside the Timer, because the
 * question outlives wherever you happen to be when you get back.
 */
export function AwayPrompt({ watch }: { watch: AwayWatch }) {
  const { gap, activityName, keep, settle } = watch
  if (!gap) return null

  const left = formatClock(new Date(gap.from))
  // Whatever predates the gap is held to the usual minimum, so a timer started moments before
  // you left has nothing to shorten: both of the fixing answers drop the session outright.
  const nothingBefore = gap.from - gap.sessionStart < MIN_SESSION_MS

  return (
    <div className="away" role="alert">
      <p className="away-text">
        <strong className="away-amount">
          {formatDuration(gap.to - gap.from, { alwaysHours: true })}
        </strong>{' '}
        unaccounted: {activityName ?? 'the timer'} kept counting from {left} to{' '}
        {formatClock(new Date(gap.to))} while {REASON[gap.reason]}.
        {nothingBefore &&
          ' Too little was tracked before it to keep, so that discards the session.'}
      </p>
      <div className="away-actions">
        <button
          type="button"
          className="text-button is-primary"
          onClick={() => void settle('trim')}
        >
          Trim it out
        </button>
        <button type="button" className="text-button" onClick={() => void settle('stop')}>
          {nothingBefore ? 'Discard it' : `Stop at ${left}`}
        </button>
        <button type="button" className="text-button" onClick={keep}>
          Keep it
        </button>
      </div>
    </div>
  )
}
