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

## Design direction

Your day as a 24-hour ribbon. The ribbon runs down the left edge (across the top on phones),
shades the part of today that's already gone, and marks now with a sodium-lamp amber line.
Tracked sessions will fill it in as colored bands, so untracked time is visibly "where it went".

- **Palette (dark only):** Midnight `#12163a`, Dusk `#1f2452`, Moonlight `#ecedf7`, Haze
  `#9aa0c6`, Sodium `#ffb23e`. A light theme was built and dropped as too bright.
- **Type:** DSEG7 (seven-segment LED, unlit segments faintly visible) for the clock; Big
  Shoulders (tall, condensed) for the name and headings; Martian Mono for readouts and small
  data; Schibsted Grotesk for everything else.
- **Techy layer:** read like an instrument panel. Faint plotting grid behind views, viewfinder
  corners around the clock, a live status bar (seconds, day of year, % of today gone, UTC
  offset), mono key hints with number-key shortcuts, and a blinking cursor after the name.
  Tried and rejected: CRT scanlines/glow, HUD rulers and grid crosshairs, pointer crosshair.
- **Principles:** the ribbon and the giant clock are the loud parts, everything else stays quiet.
  One load animation (the day pours into the ribbon), no decorative motion elsewhere.
- Tokens live in `src/styles/tokens.css`.

## Data model

- **Activity**: `id`, `name`, `color`, `archived`, `createdAt`
- **Session**: `id`, `activityId`, `start`, `end` (`null` while running), `note`

A running timer is just a session with no `end`, so it survives page reloads and browser restarts.
Only one session runs at a time. Starting another activity stops the current one.

## Steps

- [x] **1. Project scaffold**
      Vite + React + TS, oxlint/Prettier, Vitest, folder structure, `.gitignore`, README run instructions.
      _Done when:_ `npm run dev` shows a placeholder page and `npm test` passes.

- [x] **2. Design direction & app shell**
      Pick the visual identity (type, color, tone), set up design tokens (dark only), and
      navigation between Timer / History / Insights (empty views).
      _Done when:_ you can move between the three views and the look feels like "the app".

- [x] **3. Data layer**
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
- 2026-09-11 — Step 2, design & app shell. Day ribbon, LED clock, instrument-panel layer, hash
  routing with 1/2/3 shortcuts. Dropped the light theme (too bright), CRT, HUD and pointer effects.
- 2026-09-11 — Step 3, data layer. Dexie with a sparse `running` index so the open session is
  one lookup. Unique names (case-insensitive); archiving stops a running timer; deleting an
  activity deletes its sessions.
