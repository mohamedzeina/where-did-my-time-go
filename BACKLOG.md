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
| Charts      | Hand-built HTML/CSS          | Exact mark specs, tooltips and table views; no dep   |
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

- [x] **4. Activities**
      Create, rename, recolor and archive activities. Seed a few defaults on first run.
      Archived activities can be deleted (with their sessions) after a confirmation.
      _Done when:_ activities persist across reloads.

- [x] **5. Timer**
      Pick an activity, start/stop, big live elapsed display, running state restored after reload,
      running time shown in the browser tab title.
      _Done when:_ you can time something, close the tab, reopen it, and it's still counting.

- [x] **6. Today**
      Under the timer: today's sessions and a per-activity total for the day.
      _Done when:_ stopping a timer immediately shows up in today's list.

- [x] **7. History**
      Sessions grouped by day, filter by activity and date range, edit/delete a session, add a
      manual entry for time you forgot to track.
      _Done when:_ you can fix a mistaken session and see the change everywhere.

- [x] **8. Insights (charts)**
      Time per activity for a chosen range, daily totals stacked by activity over the last 7/30 days,
      and a calendar heatmap of tracked time.
      _Done when:_ charts reflect real history and update after edits.

- [x] **9. Backup & export**
      Export/import all data as JSON, export sessions as CSV. Browser storage can be cleared, so this
      is your safety net.
      _Done when:_ exporting, clearing data, and importing restores everything.

- [x] **10. Polish**
      Keyboard shortcuts (space to start/stop), empty states, mobile layout, installable PWA with
      offline support.
      _Done when:_ it installs as an app and works offline.

- [x] **11. Minimum session length**
      Timed sessions under 10 seconds aren't kept, so spam-clicking and mis-taps leave nothing
      behind. Stopping one discards it with a short notice; switching away from one changes
      its activity instead (a mis-tap fix). Manual entries and edits aren't affected.
      _Done when:_ rapid start/stop leaves no sessions, and a quick switch keeps one session.

- [x] **12. Goals**
      An optional daily or weekly time goal per activity, set in the activity editor. Tiles
      show live progress toward it, reaching it shows a notice, and Insights shows how often
      each goal was met in the range. Weeks start on Monday. Backups carry goals.
      _Done when:_ a goal set on an activity shows progress on its tile and in Insights.

- [x] **13. Insights redesign & history paging**
      Simplify Insights to one story per block (numbers → where it went → over time → goals →
      the half-year heatmap), add a donut for the share per activity, and page History so a
      long range doesn't render thousands of rows at once.
      _Done when:_ Insights reads top to bottom without backtracking, and History stays fast
      with years of sessions.

- [x] **14. Away detection**
      A timer only tells the truth while something is watching it. The app stamps the clock
      while one runs, so a hole in the stamps (PC asleep, browser closed, tab discarded) is
      time nobody saw; optional system idle detection covers the other half, where you walk
      away and the machine stays on. Either way it asks — trim it out, stop where you left,
      or keep it — and never edits a session by itself.
      _Done when:_ leaving a timer running over a sleep offers to take that time back out.

- [x] **15. Long timer reminders**
      The other half of step 14: catching a forgotten timer while it runs rather than
      repairing it afterwards. An interval chosen in Data, counted from the session's start,
      delivered as the in-app notice when you're looking at the app and as a desktop
      notification when you aren't.
      _Done when:_ a timer left running past the interval says so without you going looking.

- [x] **16. Tags, notes and search**
      Free-form tags on sessions (lowercase, no `#`, suggested from tags already in use), and a
      note and tags you can fill in on the Timer view while a session runs, not only afterwards
      in History. History gets a search box over notes, tags and activity names, where `#tag`
      matches a tag exactly; its summary totals what's listed, so a tag search answers "how
      much time went to this". Tags ride along in backups and the CSV.
      _Done when:_ tagging a running session and searching `#that-tag` in History finds it,
      with its time in the total.

## Later / ideas

- Limits as well as targets (e.g. Meetings at most 2h/day)
- Pomodoro mode

## Done log

<!-- One line per completed step: date, step, notes. -->

- 2026-09-11 — Step 1, project scaffold. Vite template now ships oxlint instead of ESLint, kept it.
- 2026-09-11 — Step 2, design & app shell. Day ribbon, LED clock, instrument-panel layer, hash
  routing with 1/2/3 shortcuts. Dropped the light theme (too bright), CRT, HUD and pointer effects.
- 2026-09-11 — Step 3, data layer. Dexie with a sparse `running` index so the open session is
  one lookup. Unique names (case-insensitive); archiving stops a running timer; deleting an
  activity deletes its sessions.
- 2026-09-11 — Step 4, activities. Tiles under the clock with an edit mode; five starters seeded
  on first run only. 8-color palette validated with the dataviz checker on Midnight (kept the
  yellow slot; the "now" line got a midnight keyline instead). Delete lives behind archive.
- 2026-09-11 — Step 5, timer. Tiles start/switch/stop; LED lights in the activity color; tab
  title shows the running time. Ticks are aligned to whole seconds from the session start, and
  only the clock, running tile and title re-render each second.
- 2026-09-11 — Step 6, today. Tracked-vs-elapsed summary, per-activity bars, newest-first log;
  sessions crossing midnight are clipped. Sessions now draw as bands in the day ribbon, and the
  now-label moved below the line so it never covers the running band.
- 2026-09-11 — Step 7, history. Day groups with range/activity filters, inline editor for
  add/edit/delete; an end before the start means the next day; no sessions ending in the
  future. Small elapsed readouts now always show hours (`0:22:05`) so they can't pass for
  clock times.
- 2026-09-11 — Step 8, insights. Hand-built charts instead of Recharts: 26-week heatmap on a
  neutral moonlight ramp (above the range filter, which it ignores), stat tiles, per-activity
  bars, and stacked day/week columns with keyboard tooltips and table views; >8 activities
  fold into "Other". Fixes from review: durations under a minute show seconds, and the
  session editor keeps seconds (an equal end no longer becomes a 24-hour session).
- 2026-09-11 — Step 9, backup & export. New Data view (key 4): JSON backup with last-backup
  date, validated restore that previews and replaces all at once, CSV export (formula-safe,
  Excel-friendly), persistent-storage request, and delete-everything behind a confirmation.
- 2026-09-11 — Step 10, polish. Space toggles the timer (resumes the last active activity);
  PWA via vite-plugin-pwa with a ribbon icon, verified installable with no errors and working
  offline from the production build. Focus moves to the view heading on navigation, Today
  totals refresh every second, dark thin scrollbars, README rewritten.
- 2026-09-11 — Step 11, minimum session length (added after the backlog was done). Timed
  sessions under 10 s are discarded on stop with a notice; switching within 10 s corrects
  the activity instead. Also from review: bars are sized from the rounded value their label
  shows and rows sort by it, and every live readout (clock, title, tiles, Today) shares one
  ticker aligned to the session start, so they change on the same frame.
- 2026-09-12 — Step 12, goals. Daily/weekly targets per activity, a segmented LED meter on the
  tile, a notice when one is reached, and a Goals section in Insights (met N of M, one dot per
  period). Edit mode became a console list with aligned columns; dropdowns are styled through
  Chromium's customizable select; the new-activity form takes its own row. A full-width
  console row layout was tried for the Timer list and dropped as too tall: the compact grid
  stays, the console stays for editing.
- 2026-09-12 — Step 13, insights redesign & history paging. History renders 100 sessions at a
  time with a "show more" (19,710 sessions went from 2.0 s and 128k DOM nodes to 0.7 s and
  762). Insights lost the per-activity bars and "Longest session" for a donut and three stats,
  the heatmap moved to the bottom on a validated green ramp, and "This month" left the range
  list (a partial range skews the averages). The heatmap's table view went — History already
  lists those days — and the day-by-day table stayed but now scrolls inside a 22rem panel with
  a sticky header.
- 2026-09-12 — Step 14, away detection. Two signals into one question: a localStorage
  heartbeat every 20 s (a hole means the app wasn't running) and, behind a permission and a
  switch in Data, Chromium's Idle Detection API for "the machine is idle or locked". Page-level
  activity was rejected as a signal outright — a quiet tab is exactly what tracked deep work
  looks like. Threshold 5 min, above background-tab throttling. Both sources widen one pending
  gap rather than asking twice (walk away, then the PC sleeps). Nothing is ever changed
  automatically: ignoring the prompt keeps the time, and Space is switched off while it's up.
  This is a desktop-only app in practice, so sync left the ideas list.
- 2026-09-12 — Published to GitHub Pages so the app installs and pins to the taskbar. A
  project site is served from a subfolder, so the build sets a base path and the manifest's
  id, scope and start_url and the service worker's navigation fallback all follow it; dev
  stays at the root. Pushing to main redeploys behind lint, formatting and tests. Pages has
  to be switched on in Settings by hand — the workflow token isn't allowed to do it. Opera GX
  turned out not to offer PWA install, so it was installed from another Chromium browser.
- 2026-09-12 — Step 15, long timer reminders. Interval picked in Data (off by default, asks
  for the notification permission when you pick one), scheduled from the session's start so a
  reload neither repeats nor shifts one. Delivery splits on `document.hasFocus()` rather than
  visibility, because a window sitting behind another still counts as visible and that is
  exactly when you need telling. Fake timers had to be narrowed to setTimeout/clearTimeout/Date
  in the tests: faking microtasks and setImmediate ends IndexedDB transactions under Dexie.
- 2026-09-13 — Step 16, tags, notes and search. Tags are free-form strings on the session,
  lowercase without the `#`, behind a multi-entry index so the distinct ones are a key-only
  read; a database upgrade gives older sessions an empty list, and older backups still
  restore. The running session gets a note and tag box on the Timer view that save as you
  type (the tags are held locally so quick typing can't race the database). History searches
  in memory over the range it already loaded: words match notes, tags and activity names,
  `#tag` matches exactly, and the summary total becomes the answer to "how long on this".
  Clicking a tag searches it; an empty search in a short range offers all time. Trimming away
  time carries the note and tags onto the resumed session. CSV gained a trailing `tags`
  column. Suggestions use the native datalist. Today rows don't show notes or tags yet.
