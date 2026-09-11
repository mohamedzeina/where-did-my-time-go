import './Segmented.css'

interface SegmentedProps<T extends string> {
  /** Radio group name; must be unique on the page. */
  name: string
  /** Read out as the group's name, e.g. "Goal period for Gym". */
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** A small set of mutually exclusive options as one pill of mono chips, e.g. day | week. */
export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset className="segmented">
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className="segmented-option">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}
