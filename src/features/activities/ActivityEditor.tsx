import { useState, type CSSProperties } from 'react'
import { ColorSwatches } from '../../components/ColorSwatches'
import { Segmented } from '../../components/Segmented'
import { updateActivity, type ActivityChanges } from '../../db/activities'
import type { Activity, Goal } from '../../db/types'
import { errorMessage } from './useActivities'

const HOUR = 3_600_000

/**
 * One row of the edit console: name, color, goal and archive, in columns that line up with
 * every other row. Changes save as you make them.
 */
export function ActivityEditor({ activity }: { activity: Activity }) {
  const [name, setName] = useState(activity.name)
  const [error, setError] = useState<string>()

  const save = async (changes: ActivityChanges) => {
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
    <div className="editor-row" style={{ '--tile-color': activity.color } as CSSProperties}>
      <input
        className="editor-name"
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
      <GoalField activity={activity} onSave={(goal) => void save({ goal })} onInvalid={setError} />
      <button
        type="button"
        className="text-button"
        aria-label={`Archive ${activity.name}`}
        onClick={() => void save({ archived: true })}
      >
        Archive
      </button>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const PERIODS = [
  { value: 'day', label: 'day' },
  { value: 'week', label: 'week' },
] as const

/**
 * "[ 4 h ] day | week". Hours accept decimals (1.5 or 1,5). Empty or 0 clears the goal.
 * Saves on blur, Enter, or switching the period.
 */
function GoalField({
  activity,
  onSave,
  onInvalid,
}: {
  activity: Activity
  onSave: (goal: Goal | null) => void
  onInvalid: (message: string) => void
}) {
  const [hours, setHours] = useState(
    activity.goal ? String(Math.round((activity.goal.ms / HOUR) * 100) / 100) : '',
  )
  const [period, setPeriod] = useState<Goal['period']>(activity.goal?.period ?? 'day')

  const commit = (value: string, nextPeriod: Goal['period']) => {
    const text = value.trim().replace(',', '.')
    const amount = Number(text)
    if (text === '' || amount === 0) {
      if (activity.goal) onSave(null)
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      onInvalid('Enter the goal in hours, like 2 or 1.5.')
      return
    }
    const ms = Math.round(amount * HOUR)
    if (activity.goal?.ms === ms && activity.goal.period === nextPeriod) return
    onSave({ period: nextPeriod, ms })
  }

  return (
    <div className="goal-field">
      <label className="goal-amount">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="–"
          value={hours}
          aria-label={`Goal hours for ${activity.name}`}
          onChange={(event) => setHours(event.target.value)}
          onBlur={() => commit(hours, period)}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
        <span aria-hidden="true">h</span>
      </label>
      <Segmented
        name={`goal-period-${activity.id}`}
        label={`Goal period for ${activity.name}`}
        options={PERIODS}
        value={period}
        onChange={(next) => {
          setPeriod(next)
          if (hours.trim()) commit(hours, next)
        }}
      />
    </div>
  )
}
