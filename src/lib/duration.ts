/**
 * Formats a duration in milliseconds as `H:MM:SS`, or `MM:SS` when under an hour. Pass
 * `alwaysHours` for small readouts next to clock times, where `22:05` could read as 10 pm.
 */
export function formatDuration(ms: number, { alwaysHours = false } = {}): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 || alwaysHours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
