import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { TagInput } from '../../components/TagInput'
import { listTags, updateSession } from '../../db/sessions'
import type { Session } from '../../db/types'

/** How long typing has to pause before the note is saved. Leaving the box saves at once. */
const NOTE_SAVE_DELAY = 800

/**
 * A note and tags for the session that's running, filled in while it happens. Both save as
 * you go, so there's no button to forget. Mount it keyed by the session, so a new session
 * starts with empty boxes.
 */
export function RunningDetails({ session }: { session: Session }) {
  const suggestions = useLiveQuery(listTags, [])
  const [note, setNote] = useState(session.note)
  // Kept here rather than read back from the database, so tags typed in quick succession
  // don't each start from a list that hasn't caught up yet.
  const [tags, setTags] = useState(session.tags)
  const savedNote = useRef(session.note)

  // A session stopped mid-edit may already be gone (under 10 s it isn't kept); nothing to save.
  const save = (changes: Pick<Session, 'note'> | Pick<Session, 'tags'>) =>
    void updateSession(session.id, changes).catch(() => {})

  const saveNote = (text: string) => {
    if (text === savedNote.current) return
    savedNote.current = text
    save({ note: text })
  }

  useEffect(() => {
    const timeout = setTimeout(() => saveNote(note), NOTE_SAVE_DELAY)
    return () => clearTimeout(timeout)
  })

  return (
    <div className="running-details">
      <label className="field">
        <span className="field-label">Note</span>
        <input
          className="input"
          value={note}
          placeholder="What are you working on?"
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => saveNote(note)}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      </label>
      <TagInput
        label="Tags"
        value={tags}
        suggestions={suggestions}
        placeholder="Optional"
        onChange={(next) => {
          setTags(next)
          save({ tags: next })
        }}
      />
    </div>
  )
}
