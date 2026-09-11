import { useState, type CSSProperties } from 'react'
import { ColorSwatches } from '../../components/ColorSwatches'
import { updateActivity } from '../../db/activities'
import type { Activity } from '../../db/types'
import { errorMessage } from './useActivities'

/** An activity tile in edit mode: rename, recolor and archive. Changes save as you make them. */
export function ActivityEditor({ activity }: { activity: Activity }) {
  const [name, setName] = useState(activity.name)
  const [error, setError] = useState<string>()

  const save = async (changes: Parameters<typeof updateActivity>[1]) => {
    try {
      await updateActivity(activity.id, changes)
      setError(undefined)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const commitName = () => {
    if (name.trim() === activity.name) return setName(activity.name)
    void save({ name })
  }

  return (
    <div className="tile is-editing" style={{ '--tile-color': activity.color } as CSSProperties}>
      <input
        className="tile-input"
        value={name}
        aria-label={`Name of ${activity.name}`}
        aria-invalid={error ? true : undefined}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setName(activity.name)
            setError(undefined)
          }
        }}
      />
      <ColorSwatches
        name={`color-${activity.id}`}
        value={activity.color}
        onChange={(color) => void save({ color })}
      />
      <button
        type="button"
        className="text-button"
        aria-label={`Archive ${activity.name}`}
        onClick={() => void save({ archived: true })}
      >
        Archive
      </button>
      {error && (
        <p className="tile-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
