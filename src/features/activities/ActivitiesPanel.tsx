import { useState } from 'react'
import type { RunningTimer } from '../timer/useRunningTimer'
import { ActivityEditor } from './ActivityEditor'
import { ActivityTile } from './ActivityTile'
import { ArchivedItem } from './ArchivedItem'
import { NewActivity } from './NewActivity'
import { useActivities } from './useActivities'
import { useActivityStats } from './useActivityStats'
import './activities.css'

/**
 * The activities you track, as compact tiles: press one to start timing it (or to stop it if
 * it's running), with a goal meter on the ones that have a goal. Edit mode swaps the grid for
 * a console list of editors.
 */
export function ActivitiesPanel({ running }: { running: RunningTimer | null }) {
  const activities = useActivities()
  const [editing, setEditing] = useState(false)
  const stats = useActivityStats(activities?.active ?? [], running)

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

      {editing ? (
        <div className="editor-list">
          {active.length > 0 && (
            <div className="editor-head" aria-hidden="true">
              <span>activity</span>
              <span>color</span>
              <span>goal</span>
            </div>
          )}
          <ul className="editor-rows">
            {active.map((activity) => (
              <li key={activity.id}>
                <ActivityEditor activity={activity} />
              </li>
            ))}
          </ul>
          <NewActivity usedColors={active.map((a) => a.color)} />
        </div>
      ) : (
        <ul className="activity-grid">
          {active.map((activity) => (
            <li key={activity.id}>
              <ActivityTile
                activity={activity}
                stats={stats.get(activity.id)}
                runningSince={
                  running?.activity.id === activity.id ? running.session.start : undefined
                }
              />
            </li>
          ))}
          <li>
            <NewActivity usedColors={active.map((a) => a.color)} />
          </li>
        </ul>
      )}

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
