# where-did-my-time-go

A timer for tracking where your time goes, with a history you can edit and charts of what
you've done. It runs entirely in your browser: no account, no server, and it works offline.

See [BACKLOG.md](BACKLOG.md) for how it was built, step by step, and the design notes.

## What it does

- **Timer:** press an activity to start timing it, press another to switch, or Stop. The
  running timer is saved as it goes, so it keeps counting through reloads and restarts.
  Sessions under 10 seconds aren't kept, and switching within 10 seconds just corrects the
  activity, so mis-taps leave nothing behind.
- **Away time:** a timer left running while you're gone counts time you didn't spend. When
  the app comes back from a stretch it wasn't watching — the PC slept, the browser was closed,
  or (if you switch it on) you walked away and the machine went idle — it says how long and
  offers to trim that time out, stop the session where you left, or keep it. It never changes
  a session on its own, so ignoring the question keeps the time as tracked.
- **Goals:** give any activity a daily or weekly time goal. Its tile fills up toward it as
  you go, and Insights shows how often you've met it.
- **Today:** tracked time against the day so far, a total per activity, and today's sessions.
  The day ribbon down the left edge shows every session as a band at its time of day.
- **History:** sessions grouped by day, filtered by date range and activity. Fix any session
  in place, or add one you forgot to track.
- **Insights:** a 26-week calendar heatmap, headline numbers, time per activity, and daily or
  weekly stacked totals. Every chart has a table view.
- **Data:** download a backup, restore one, export sessions as CSV, or delete everything.

### Keyboard

| Key       | Does                                         |
| --------- | -------------------------------------------- |
| `Space`   | Stop the timer, or restart the last activity |
| `1`–`4`   | Timer, History, Insights, Data               |
| `←` / `→` | Move between columns in the day-by-day chart |
| `Esc`     | Cancel an edit                               |

### Install it as an app

The app is published at **https://mohamedzeina.github.io/where-did-my-time-go/**. Open it in
Chrome or Edge and use the **Install** button in the address bar: it gets its own window and
icon, and you can right-click that icon to pin it to the taskbar.

Only the files are hosted — there's no server and no account, and nothing you track is sent
anywhere. Every file is cached on first load, so once it's installed it opens and works with
no connection at all. Pushing to `main` rebuilds and republishes it, and the installed app
picks up the new version the next time you open it.

Because browsers file storage under the site it came from, sessions tracked at
`localhost:3000` don't follow the installed app. Download a backup from the **Data** view
first and restore it afterwards.

### Away detection

Time when the app wasn't running at all is always noticed: it stamps the clock while a timer
runs, and a hole in the stamps is a stretch nobody watched.

Catching the other case — you leave the desk but the PC and browser stay up — needs the
browser to tell the app whether the machine itself is idle or locked. That's a permission, and
only Chromium browsers (Chrome, Edge) offer it, so it's off until you turn on **Away
detection** in the **Data** view. Without it, walking away from a running timer goes unnoticed
until the PC sleeps.

Either way the threshold is five minutes, comfortably clear of the throttling a browser
applies to background tabs.

### Your data

Everything is stored in your browser (IndexedDB) and never leaves it. Browsers can clear site
data, so download a backup now and then from the **Data** view, and use **Protect storage**
there to ask the browser to keep it.

## Getting started

Requires Node 20+.

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

`npm run preview` serves the production build instead, at
http://localhost:3000/where-did-my-time-go/ — the same subfolder it's published under, so it
catches anything that only breaks once the app isn't at the root.

## Scripts

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the dev server                          |
| `npm run build`        | Type-check and build to `dist/`, with the PWA |
| `npm run preview`      | Serve the production build                    |
| `npm test`             | Run the tests once                            |
| `npm run test:watch`   | Run the tests in watch mode                   |
| `npm run lint`         | Lint with oxlint                              |
| `npm run format`       | Format everything with Prettier               |
| `npm run format:check` | Check formatting without writing              |

## Built with

React, TypeScript and Vite; Dexie over IndexedDB; vite-plugin-pwa for the service worker;
Vitest and Testing Library. Charts are plain HTML and CSS. Fonts: Big Shoulders, Schibsted
Grotesk, Martian Mono and DSEG7 (the LED clock), all under the SIL Open Font License.
