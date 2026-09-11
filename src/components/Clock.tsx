import './Clock.css'

interface ClockProps {
  /** Preformatted time, e.g. `1:04:09`. */
  value: string
  idle?: boolean
}

/** Large seven-segment elapsed-time readout. Each digit gets its own cell for the unlit segments. */
export function Clock({ value, idle = false }: ClockProps) {
  return (
    <p className={idle ? 'clock is-idle' : 'clock'}>
      <span className="visually-hidden">{value}</span>
      <span aria-hidden="true">
        {[...value].map((char, i) => (
          <span key={i} className={char === ':' ? 'clock-sep' : 'clock-digit'}>
            {char}
          </span>
        ))}
      </span>
    </p>
  )
}
