const DAY_MS = 24 * 60 * 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

/** Fraction of the local calendar day that has passed at `date`, from 0 (midnight) toward 1. */
export function dayProgress(date: Date): number {
  const midnight = new Date(date)
  midnight.setHours(0, 0, 0, 0)
  return Math.min(1, Math.max(0, (date.getTime() - midnight.getTime()) / DAY_MS))
}

/** Formats a clock time as 24-hour `HH:MM`, or `HH:MM:SS` with seconds. */
export function formatClock(date: Date, withSeconds = false): string {
  const hhmm = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return withSeconds ? `${hhmm}:${pad(date.getSeconds())}` : hhmm
}

/** Day of the year, 1 for January 1st. */
export function dayOfYear(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1)
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // Rounding absorbs the 23- and 25-hour days around daylight-saving changes.
  return Math.round((today.getTime() - jan1.getTime()) / DAY_MS) + 1
}

export function daysInYear(year: number): number {
  return new Date(year, 1, 29).getDate() === 29 ? 366 : 365
}

/** The local UTC offset at `date`, e.g. `utc+03:00`. */
export function formatUtcOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset()
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  return `utc${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}
