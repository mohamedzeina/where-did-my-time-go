import { useEffect, type ComponentType } from 'react'
import { DayRibbon } from './app/DayRibbon'
import { StatusBar } from './app/StatusBar'
import { useRoute, useRouteShortcuts, type Route } from './app/useRoute'
import { HistoryView } from './features/history/HistoryView'
import { InsightsView } from './features/insights/InsightsView'
import { TimerView } from './features/timer/TimerView'
import './App.css'

const NAV: { route: Route; label: string; view: ComponentType }[] = [
  { route: 'timer', label: 'Timer', view: TimerView },
  { route: 'history', label: 'History', view: HistoryView },
  { route: 'insights', label: 'Insights', view: InsightsView },
]

function App() {
  const route = useRoute()
  const current = NAV.find((item) => item.route === route) ?? NAV[0]
  const View = current.view

  useRouteShortcuts()

  useEffect(() => {
    document.title = `${current.label} | where did my time go?`
  }, [current.label])

  return (
    <div className="shell">
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
        <main className="shell-main">
          <View />
        </main>
        <StatusBar />
      </div>
    </div>
  )
}

export default App
