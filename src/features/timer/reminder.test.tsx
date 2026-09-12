import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { createActivity } from '../../db/activities'
import { db } from '../../db/db'
import { ACTIVITY_COLORS } from '../../lib/palette'
import { deliverReminder } from './reminder'

const START = Date.UTC(2026, 8, 12, 9, 0)

/** jsdom has no Notification, so stand one up and record what it was asked to show. */
function stubNotifications(permission: NotificationPermission = 'granted') {
  const shown: { title: string; body?: string }[] = []
  class FakeNotification {
    static permission = permission
    static requestPermission = vi.fn()
    onclick: (() => void) | null = null
    close = vi.fn()
    constructor(title: string, options?: NotificationOptions) {
      shown.push({ title, body: options?.body })
    }
  }
  vi.stubGlobal('Notification', FakeNotification)
  return shown
}

beforeEach(async () => {
  window.location.hash = ''
  localStorage.clear()
  await Promise.all(db.tables.map((table) => table.clear()))
})

afterEach(() => vi.unstubAllGlobals())

describe('deliverReminder', () => {
  it('says it in the app when you are looking at it', async () => {
    const shown = stubNotifications()
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    await createActivity({ name: 'Gym', color: ACTIVITY_COLORS[0].hex }, 1)
    render(<App />)

    deliverReminder('Deep work', START, START + 2 * 3_600_000)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Still tracking Deep work — 2:00:00.',
    )
    expect(shown).toEqual([])
  })

  it('sends a desktop notification when the app is behind another window', () => {
    const shown = stubNotifications()
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)

    deliverReminder('Deep work', START, START + 2 * 3_600_000)

    expect(shown).toHaveLength(1)
    expect(shown[0].title).toBe('Still tracking Deep work — 2:00:00')
    expect(shown[0].body).toMatch(/^Running since \d\d:\d\d\. Stop it if you're done\.$/)
  })

  it('stays silent when notifications were never allowed', () => {
    const shown = stubNotifications('default')
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)

    deliverReminder('Deep work', START, START + 2 * 3_600_000)

    expect(shown).toEqual([])
  })
})
