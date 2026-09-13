import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { normalizeTags, splitTags } from '../lib/tags'
import './TagInput.css'

interface TagInputProps {
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  /** Tags already in use, offered as the browser's own autocomplete. */
  suggestions?: string[]
  placeholder?: string
}

/**
 * Tags as chips with a text box after them. Space, comma, Enter or leaving the box turns what
 * was typed into tags; Backspace in an empty box takes the last one off.
 */
export function TagInput({ label, value, onChange, suggestions = [], placeholder }: TagInputProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')

  const add = (text: string) => {
    const next = normalizeTags([...value, ...splitTags(text)])
    if (next.length !== value.length) onChange(next)
  }

  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value
    // Picking from the autocomplete list replaces the text rather than typing it. Browsers
    // that don't say how the text changed only do that for a pick.
    const how = (event.nativeEvent as InputEvent).inputType
    const picked = how === 'insertReplacementText' || how === undefined
    if (/[\s,]/.test(text) || (picked && suggestions.includes(text))) {
      const parts = text.split(/[\s,]+/)
      const rest = /[\s,]$/.test(text) || picked ? '' : parts.pop()!
      add(parts.join(' '))
      setDraft(rest)
    } else {
      setDraft(text)
    }
  }

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && draft) {
      // Enter with nothing typed is left alone, so it still submits the form around it.
      event.preventDefault()
      add(draft)
      setDraft('')
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const unused = suggestions.filter((tag) => !value.includes(tag))

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input tag-input" onClick={() => input.current?.focus()}>
        {value.map((tag) => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button
              type="button"
              className="tag-remove"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={input}
          id={id}
          className="tag-input-text"
          value={draft}
          list={unused.length > 0 ? `${id}-tags` : undefined}
          autoComplete="off"
          placeholder={value.length === 0 ? placeholder : undefined}
          onChange={change}
          onKeyDown={keyDown}
          onBlur={() => {
            if (!draft) return
            add(draft)
            setDraft('')
          }}
        />
      </div>
      {unused.length > 0 && (
        <datalist id={`${id}-tags`}>
          {unused.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      )}
    </div>
  )
}
