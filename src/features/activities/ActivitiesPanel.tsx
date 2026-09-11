import { useState, type CSSProperties } from 'react'
import { ActivityEditor } from './ActivityEditor'
import { ArchivedItem } from './ArchivedItem'
import { NewActivity } from './NewActivity'
import { useActivities } from './useActivities'
import './activities.css'

/** The activities you track, as a grid of tiles, with an edit mode for managing them. */
export function ActivitiesPanel() {
  const activities = useActivities()
  const [editing, setEditing] = useState(false)

  if (!activities) return null
  const { active, archived } = activities

  return (
    <section className="activities" aria-labelledby="activities-title">
      <div className="activities-head">
        <h2 id="activities-title" className="activities-title">
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
              <div className="tile" style={{ '--tile-color': activity.color } as CSSProperties}>
                <span className="tile-name">{activity.name}</span>
              </div>
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
