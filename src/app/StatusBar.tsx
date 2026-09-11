import { dayOfYear, dayProgress, daysInYear, formatClock, formatUtcOffset } from '../lib/day'
import { useNow } from '../lib/useNow'
import './StatusBar.css'

/** Live readout of the day along the bottom of the app. */
export function StatusBar() {
  const now = useNow(1000)

  return (
    <footer className="status-bar">
      <span className="status-clock">{formatClock(now, true)}</span>
      <span>
        day {dayOfYear(now)}/{daysInYear(now.getFullYear())}
      </span>
      <span>{(dayProgress(now) * 100).toFixed(1)}% of today gone</span>
      <span className="status-extra">{formatUtcOffset(now)}</span>
      <span className="status-extra status-storage">saved on this device</span>
    </footer>
  )
}
