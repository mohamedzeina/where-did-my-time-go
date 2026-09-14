import type { CSSProperties } from 'react'
import { startSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { formatAmount } from '../../lib/goals'
import { formatHoursMinutes } from '../../lib/totals'
import { ElapsedText } from '../timer/TimerReadout'
import { stopTimer } from '../timer/toggleTimer'
import type { ActivityStats } from './useActivityStats'

interface ActivityTileProps {
  activity: Activity
  stats?: ActivityStats
  /** Start of the running session, when this activity is the one being timed. */
  runningSince?: number
}

/** Lit segments in the goal meter; enough to read at a glance, coarse enough to stay calm. */
const SEGMENTS = 12

/**
 * A compact tile: press it to start timing the activity, press again to stop. With a goal it
 * also carries a segmented meter and the time done against the target. A limit's meter turns
 * to a warning once it's passed, with the overrun where the percentage was.
 */
export function ActivityTile({ activity, stats, runningSince }: ActivityTileProps) {
  const running = runningSince !== undefined
  const progress = stats?.progress
  const limit = progress?.limit ?? false
  const period = activity.goal?.period === 'week' ? 'week' : 'day'
  const spoken =
    progress &&
    `${formatHoursMinutes(progress.done)} of ${formatAmount(progress.target)}${
      limit ? ' limit' : ''
    } ${period === 'week' ? 'this week' : 'today'}`
  const state = progress?.over ? 'is-over' : progress?.met && !limit ? 'is-met' : ''
  // Meter and percentage both round down, so they never disagree: a segment lights only once
  // its full twelfth is done, and 100% only shows once the amount is actually reached. Whole
  // milliseconds keep the boundaries exact (10m of 2h is one segment, not 0.999… of one).
  const share = (parts: number) =>
    progress ? Math.min(parts, Math.floor((progress.done * parts) / progress.target)) : 0
  const lit = share(SEGMENTS) / SEGMENTS

  return (
    <button
      type="button"
      className={running ? 'tile tile-button is-running' : 'tile tile-button'}
      style={
        {
          '--tile-color': activity.color,
          '--fill': lit,
          '--segments': SEGMENTS,
        } as CSSProperties
      }
      aria-pressed={running}
      aria-label={`${running ? 'Stop' : 'Start'} ${activity.name}${
        progress
          ? `, ${state === 'is-over' ? 'over limit: ' : state === 'is-met' ? 'goal met: ' : ''}${spoken}`
          : ''
      }`}
      onClick={() => void (running ? stopTimer() : startSession(activity.id))}
    >
      <span className="tile-name">{activity.name}</span>

      {running && (
        <span className="tile-elapsed" aria-hidden="true">
          <span className="tile-rec" />
          <ElapsedText start={runningSince} />
        </span>
      )}

      {progress && (
        <>
          <span className={`tile-meter ${state}`} aria-hidden="true" />
          <span className="tile-progress" aria-hidden="true">
            <span>
              <span className="tile-done">{formatHoursMinutes(progress.done)}</span>
              <span className="tile-target">
                {limit ? ' ≤' : '/'}
                {formatAmount(progress.target)} {period === 'week' ? 'wk' : 'day'}
              </span>
            </span>
            <span className={`tile-pct ${state}`}>
              {state === 'is-over'
                ? // Just past the limit reads +1s rather than +<1s.
                  `+${formatHoursMinutes(Math.max(1000, progress.done - progress.target))}`
                : state === 'is-met'
                  ? '✓'
                  : `${share(100)}%`}
            </span>
          </span>
        </>
      )}
    </button>
  )
}
