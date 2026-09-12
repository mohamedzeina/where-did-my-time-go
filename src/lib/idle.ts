/**
 * Is the machine idle? — via Chromium's Idle Detection API.
 *
 * Page-level events can't answer this. A tab that sees no mouse or keyboard for an hour tells
 * you nothing: you may have been working in your editor the whole time, which is exactly what
 * this timer is usually recording. The Idle Detection API reports the *machine* instead — no
 * input anywhere, or the screen locked — which is the only signal that actually means you left.
 *
 * It's Chromium-only and permission-gated, so every entry point here degrades to "no": without
 * it the app still notices absences after the fact, once it stops running entirely.
 */

export interface MachineState {
  userState: 'active' | 'idle' | null
  screenState: 'locked' | 'unlocked' | null
}

interface IdleDetectorInstance extends EventTarget, MachineState {
  start(options: { threshold: number; signal?: AbortSignal }): Promise<void>
}

interface IdleDetectorConstructor {
  new (): IdleDetectorInstance
  requestPermission(): Promise<PermissionState>
}

/** The API's own floor; anything shorter is rejected. */
export const MIN_THRESHOLD_MS = 60_000

function api(): IdleDetectorConstructor | undefined {
  return (globalThis as { IdleDetector?: IdleDetectorConstructor }).IdleDetector
}

export function idleSupported(): boolean {
  return api() !== undefined
}

/** Whether the permission has already been granted, without prompting for it. */
export async function idlePermission(): Promise<PermissionState | 'unsupported'> {
  if (!idleSupported()) return 'unsupported'
  try {
    // The name is newer than the TypeScript DOM types.
    const status = await navigator.permissions.query({
      name: 'idle-detection' as PermissionName,
    })
    return status.state
  } catch {
    return 'prompt'
  }
}

/** Asks for the permission. Chromium only grants it from a user gesture, so call it in a click. */
export async function requestIdlePermission(): Promise<boolean> {
  const IdleDetector = api()
  if (!IdleDetector) return false
  try {
    return (await IdleDetector.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/**
 * Reports the machine's state whenever it changes, until the returned function is called.
 * Resolves to `undefined` when it can't watch at all — unsupported, or not permitted — so
 * callers can carry on without it.
 */
export async function watchMachine(
  thresholdMs: number,
  onChange: (state: MachineState) => void,
): Promise<(() => void) | undefined> {
  const IdleDetector = api()
  if (!IdleDetector) return undefined

  const controller = new AbortController()
  try {
    const detector = new IdleDetector()
    detector.addEventListener('change', () =>
      onChange({ userState: detector.userState, screenState: detector.screenState }),
    )
    await detector.start({
      threshold: Math.max(thresholdMs, MIN_THRESHOLD_MS),
      signal: controller.signal,
    })
    return () => controller.abort()
  } catch {
    controller.abort()
    return undefined
  }
}
