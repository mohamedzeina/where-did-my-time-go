import { useEffect } from 'react'
import { useElapsed, useRunningTimer } from '../features/timer/useRunningTimer'
import { formatDuration } from '../lib/duration'

/**
 * Keeps the browser tab title current: the running time and activity while recording (so it
 * reads at a glance from other tabs), otherwise the current view. Renders nothing, so its
 * once-a-second updates don't re-render the rest of the app.
 */
export function DocumentTitle({ viewLabel }: { viewLabel: string }) {
  const running = useRunningTimer()
  const elapsed = useElapsed(running?.session.start)
  const title = running
    ? `${formatDuration(elapsed)} · ${running.activity.name}`
    : `${viewLabel} | where did my time go?`

  useEffect(() => {
    document.title = title
  }, [title])

  return null
}
