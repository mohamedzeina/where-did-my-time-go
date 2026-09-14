import type { CSSProperties } from 'react'
import type { Activity, Goal, Session } from '../../db/types'
import { formatGoal, goalRecord, isLimit } from '../../lib/goals'
import { formatHoursMinutes } from '../../lib/totals'

interface GoalsSectionProps {
  activities: Map<string, Activity>
  /** Sessions from the Monday before `from`, so weekly goals are judged on whole weeks. */
  sessions: Session[]
  from: number
  to: number
  now: number
}

/** Show a dot per day or week only while there are few enough to read. */
const MAX_DOTS = 35

const dayName = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const hasGoal = (a: Activity): a is Activity & { goal: Goal } => a.goal !== undefined

/**
 * How each goal went in the range: met on how many days (or weeks), with a dot for each one
 * (filled when met). A limit is met by staying within it, and a broken one gets a warning
 * outline. Today and this week only count once they're settled.
 */
export function GoalsSection({ activities, sessions, from, to, now }: GoalsSectionProps) {
  const goals = [...activities.values()].filter((a) => hasGoal(a) && !a.archived) as (Activity & {
    goal: Goal
  })[]
  if (goals.length === 0) return null

  return (
    <section className="insights-block" aria-labelledby="goals-title">
      <div className="section-head">
        <h2 id="goals-title" className="section-title">
          Goals
        </h2>
      </div>
      <ul className="goal-rows">
        {goals.map((activity) => {
          const record = goalRecord(activity, sessions, from, to, now)
          const unit = activity.goal.period === 'day' ? 'day' : 'week'
          const limit = isLimit(activity.goal)
          return (
            <li
              key={activity.id}
              className="goal-row"
              style={{ '--bar-color': activity.color } as CSSProperties}
            >
              <span className="goal-name">
                <span className="chart-swatch" style={{ background: activity.color }} />
                {activity.name}
              </span>
              <span className="goal-target">{formatGoal(activity.goal)}</span>
              {/* The current day or week only counts once settled, so say "so far". */}
              <span className="goal-score">
                {limit ? 'kept' : 'met'} {record.metCount} of {record.countable} {unit}
                {record.countable === 1 ? '' : 's'} so far
              </span>
              {record.periods.length <= MAX_DOTS && (
                <span className="goal-dots" aria-hidden="true">
                  {record.periods.map((p) => (
                    <span
                      key={p.start}
                      className={
                        p.current && p.met === limit
                          ? 'goal-dot is-current'
                          : p.met
                            ? 'goal-dot is-met'
                            : limit
                              ? 'goal-dot is-over'
                              : 'goal-dot'
                      }
                      title={`${unit === 'week' ? 'Week of ' : ''}${dayName.format(p.start)}: ${formatHoursMinutes(p.done)}${
                        p.current ? ' (still going)' : ''
                      }`}
                    />
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
