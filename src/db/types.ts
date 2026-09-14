/** Something you spend time on, e.g. "Deep work" or "Gym". */
export interface Activity {
  id: string
  name: string
  /** Hex color used for its bands and charts, e.g. `#ffb23e`. */
  color: string
  /** Archived activities are hidden from pickers but keep their history. */
  archived: boolean
  /** Epoch milliseconds. */
  createdAt: number
  /** How much time you aim to spend on it each day or week, if anything. */
  goal?: Goal
}

/** A time rule per calendar day, or per week starting Monday: at least, or at most. */
export interface Goal {
  /** `limit` means at most. Left out it's a target, at least, like every goal before limits. */
  kind?: 'target' | 'limit'
  period: 'day' | 'week'
  /** Target in milliseconds, more than 0 and no more than the period's length. */
  ms: number
}

/** One stretch of time spent on an activity. */
export interface Session {
  id: string
  activityId: string
  /** Epoch milliseconds. */
  start: number
  /** Epoch milliseconds, or `null` while the timer is still running. */
  end: number | null
  note: string
  /** Lowercase, without the `#`, no duplicates. See `normalizeTags`. */
  tags: string[]
}
