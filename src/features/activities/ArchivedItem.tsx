import { useState, type CSSProperties } from 'react'
import { deleteActivity, updateActivity } from '../../db/activities'
import { countSessions } from '../../db/sessions'
import type { Activity } from '../../db/types'

/**
 * A row in the archived list. Delete asks first, in place, and says how much history goes
 * with it; "Keep" is focused so a stray Enter doesn't wipe anything.
 */
export function ArchivedItem({ activity }: { activity: Activity }) {
  const [confirming, setConfirming] = useState<{ sessions: number }>()

  const askToDelete = async () => {
    setConfirming({ sessions: await countSessions(activity.id) })
  }

  const style = { '--tile-color': activity.color } as CSSProperties

  if (confirming) {
    const history =
      confirming.sessions === 0
        ? `Delete ${activity.name}? It has no tracked time.`
        : `Delete ${activity.name} and its ${confirming.sessions} ${
            confirming.sessions === 1 ? 'session' : 'sessions'
          }? This can't be undone.`

    return (
      <li
        className="archived-item is-confirming"
        style={style}
        onKeyDown={(event) => event.key === 'Escape' && setConfirming(undefined)}
      >
        <span className="archived-name" role="alert">
          {history}
        </span>
        <span className="archived-actions">
          <button
            type="button"
            className="text-button is-danger"
            onClick={() => void deleteActivity(activity.id)}
          >
            Delete
          </button>
          <button
            type="button"
            className="text-button"
            autoFocus
            onClick={() => setConfirming(undefined)}
          >
            Keep
          </button>
        </span>
      </li>
    )
  }

  return (
    <li className="archived-item" style={style}>
      <span className="archived-name">{activity.name}</span>
      <span className="archived-actions">
        <button
          type="button"
          className="text-button"
          aria-label={`Unarchive ${activity.name}`}
          onClick={() => void updateActivity(activity.id, { archived: false })}
        >
          Unarchive
        </button>
        <button
          type="button"
          className="text-button"
          aria-label={`Delete ${activity.name}`}
          onClick={() => void askToDelete()}
        >
          Delete
        </button>
      </span>
    </li>
  )
}
