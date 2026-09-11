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
 * also carries a segmented meter and the time done against the target.
 */
export function ActivityTile({ activity, stats, runningSince }: ActivityTileProps) {
  const running = runningSince !== undefined
  const progress = stats?.progress
  const period = activity.goal?.period === 'week' ? 'week' : 'day'
  const spoken =
    progress &&
    `${formatHoursMinutes(progress.done)} of ${formatAmount(progress.target)} ${
      period === 'week' ? 'this week' : 'today'
    }`
  // Round the fill up to whole segments so a lit segment always means real progress.
  const lit = progress ? Math.ceil(progress.fraction * SEGMENTS) / SEGMENTS : 0

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
        progress ? `, ${progress.met ? 'goal met: ' : ''}${spoken}` : ''
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
          <span className={progress.met ? 'tile-meter is-met' : 'tile-meter'} aria-hidden="true" />
          <span className="tile-progress" aria-hidden="true">
            <span>
              <span className="tile-done">{formatHoursMinutes(progress.done)}</span>
              <span className="tile-target">
                /{formatAmount(progress.target)} {period === 'week' ? 'wk' : 'day'}
              </span>
            </span>
            <span className={progress.met ? 'tile-pct is-met' : 'tile-pct'}>
              {progress.met ? '✓' : `${Math.round(progress.fraction * 100)}%`}
            </span>
          </span>
        </>
      )}
    </button>
  )
}
