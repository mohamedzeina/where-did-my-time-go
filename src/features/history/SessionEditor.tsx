import { useId, useState, type FormEvent } from 'react'
import { addSession, deleteSession, updateSession } from '../../db/sessions'
import type { Activity, Session } from '../../db/types'
import {
  fromDateTimeInputs,
  sessionTimesFromInputs,
  toDateInput,
  toTimeInput,
} from '../../lib/ranges'
import { errorMessage } from '../activities/useActivities'

interface SessionEditorProps {
  /** The session to edit; leave out to add a new one. */
  session?: Session
  /** Every activity, archived included (a session may belong to an archived one). */
  activities: Activity[]
  onDone: () => void
}

const FIVE_MIN = 5 * 60_000

/** A new entry defaults to the half hour that just ended, on five-minute marks. */
function defaultTimes() {
  const end = Math.floor(Date.now() / FIVE_MIN) * FIVE_MIN
  return { start: end - 6 * FIVE_MIN, end }
}

/**
 * Add or edit a session: activity, date, start and end times (to the second), and a note.
 * An end time before the start is read as the next day. A running session has no end to edit.
 */
export function SessionEditor({ session, activities, onDone }: SessionEditorProps) {
  const id = useId()
  const initial = session ?? { ...defaultTimes(), activityId: '', note: '' }
  const running = session?.end === null

  const selectable = activities.filter((a) => !a.archived || a.id === session?.activityId)
  const [activityId, setActivityId] = useState(initial.activityId || selectable[0]?.id || '')
  const [date, setDate] = useState(toDateInput(initial.start))
  const [startTime, setStartTime] = useState(toTimeInput(initial.start))
  const [endTime, setEndTime] = useState(initial.end === null ? '' : toTimeInput(initial.end))
  const [note, setNote] = useState(initial.note)
  const [error, setError] = useState<string>()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const crossesMidnight = Boolean(
    !running &&
    date &&
    startTime &&
    endTime &&
    sessionTimesFromInputs(date, startTime, endTime).crossesMidnight,
  )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      if (!date || !startTime || (!running && !endTime))
        throw new Error('Fill in the date and times.')
      if (running) {
        const start = fromDateTimeInputs(date, startTime)
        if (start > Date.now()) throw new Error("A running session can't start in the future.")
        await updateSession(session!.id, { activityId, start, note })
      } else {
        const { start, end } = sessionTimesFromInputs(date, startTime, endTime)
        if (end > Date.now()) throw new Error("A session can't end in the future.")
        if (session) await updateSession(session.id, { activityId, start, end, note })
        else await addSession({ activityId, start, end, note })
      }
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (selectable.length === 0) {
    return (
      <div className="editor">
        <p className="editor-error">Add an activity on the Timer view first.</p>
        <div className="editor-actions">
          <button type="button" className="text-button" onClick={onDone}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="editor"
      aria-label={session ? 'Edit session' : 'Add session'}
      onSubmit={submit}
      onKeyDown={(event) => event.key === 'Escape' && onDone()}
    >
      <div className="editor-fields">
        <label className="field">
          <span className="field-label">Activity</span>
          <select
            className="input"
            value={activityId}
            autoFocus
            onChange={(event) => setActivityId(event.target.value)}
          >
            {selectable.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
                {activity.archived ? ' (archived)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Date</span>
          <input
            className="input"
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">Start</span>
          <input
            className="input"
            type="time"
            step={1}
            value={startTime}
            required
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        {running ? (
          <p className="field">
            <span className="field-label">End</span>
            <span className="editor-running">still running</span>
          </p>
        ) : (
          <label className="field">
            <span className="field-label">
              End{crossesMidnight && <span className="field-hint"> next day</span>}
            </span>
            <input
              className="input"
              type="time"
              step={1}
              value={endTime}
              required
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>
        )}
        <label className="field field-wide">
          <span className="field-label">Note</span>
          <input
            className="input"
            value={note}
            placeholder="Optional"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </div>

      {error && (
        <p className="editor-error" role="alert" id={`${id}-error`}>
          {error}
        </p>
      )}

      {confirmingDelete ? (
        <div className="editor-actions">
          <span className="editor-confirm" role="alert">
            Delete this session? This can&rsquo;t be undone.
          </span>
          <button
            type="button"
            className="text-button is-danger"
            onClick={() => void deleteSession(session!.id).then(onDone)}
          >
            Delete
          </button>
          <button
            type="button"
            className="text-button"
            autoFocus
            onClick={() => setConfirmingDelete(false)}
          >
            Keep
          </button>
        </div>
      ) : (
        <div className="editor-actions">
          <button type="submit" className="text-button is-primary">
            {session ? 'Save changes' : 'Add session'}
          </button>
          <button type="button" className="text-button" onClick={onDone}>
            Cancel
          </button>
          {session && (
            <button
              type="button"
              className="text-button editor-delete"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete session
            </button>
          )}
        </div>
      )}
    </form>
  )
}
