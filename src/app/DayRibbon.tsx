import type { CSSProperties } from 'react'
import { useToday } from '../features/today/useToday'
import { dayProgress, formatClock } from '../lib/day'
import { clipSession, formatHoursMinutes } from '../lib/totals'
import { useNow } from '../lib/useNow'
import './DayRibbon.css'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Today as a 24-hour ribbon: the part of the day already gone is shaded, tracked sessions are
 * bands in their activity's color, and a line marks now. Untracked shading is, quite
 * literally, where the time went.
 */
export function DayRibbon() {
  const now = useNow(15_000)
  const today = useToday(now.getTime())
  const progress = dayProgress(now)
  const clock = formatClock(now)

  const bands = (today?.sessions ?? []).flatMap((session) => {
    const part = clipSession(session, today!.from, today!.to, now.getTime())
    if (!part) return []
    const activity = today!.activities.get(session.activityId)
    return [
      {
        id: session.id,
        from: (part.start - today!.from) / DAY_MS,
        to: (part.end - today!.from) / DAY_MS,
        color: activity?.color,
        label: `${activity?.name ?? 'Deleted activity'}, ${formatClock(new Date(part.start))}–${
          session.end === null ? 'now' : formatClock(new Date(part.end))
        }`,
      },
    ]
  })
  const tracked = bands.reduce((sum, band) => sum + (band.to - band.from) * DAY_MS, 0)

  return (
    <div
      className={progress > 0.9 ? 'ribbon is-late' : 'ribbon'}
      role="img"
      aria-label={`Today at ${clock}. ${Math.round(progress * 100)}% of the day has passed, ${formatHoursMinutes(tracked)} tracked.`}
      style={{ '--progress': progress } as CSSProperties}
    >
      <div className="ribbon-sky" />
      <div className="ribbon-track">
        <div className="ribbon-spent" />
        {HOURS.map((hour) => (
          <span
            key={hour}
            className={hour % 3 === 0 ? 'ribbon-hour is-labelled' : 'ribbon-hour'}
            data-major={hour % 6 === 0 || undefined}
            style={{ '--at': hour / 24 } as CSSProperties}
          >
            {hour % 3 === 0 && (
              <span className="ribbon-hour-label">{String(hour).padStart(2, '0')}</span>
            )}
          </span>
        ))}
        {bands.map((band) => (
          <span
            key={band.id}
            className="ribbon-band"
            title={band.label}
            style={
              {
                '--from': band.from,
                '--to': band.to,
                '--band-color': band.color,
              } as CSSProperties
            }
          />
        ))}
        <div className="ribbon-now">
          <span className="ribbon-now-label">{clock}</span>
        </div>
      </div>
    </div>
  )
}
