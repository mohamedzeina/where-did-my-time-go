import { ActivitiesPanel } from '../activities/ActivitiesPanel'
import { TodayPanel } from '../today/TodayPanel'
import { TimerReadout } from './TimerReadout'
import { useRunningTimer } from './useRunningTimer'
import '../views.css'
import './timer.css'

export function TimerView() {
  const running = useRunningTimer()

  return (
    <section className="view view-timer" aria-labelledby="view-title">
      <h1 id="view-title" className="visually-hidden">
        Timer
      </h1>
      {running !== undefined && <TimerReadout running={running} />}
      <ActivitiesPanel running={running ?? null} />
      <TodayPanel />
    </section>
  )
}
