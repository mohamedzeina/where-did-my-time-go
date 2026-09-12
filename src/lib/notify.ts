/**
 * Desktop notifications, for the one thing worth interrupting you about: a timer still
 * running long after you stopped doing the thing.
 *
 * Everything here is optional and degrades to doing nothing. Notifications need a permission
 * the browser only grants from a click, and the app has to work perfectly well without them.
 */

const ICON = `${import.meta.env.BASE_URL}pwa-192.png`

/** One tag for every reminder, so a new one replaces the last instead of stacking up. */
const TAG = 'wdmtg-running'

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

/** Asks for the permission. Browsers only grant it from a user gesture, so call it in a click. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/**
 * Shows a notification, if that's permitted. Clicking it brings the app's window forward,
 * which is the whole point: you notice, you switch to it, you stop the timer.
 */
export async function notify(title: string, body: string): Promise<void> {
  if (notificationPermission() !== 'granted') return
  try {
    const notification = new Notification(title, { body, icon: ICON, tag: TAG })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    return
  } catch {
    // Some browsers only allow notifications through a service worker; the app has one.
  }
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    await registration?.showNotification(title, { body, icon: ICON, tag: TAG })
  } catch {
    // Nothing more to try, and a missed reminder is not worth breaking the timer over.
  }
}
