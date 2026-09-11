import { describe, expect, it } from 'vitest'
import type { Activity, Session } from '../db/types'
import { csvField, sessionsToCsv } from './csv'

describe('csvField', () => {
  it('quotes fields with commas, quotes or line breaks', () => {
    expect(csvField('plain')).toBe('plain')
    expect(csvField('a, b')).toBe('"a, b"')
    expect(csvField('say "hi"')).toBe('"say ""hi"""')
    expect(csvField('two\nlines')).toBe('"two\nlines"')
  })

  it('defuses text a spreadsheet would treat as a formula', () => {
    expect(csvField('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvField('-2 hours')).toBe("'-2 hours")
    expect(csvField(-2)).toBe('-2')
  })
})

describe('sessionsToCsv', () => {
  const at = (h: number, m = 0) => new Date(2026, 8, 11, h, m).getTime()
  const activities = new Map<string, Activity>([
    ['a', { id: 'a', name: 'Deep work', color: '#111', archived: false, createdAt: 0 }],
  ])
  const sessions: Session[] = [
    { id: '2', activityId: 'a', start: at(14), end: null, note: '' },
    { id: '1', activityId: 'a', start: at(9), end: at(10, 30), note: 'Plan, v2' },
  ]

  it('writes a header and one row per session, oldest first, in local time', () => {
    const csv = sessionsToCsv(sessions, activities, at(14, 15))
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual([
      'date,start,end,duration_minutes,activity,note',
      '2026-09-11,09:00:00,10:30:00,90.00,Deep work,"Plan, v2"',
      '2026-09-11,14:00:00,,15.00,Deep work,',
      '',
    ])
  })
})
