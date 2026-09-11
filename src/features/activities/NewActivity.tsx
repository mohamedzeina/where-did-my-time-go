import { useState, type CSSProperties, type FormEvent } from 'react'
import { ColorSwatches } from '../../components/ColorSwatches'
import { createActivity } from '../../db/activities'
import { nextActivityColor } from '../../lib/palette'
import { errorMessage } from './useActivities'

/** The last tile in the grid: a button that opens into a small form for a new activity. */
export function NewActivity({ usedColors }: { usedColors: string[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [error, setError] = useState<string>()

  const openForm = () => {
    setColor(nextActivityColor(usedColors))
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setName('')
    setError(undefined)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await createActivity({ name, color })
      close()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  if (!open) {
    return (
      <button type="button" className="tile tile-new" onClick={openForm}>
        <span aria-hidden="true">+</span> New activity
      </button>
    )
  }

  return (
    <form
      className="tile is-editing tile-new-form"
      style={{ '--tile-color': color } as CSSProperties}
      onSubmit={submit}
      onKeyDown={(event) => event.key === 'Escape' && close()}
    >
      <input
        className="tile-input"
        value={name}
        placeholder="Name it"
        aria-label="New activity name"
        aria-invalid={error ? true : undefined}
        autoFocus
        onChange={(event) => setName(event.target.value)}
      />
      <ColorSwatches name="color-new" value={color} onChange={setColor} />
      <div className="tile-actions">
        <button type="submit" className="text-button is-primary">
          Add activity
        </button>
        <button type="button" className="text-button" onClick={close}>
          Cancel
        </button>
      </div>
      {error && (
        <p className="tile-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
