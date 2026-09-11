import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'

/**
 * `useLiveQuery` that keeps showing the previous result while a new one loads (say, after a
 * filter change), so charts hold their frame instead of flashing empty. `stale` is true
 * during that gap.
 */
export function useStableLiveQuery<T>(
  query: () => Promise<T>,
  deps: unknown[],
): { data: T | undefined; stale: boolean } {
  const result = useLiveQuery(query, deps)
  const [last, setLast] = useState<T>()
  // Remembering the latest result during render is React's pattern for state derived from
  // changing inputs; it re-renders once, before anything is painted.
  if (result !== undefined && result !== last) setLast(result)
  return { data: result ?? last, stale: result === undefined && last !== undefined }
}
