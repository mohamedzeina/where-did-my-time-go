import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createActivity, listActivities } from '../../db/activities'
import { BACKUP_APP, countData, exportData } from '../../db/backup'
import { db } from '../../db/db'
import { addSession } from '../../db/sessions'
import * as download from '../../lib/download'
import { DataView } from './DataView'

let downloads: { filename: string; content: string }[]

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  downloads = []
  vi.spyOn(download, 'downloadFile').mockImplementation((filename, content) => {
    downloads.push({ filename, content })
  })
  const gym = await createActivity({ name: 'Gym', color: '#111' })
  await addSession({ activityId: gym.id, start: 1000, end: 61_000, note: 'Legs' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const backupFile = (content: unknown, name = 'backup.json') =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], name, {
    type: 'application/json',
  })

describe('DataView', () => {
  it('says how much is stored', async () => {
    render(<DataView />)
    expect(await screen.findByText(/1 activity and 1 session/)).toBeInTheDocument()
  })

  it('downloads a backup and remembers when', async () => {
    const user = userEvent.setup()
    render(<DataView />)

    expect(screen.getByText('Last backup: never')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download backup' }))

    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].filename).toMatch(/^where-did-my-time-go-backup-\d{4}-\d\d-\d\d\.json$/)
    const backup = JSON.parse(downloads[0].content)
    expect(backup).toMatchObject({ app: BACKUP_APP, activities: [{ name: 'Gym' }] })
    expect(screen.queryByText('Last backup: never')).not.toBeInTheDocument()
  })

  it('exports sessions as CSV', async () => {
    const user = userEvent.setup()
    render(<DataView />)

    await user.click(screen.getByRole('button', { name: 'Download CSV' }))

    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].filename).toMatch(/\.csv$/)
    expect(downloads[0].content).toContain(',1.00,Gym,Legs')
  })

  it('restores a backup after showing what is in it', async () => {
    const backup = await exportData(Date.now())
    const user = userEvent.setup()
    render(<DataView />)
    await screen.findByText(/1 activity and 1 session/)

    // Change the data after the backup was taken, then restore it.
    await createActivity({ name: 'Extra', color: '#222' })
    await user.upload(screen.getByLabelText('Backup file'), backupFile(backup))

    expect(await screen.findByText(/has 1 activity and 1 session/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Replace my data' }))

    expect(await screen.findByText('Restored 1 activity and 1 session.')).toBeInTheDocument()
    expect((await listActivities()).map((a) => a.name)).toEqual(['Gym'])
  })

  it('explains why a file cannot be restored', async () => {
    const user = userEvent.setup()
    render(<DataView />)

    await user.upload(screen.getByLabelText('Backup file'), backupFile('not json', 'notes.json'))
    expect(await screen.findByRole('status')).toHaveTextContent("notes.json isn't a backup file")

    await user.upload(screen.getByLabelText('Backup file'), backupFile({ hello: 'world' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      /isn't a where-did-my-time-go backup/,
    )
    expect(screen.queryByRole('button', { name: 'Replace my data' })).not.toBeInTheDocument()
  })

  it('deletes everything after confirming', async () => {
    const user = userEvent.setup()
    render(<DataView />)
    await screen.findByText(/1 activity and 1 session/)

    await user.click(screen.getByRole('button', { name: 'Delete all data' }))
    expect(screen.getByRole('button', { name: 'Keep' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Delete everything' }))

    await waitFor(async () => expect(await countData()).toEqual({ activities: 0, sessions: 0 }))
    expect(await screen.findByText('All data deleted.')).toBeInTheDocument()
  })
})
