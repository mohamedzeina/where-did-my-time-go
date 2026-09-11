import type { CSSProperties } from 'react'
import { dayProgress, formatClock } from '../lib/day'
import { useNow } from '../lib/useNow'
import './DayRibbon.css'

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

/**
 * Today as a 24-hour ribbon: the part of the day already gone is shaded, and a line marks now.
 * Tracked sessions will be drawn into it as colored bands.
 */
export function DayRibbon() {
  const now = useNow(15_000)
  const progress = dayProgress(now)
  const clock = formatClock(now)

  return (
    <div
      className={['ribbon', progress < 0.06 && 'is-early', progress > 0.9 && 'is-late']
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-label={`Today at ${clock}. ${Math.round(progress * 100)}% of the day has passed.`}
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
        <div className="ribbon-now">
          <span className="ribbon-now-label">{clock}</span>
        </div>
      </div>
    </div>
  )
}
