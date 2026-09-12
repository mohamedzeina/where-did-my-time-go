import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { listActivities } from '../../db/activities'
import {
  clearAllData,
  countData,
  exportData,
  parseBackup,
  restoreData,
  type Backup,
} from '../../db/backup'
import { listSessions } from '../../db/sessions'
import { sessionsToCsv } from '../../lib/csv'
import { downloadFile } from '../../lib/download'
import { idlePermission, idleSupported, requestIdlePermission } from '../../lib/idle'
import { awayWatchEnabled, setAwayWatchEnabled } from '../../lib/presence'
import { toDateInput } from '../../lib/ranges'
import { errorMessage } from '../activities/useActivities'
import '../views.css'
import './data.css'

const LAST_BACKUP_KEY = 'wdmtg:last-backup'

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function readLastBackup(): number | undefined {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY))
    return value > 0 ? value : undefined
  } catch {
    return undefined
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const activityCount = (n: number) => (n === 1 ? '1 activity' : `${n} activities`)

/** Whether the browser has promised not to clear this site's storage on its own. */
function useStoragePersistence() {
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.storage?.persist)
  const [persisted, setPersisted] = useState<boolean>()

  useEffect(() => {
    if (supported) void navigator.storage.persisted().then(setPersisted)
  }, [supported])

  const request = async () => setPersisted(await navigator.storage.persist())
  return { supported, persisted, request }
}

/**
 * Whether the app may watch the machine for idleness. It needs a browser permission, which
 * Chromium only grants from a click, so this is a button rather than a setting that just
 * flips. Switching it off keeps the permission but stops using it.
 */
function useAwayDetection() {
  const supported = idleSupported()
  const [enabled, setEnabled] = useState(() => supported && awayWatchEnabled())
  const [blocked, setBlocked] = useState(false)

  // A permission revoked in browser settings leaves the switch on but useless; catch that on
  // load so what's on screen matches what will actually happen.
  useEffect(() => {
    if (!supported) return
    void idlePermission().then((state) => setBlocked(state === 'denied'))
  }, [supported])

  const toggle = async () => {
    if (enabled) {
      setAwayWatchEnabled(false)
      setEnabled(false)
      return
    }
    const granted = await requestIdlePermission()
    setBlocked(!granted)
    setAwayWatchEnabled(granted)
    setEnabled(granted)
  }

  return { supported, enabled, blocked, toggle }
}

/** Back up, restore, export and delete: everything the app stores lives in this browser. */
export function DataView() {
  const counts = useLiveQuery(countData, [])
  const [lastBackup, setLastBackup] = useState(readLastBackup)
  const [pending, setPending] = useState<Backup>()
  const [message, setMessage] = useState<{ text: string; error?: boolean }>()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const storage = useStoragePersistence()
  const away = useAwayDetection()

  const downloadBackup = async () => {
    const backup = await exportData()
    downloadFile(
      `where-did-my-time-go-backup-${toDateInput(backup.exportedAt)}.json`,
      JSON.stringify(backup, null, 2),
      'application/json',
    )
    try {
      localStorage.setItem(LAST_BACKUP_KEY, String(backup.exportedAt))
    } catch {
      // Storage unavailable; the backup itself still downloaded.
    }
    setLastBackup(backup.exportedAt)
    setMessage({ text: 'Backup downloaded.' })
  }

  const downloadCsv = async () => {
    const [sessions, activities] = await Promise.all([
      listSessions({ from: 0, to: Infinity }),
      listActivities({ includeArchived: true }),
    ])
    downloadFile(
      `where-did-my-time-go-sessions-${toDateInput(Date.now())}.csv`,
      sessionsToCsv(sessions, new Map(activities.map((a) => [a.id, a]))),
      'text/csv;charset=utf-8',
    )
    setMessage({ text: `Exported ${plural(sessions.length, 'session')}.` })
  }

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setConfirmingDelete(false)
    try {
      let json: unknown
      try {
        json = JSON.parse(await file.text())
      } catch {
        throw new Error(`${file.name} isn't a backup file (it isn't valid JSON).`)
      }
      setPending(parseBackup(json))
      setMessage(undefined)
    } catch (e) {
      setPending(undefined)
      setMessage({ text: errorMessage(e), error: true })
    }
  }

  const restore = async () => {
    if (!pending) return
    await restoreData(pending)
    setMessage({
      text: `Restored ${activityCount(pending.activities.length)} and ${plural(pending.sessions.length, 'session')}.`,
    })
    setPending(undefined)
  }

  const deleteEverything = async () => {
    await clearAllData()
    setConfirmingDelete(false)
    setMessage({ text: 'All data deleted.' })
  }

  const here = counts
    ? `${activityCount(counts.activities)} and ${plural(counts.sessions, 'session')}`
    : '…'

  return (
    <section className="view view-data" aria-labelledby="view-title">
      <h1 id="view-title" tabIndex={-1} className="view-title">
        Data
      </h1>
      <p className="view-lede">
        Everything lives in this browser: {here}. Nothing is sent anywhere, so a backup file is your
        only copy elsewhere.
      </p>

      {message && (
        <p className={message.error ? 'data-message is-error' : 'data-message'} role="status">
          {message.text}
        </p>
      )}

      <div className="data-rows">
        <section className="data-row" aria-labelledby="backup-title">
          <div className="data-text">
            <h2 id="backup-title" className="data-title">
              Back up
            </h2>
            <p>Download everything as a file you can restore later, here or in another browser.</p>
            <p className="data-meta">
              Last backup: {lastBackup ? dateTime.format(lastBackup) : 'never'}
            </p>
          </div>
          <button
            type="button"
            className="text-button is-primary"
            onClick={() => void downloadBackup()}
          >
            Download backup
          </button>
        </section>

        {storage.supported && (
          <section className="data-row" aria-labelledby="storage-title">
            <div className="data-text">
              <h2 id="storage-title" className="data-title">
                Storage
              </h2>
              <p className="data-meta">
                <span
                  className={storage.persisted ? 'data-dot is-safe' : 'data-dot'}
                  aria-hidden="true"
                />
                {storage.persisted === undefined
                  ? 'Checking…'
                  : storage.persisted
                    ? 'Protected: the browser won’t clear this data on its own.'
                    : 'Not protected: the browser may clear this data if space runs low.'}
              </p>
            </div>
            {storage.persisted === false && (
              <button type="button" className="text-button" onClick={() => void storage.request()}>
                Protect storage
              </button>
            )}
          </section>
        )}

        {away.supported && (
          <section className="data-row" aria-labelledby="away-title">
            <div className="data-text">
              <h2 id="away-title" className="data-title">
                Away detection
              </h2>
              <p>
                Notice when you leave the PC with a timer running, so an afternoon away
                doesn&rsquo;t land in your history as work. Time the app spends closed or asleep is
                always noticed; this adds the case where you walk away and everything stays on.
              </p>
              <p className="data-meta">
                <span
                  className={away.enabled ? 'data-dot is-safe' : 'data-dot'}
                  aria-hidden="true"
                />
                {away.blocked
                  ? 'Blocked: allow idle detection for this site in your browser settings.'
                  : away.enabled
                    ? 'On: the app checks whether this PC is idle or locked.'
                    : 'Off: only time with the app closed is noticed.'}
              </p>
            </div>
            <button
              type="button"
              className="text-button"
              aria-pressed={away.enabled}
              onClick={() => void away.toggle()}
            >
              {away.enabled ? 'Turn off' : 'Turn on'}
            </button>
          </section>
        )}

        <section className="data-row" aria-labelledby="restore-title">
          <div className="data-text">
            <h2 id="restore-title" className="data-title">
              Restore
            </h2>
            <p>Load a backup file. You&rsquo;ll see what&rsquo;s in it before anything changes.</p>
          </div>
          <button type="button" className="text-button" onClick={() => fileInput.current?.click()}>
            Choose backup file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="visually-hidden"
            tabIndex={-1}
            aria-label="Backup file"
            onChange={(event) => void chooseFile(event)}
          />
          {pending && (
            <div className="data-confirm" role="alert">
              <p>
                This backup from {dateTime.format(pending.exportedAt)} has{' '}
                {activityCount(pending.activities.length)} and{' '}
                {plural(pending.sessions.length, 'session')}. Restoring replaces everything here (
                {here}).
              </p>
              <div className="data-actions">
                <button
                  type="button"
                  className="text-button is-danger"
                  onClick={() => void restore()}
                >
                  Replace my data
                </button>
                <button
                  type="button"
                  className="text-button"
                  autoFocus
                  onClick={() => setPending(undefined)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="data-row" aria-labelledby="csv-title">
          <div className="data-text">
            <h2 id="csv-title" className="data-title">
              Export sessions
            </h2>
            <p>Every session as a CSV file, for spreadsheets. This can&rsquo;t be restored.</p>
          </div>
          <button type="button" className="text-button" onClick={() => void downloadCsv()}>
            Download CSV
          </button>
        </section>

        <section className="data-row" aria-labelledby="delete-title">
          <div className="data-text">
            <h2 id="delete-title" className="data-title">
              Delete everything
            </h2>
            <p>Remove every activity and session from this browser.</p>
          </div>
          {!confirmingDelete && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setPending(undefined)
                setConfirmingDelete(true)
              }}
            >
              Delete all data
            </button>
          )}
          {confirmingDelete && (
            <div className="data-confirm" role="alert">
              <p>
                Delete {here}? This can&rsquo;t be undone. Download a backup first if you might want
                them back.
              </p>
              <div className="data-actions">
                <button
                  type="button"
                  className="text-button is-danger"
                  onClick={() => void deleteEverything()}
                >
                  Delete everything
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
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
