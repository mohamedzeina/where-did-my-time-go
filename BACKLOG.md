# Backlog — where-did-my-time-go

A timer app for tracking where your time goes: start a timer for an activity, and build up a
persistent history with charts of what you've done.

## How we work

1. Pick the next step below and build only that step.
2. Review the running app together.
3. Commit (no co-author trailer) and push to `origin/main`.
4. Tick the step off here and note anything that changed or moved to later.

## Stack

| Concern     | Choice                       | Why                                                  |
| ----------- | ---------------------------- | ---------------------------------------------------- |
| UI          | React + TypeScript           | Component model suits timer, history and chart views |
| Build       | Vite                         | Fast dev server, simple config                       |
| Persistence | IndexedDB via Dexie          | Local, survives reloads, no server or account needed |
| Charts      | Recharts (revisit at step 8) | Declarative React charts                             |
| Dates       | date-fns                     | Small, tree-shakeable date math                      |
| Styling     | Plain CSS with design tokens | Full control over a distinctive look                 |
| Tests       | Vitest + Testing Library     | Native to Vite                                       |

## Data model

- **Activity**: `id`, `name`, `color`, `archived`, `createdAt`
- **Session**: `id`, `activityId`, `start`, `end` (`null` while running), `note`

A running timer is just a session with no `end`, so it survives page reloads and browser restarts.
Only one session runs at a time. Starting another activity stops the current one.

## Steps

- [x] **1. Project scaffold**
      Vite + React + TS, oxlint/Prettier, Vitest, folder structure, `.gitignore`, README run instructions.
      _Done when:_ `npm run dev` shows a placeholder page and `npm test` passes.

- [ ] **2. Design direction & app shell**
      Pick the visual identity (type, color, tone), set up design tokens, light/dark theme, and
      navigation between Timer / History / Insights (empty views).
      _Done when:_ you can move between the three views and the look feels like "the app".

- [ ] **3. Data layer**
      Dexie database, Activity + Session tables, typed repository functions, unit tests for them.
      _Done when:_ tests cover create/read/update/delete and "start stops the running session".

- [ ] **4. Activities**
      Create, rename, recolor and archive activities. Seed a few defaults on first run.
      _Done when:_ activities persist across reloads.

- [ ] **5. Timer**
      Pick an activity, start/stop, big live elapsed display, running state restored after reload,
      running time shown in the browser tab title.
      _Done when:_ you can time something, close the tab, reopen it, and it's still counting.

- [ ] **6. Today**
      Under the timer: today's sessions and a per-activity total for the day.
      _Done when:_ stopping a timer immediately shows up in today's list.

- [ ] **7. History**
      Sessions grouped by day, filter by activity and date range, edit/delete a session, add a
      manual entry for time you forgot to track.
      _Done when:_ you can fix a mistaken session and see the change everywhere.

- [ ] **8. Insights (charts)**
      Time per activity for a chosen range, daily totals stacked by activity over the last 7/30 days,
      and a calendar heatmap of tracked time.
      _Done when:_ charts reflect real history and update after edits.

- [ ] **9. Backup & export**
      Export/import all data as JSON, export sessions as CSV. Browser storage can be cleared, so this
      is your safety net.
      _Done when:_ exporting, clearing data, and importing restores everything.

- [ ] **10. Polish**
      Keyboard shortcuts (space to start/stop), empty states, mobile layout, installable PWA with
      offline support.
      _Done when:_ it installs as an app and works offline.

## Later / ideas

- Daily or weekly goals per activity
- Tags and notes on sessions, search
- Pomodoro mode
- Idle detection ("you were away 20 min, keep that time?")
- Notifications for long-running timers
- Sync across devices (would need a backend)

## Done log

<!-- One line per completed step: date, step, notes. -->

- 2026-09-11 — Step 1, project scaffold. Vite template now ships oxlint instead of ESLint, kept it.
