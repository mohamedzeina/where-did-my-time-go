import type { CSSProperties } from 'react'
import { startSession } from '../../db/sessions'
import type { Activity } from '../../db/types'
import { ElapsedText } from '../timer/TimerReadout'
import { stopTimer } from '../timer/toggleTimer'

interface ActivityTileProps {
  activity: Activity
  /** Start of the running session, when this activity is the one being timed. */
  runningSince?: number
}

/** Press to start timing this activity; press again to stop. Starting one stops any other. */
export function ActivityTile({ activity, runningSince }: ActivityTileProps) {
  const running = runningSince !== undefined

  return (
    <button
      type="button"
      className={running ? 'tile tile-button is-running' : 'tile tile-button'}
      style={{ '--tile-color': activity.color } as CSSProperties}
      aria-pressed={running}
      aria-label={running ? `Stop ${activity.name}` : `Start ${activity.name}`}
      onClick={() => void (running ? stopTimer() : startSession(activity.id))}
    >
      <span className="tile-name">{activity.name}</span>
      {running && (
        <span className="tile-elapsed" aria-hidden="true">
          <span className="tile-rec" />
          <ElapsedText start={runningSince} />
        </span>
      )}
    </button>
  )
}
