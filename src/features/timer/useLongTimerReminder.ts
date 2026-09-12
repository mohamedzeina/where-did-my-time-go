import { useEffect, useSyncExternalStore } from 'react'
import { nextReminderAt, reminderEvery, subscribeReminders } from '../../lib/reminders'
import { deliverReminder } from './reminder'
import { useRunningTimer } from './useRunningTimer'

/**
 * Taps you on the shoulder while a timer is still running, so a forgotten one costs a click
 * rather than an edit in History afterwards. Off until you pick an interval in the Data view.
 */
export function useLongTimerReminder(): void {
  const running = useRunningTimer()
  const every = useSyncExternalStore(subscribeReminders, reminderEvery)

  const start = running?.session.start
  const name = running?.activity.name

  useEffect(() => {
    if (start === undefined || name === undefined || !every) return

    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      const due = nextReminderAt(start, every, Date.now())
      if (due === undefined) return
      timeout = setTimeout(
        () => {
          deliverReminder(name, start)
          schedule()
        },
        Math.max(0, due - Date.now()),
      )
    }

    schedule()
    return () => clearTimeout(timeout)
  }, [start, name, every])
}
