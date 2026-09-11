import { useEffect } from 'react'
import { toggleTimer } from './toggleTimer'

/** Anything where Space already means something: typing, or pressing the focused control. */
const INTERACTIVE =
  'input, textarea, select, button, a[href], summary, [contenteditable], [role="button"]'

/** Space starts or stops the timer from anywhere in the app, unless it's needed elsewhere. */
export function useTimerShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.defaultPrevented) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return
      event.preventDefault()
      void toggleTimer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
