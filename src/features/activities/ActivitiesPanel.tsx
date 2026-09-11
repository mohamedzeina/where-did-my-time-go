import { useState } from 'react'
import type { RunningTimer } from '../timer/useRunningTimer'
import { ActivityEditor } from './ActivityEditor'
import { ActivityTile } from './ActivityTile'
import { ArchivedItem } from './ArchivedItem'
import { NewActivity } from './NewActivity'
import { useActivities } from './useActivities'
import './activities.css'

/**
 * The activities you track, as a grid of tiles: press one to start timing it (or to stop it
 * if it's already running). Edit mode swaps the tiles for editors.
 */
export function ActivitiesPanel({ running }: { running: RunningTimer | null }) {
  const activities = useActivities()
  const [editing, setEditing] = useState(false)

  if (!activities) return null
  const { active, archived } = activities

  return (
    <section className="activities" aria-labelledby="activities-title">
      <div className="section-head">
        <h2 id="activities-title" className="section-title">
          Activities
        </h2>
        <button
          type="button"
          className="text-button"
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {active.length === 0 && !editing && (
        <p className="activities-empty">Add an activity for each thing you want to track.</p>
      )}

      <ul className="activity-grid">
        {active.map((activity) => (
          <li key={activity.id}>
            {editing ? (
              <ActivityEditor activity={activity} />
            ) : (
              <ActivityTile
                activity={activity}
                runningSince={
                  running?.activity.id === activity.id ? running.session.start : undefined
                }
              />
            )}
          </li>
        ))}
        <li>
          <NewActivity usedColors={active.map((a) => a.color)} />
        </li>
      </ul>

      {editing && archived.length > 0 && (
        <div className="archived">
          <h3 className="archived-title">Archived</h3>
          <ul className="archived-list">
            {archived.map((activity) => (
              <ArchivedItem key={activity.id} activity={activity} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
