import { useEffect, useState } from 'react'

export const ROUTES = ['timer', 'history', 'insights', 'data'] as const
export type Route = (typeof ROUTES)[number]

function readRoute(): Route {
  const name = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'timer'
}

/** The current view, taken from the URL hash (`#/history`) so reloads and back/forward work. */
export function useRoute(): Route {
  const [route, setRoute] = useState(readRoute)

  useEffect(() => {
    const onChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

/** Number keys 1, 2, 3… jump to the matching view, unless the user is typing somewhere. */
export function useRouteShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable]')
      ) {
        return
      }
      const route = ROUTES[Number(event.key) - 1]
      if (route) window.location.hash = `#/${route}`
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
