import { announce } from '../../app/notice'
import type { Goal } from '../../db/types'
import { formatAmount } from '../../lib/goals'
import { appHasAttention, notify } from '../../lib/notify'

/** Its own tag, so the next reminder doesn't replace a limit notice you haven't read. */
const TAG = 'wdmtg-limit'

/**
 * Says a running timer just took its activity to its limit, the same way reminders speak:
 * the in-app notice when you're looking at the app, a desktop notification when you aren't.
 */
export function deliverLimitReached(activityName: string, goal: Goal): void {
  const which = `${formatAmount(goal.ms)} ${goal.period === 'day' ? 'daily' : 'weekly'} limit`

  if (appHasAttention()) {
    announce(`${activityName} reached its ${which}.`, 8000)
    return
  }
  void notify(
    `${activityName} reached its ${which}`,
    'The timer is still running. Stop it or switch to something else.',
    TAG,
  )
}
