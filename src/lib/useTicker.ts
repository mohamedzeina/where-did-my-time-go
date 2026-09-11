import { useEffect, useState } from 'react'

/**
 * The current time, re-rendering on each whole second counted from `alignTo`. Everything
 * that shows a running timer uses the same `alignTo` (the session's start), so the clock,
 * tab title, tiles and totals all change on the same tick. With nothing to align to it
 * refreshes every `idleMs` instead, or not at all when `idleMs` is `null`.
 */
export function useTicker(alignTo: number | undefined, idleMs: number | null = 15_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (alignTo === undefined && idleMs === null) return
    let timeout: ReturnType<typeof setTimeout>
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const delay =
        alignTo === undefined
          ? idleMs!
          : // Just past the next whole second since `alignTo`, so the new second has begun.
            1000 - ((((t - alignTo) % 1000) + 1000) % 1000) + 5
      timeout = setTimeout(tick, delay)
    }
    tick()
    return () => clearTimeout(timeout)
  }, [alignTo, idleMs])

  return now
}
