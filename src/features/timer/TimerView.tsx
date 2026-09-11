import { Clock } from '../../components/Clock'
import { formatDuration } from '../../lib/duration'
import '../views.css'

export function TimerView() {
  return (
    <section className="view view-timer" aria-labelledby="view-title">
      <h1 id="view-title" className="visually-hidden">
        Timer
      </h1>
      <div className="readout">
        <p className="readout-status">
          <span className="readout-dot" aria-hidden="true" />
          idle
        </p>
        <div className="readout-frame">
          <Clock value={formatDuration(0)} idle />
        </div>
      </div>
      <p className="view-lede">No timer running. Start one to see where your time goes.</p>
    </section>
  )
}
