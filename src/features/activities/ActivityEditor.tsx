import { useEffect, useState, type CSSProperties } from 'react'
import { ColorSwatches } from '../../components/ColorSwatches'
import { Segmented } from '../../components/Segmented'
import { GOAL_STEP_MS, updateActivity, type ActivityChanges } from '../../db/activities'
import type { Activity, Goal } from '../../db/types'
import { notificationPermission, requestNotificationPermission } from '../../lib/notify'
import { errorMessage } from './useActivities'

const HOUR = 3_600_000

/**
 * The notification permission, kept current: it can be changed in the browser's settings
 * while the app is open, and coming back to the app is when that would have happened.
 */
function useNotificationPermission() {
  const [permission, setPermission] = useState(notificationPermission)

  useEffect(() => {
    const refresh = () => setPermission(notificationPermission())
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const request = async () => {
    await requestNotificationPermission()
    setPermission(notificationPermission())
  }

  return { permission, request }
}

/**
 * One row of the edit console: name, color, goal and archive, in columns that line up with
 * every other row. Changes save as you make them.
 */
export function ActivityEditor({ activity }: { activity: Activity }) {
  const [name, setName] = useState(activity.name)
  const [error, setError] = useState<string>()
  const notifications = useNotificationPermission()
  // A limit can only reach you out of sight through a desktop notification, so say when it can't.
  const alertsMissing =
    activity.goal?.kind === 'limit' &&
    (notifications.permission === 'default' || notifications.permission === 'denied')

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
      <GoalField
        activity={activity}
        onSave={(goal) => void save({ goal })}
        onInvalid={setError}
        onLimitChosen={() => {
          // Choosing max is a click, and a click is the only time a browser lets us ask.
          if (notifications.permission === 'default') void notifications.request()
        }}
      />
      <button
        type="button"
        className="text-button"
        aria-label={`Archive ${activity.name}`}
        onClick={() => void save({ archived: true })}
      >
        Archive
      </button>
      {alertsMissing && (
        <p className="editor-hint">
          {notifications.permission === 'denied' ? (
            <>
              Desktop alerts are blocked, so crossing this limit only shows while you&rsquo;re
              looking at the app. Allow notifications for this site in your browser settings.
            </>
          ) : (
            <>
              Crossing this limit can alert you on the desktop when the app is out of sight.
              <button
                type="button"
                className="text-button"
                onClick={() => void notifications.request()}
              >
                Allow desktop alerts
              </button>
            </>
          )}
        </p>
      )}
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const KINDS = [
  { value: 'target', label: 'min' },
  { value: 'limit', label: 'max' },
] as const

const PERIODS = [
  { value: 'day', label: 'day' },
  { value: 'week', label: 'week' },
] as const

type Kind = NonNullable<Goal['kind']>

/**
 * "min | max [ 4 h ] day | week": at least or at most, how many hours, and per what. Hours
 * accept decimals (1.5 or 1,5). Empty or 0 clears the goal. Saves on blur, Enter, or
 * switching either toggle.
 */
function GoalField({
  activity,
  onSave,
  onInvalid,
  onLimitChosen,
}: {
  activity: Activity
  onSave: (goal: Goal | null) => void
  onInvalid: (message: string) => void
  onLimitChosen: () => void
}) {
  const [hours, setHours] = useState(
    activity.goal ? String(Math.round((activity.goal.ms / HOUR) * 100) / 100) : '',
  )
  const [kind, setKind] = useState<Kind>(activity.goal?.kind ?? 'target')
  const [period, setPeriod] = useState<Goal['period']>(activity.goal?.period ?? 'day')

  const commit = (value: string, next: { kind: Kind; period: Goal['period'] }) => {
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
    // Whole minutes, as stored, so an unchanged amount is recognised as unchanged.
    const ms = Math.max(GOAL_STEP_MS, Math.round((amount * HOUR) / GOAL_STEP_MS) * GOAL_STEP_MS)
    const current = activity.goal
    if (
      current?.ms === ms &&
      current.period === next.period &&
      (current.kind ?? 'target') === next.kind
    ) {
      return
    }
    onSave({ kind: next.kind, period: next.period, ms })
  }

  return (
    <div className="goal-field">
      <Segmented
        name={`goal-kind-${activity.id}`}
        label={`Goal or limit for ${activity.name}`}
        options={KINDS}
        value={kind}
        onChange={(next) => {
          setKind(next)
          if (next === 'limit') onLimitChosen()
          if (hours.trim()) commit(hours, { kind: next, period })
        }}
      />
      <label className="goal-amount">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="–"
          value={hours}
          aria-label={`Goal hours for ${activity.name}`}
          onChange={(event) => setHours(event.target.value)}
          onBlur={() => commit(hours, { kind, period })}
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
          if (hours.trim()) commit(hours, { kind, period: next })
        }}
      />
    </div>
  )
}
