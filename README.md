# where-did-my-time-go

A timer for tracking where your time goes, with a history you can edit and charts of what
you've done. It runs entirely in your browser: no account, no server, and it works offline.

See [BACKLOG.md](BACKLOG.md) for how it was built, step by step, and the design notes.

## What it does

- **Timer:** press an activity to start timing it, press another to switch, or Stop. The
  running timer is saved as it goes, so it keeps counting through reloads and restarts.
  Sessions under 10 seconds aren't kept, and switching within 10 seconds just corrects the
  activity, so mis-taps leave nothing behind.
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

### Install and offline use

In a production build (`npm run build && npm run preview`, or any static host), the app is an
installable web app: use your browser's **Install** option to give it its own window and
icon. Every file it needs is cached on first load, so it keeps working with no connection.

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
