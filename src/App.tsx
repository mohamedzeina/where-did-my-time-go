import { useEffect, useRef, type ComponentType } from 'react'
import { DayRibbon } from './app/DayRibbon'
import { DocumentTitle } from './app/DocumentTitle'
import { useNotice } from './app/notice'
import { StatusBar } from './app/StatusBar'
import { useRoute, useRouteShortcuts, type Route } from './app/useRoute'
import { DataView } from './features/data/DataView'
import { HistoryView } from './features/history/HistoryView'
import { InsightsView } from './features/insights/InsightsView'
import { AwayPrompt } from './features/timer/AwayPrompt'
import { TimerView } from './features/timer/TimerView'
import { useAwayWatch } from './features/timer/useAwayWatch'
import { useLimitWatch } from './features/timer/useLimitWatch'
import { useLongTimerReminder } from './features/timer/useLongTimerReminder'
import { useTimerShortcut } from './features/timer/useTimerShortcut'
import './App.css'

const NAV: { route: Route; label: string; view: ComponentType }[] = [
  { route: 'timer', label: 'Timer', view: TimerView },
  { route: 'history', label: 'History', view: HistoryView },
  { route: 'insights', label: 'Insights', view: InsightsView },
  { route: 'data', label: 'Data', view: DataView },
]

function App() {
  const route = useRoute()
  const current = NAV.find((item) => item.route === route) ?? NAV[0]
  const View = current.view

  useRouteShortcuts()
  const away = useAwayWatch()
  useLongTimerReminder()
  useLimitWatch()
  useTimerShortcut(!away.gap)
  const notice = useNotice()

  // After switching views, start at the top and move focus to the new view's heading, so
  // keyboard and screen reader users land where the page changed.
  const main = useRef<HTMLElement>(null)
  const firstRoute = useRef(true)
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    if (main.current) main.current.scrollTop = 0
    document.getElementById('view-title')?.focus()
  }, [route])

  return (
    <div className="shell">
      <DocumentTitle viewLabel={current.label} />
      <div className="shell-ribbon">
        <DayRibbon />
      </div>

      <a className="shell-brand" href="#/timer">
        where did my time go?
        <span className="shell-cursor" aria-hidden="true" />
      </a>

      <nav className="shell-nav" aria-label="Main">
        <ul>
          {NAV.map((item, index) => (
            <li key={item.route}>
              <a
                href={`#/${item.route}`}
                aria-current={item.route === route ? 'page' : undefined}
                aria-keyshortcuts={String(index + 1)}
              >
                {item.label}
                <kbd className="shell-key" aria-hidden="true">
                  {index + 1}
                </kbd>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shell-stage">
        <AwayPrompt watch={away} />
        <main className="shell-main" ref={main}>
          <View />
        </main>
        <StatusBar />
      </div>

      {/* Always mounted, so screen readers announce each new message. */}
      <p className="notice" role="status" data-visible={notice ? true : undefined}>
        {notice}
      </p>
    </div>
  )
}

export default App
