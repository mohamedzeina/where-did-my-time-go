import { announce } from '../../app/notice'
import { formatClock } from '../../lib/day'
import { formatDuration } from '../../lib/duration'
import { appHasAttention, notify } from '../../lib/notify'

/**
 * Says that a timer is still running, in whichever way you'll actually notice.
 *
 * With the app in front of you there's a giant clock already saying it, so a desktop
 * notification would be noise: the quiet in-app notice is enough. When the window is behind
 * something else or minimised — which is exactly how a timer gets forgotten — it takes the
 * desktop notification instead.
 */
export function deliverReminder(activityName: string, start: number, now = Date.now()): void {
  const elapsed = formatDuration(now - start, { alwaysHours: true })

  if (appHasAttention()) {
    announce(`Still tracking ${activityName} — ${elapsed}.`, 8000)
    return
  }
  void notify(
    `Still tracking ${activityName} — ${elapsed}`,
    `Running since ${formatClock(new Date(start))}. Stop it if you're done.`,
  )
}
