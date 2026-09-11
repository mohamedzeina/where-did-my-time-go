import { ACTIVITY_COLORS } from '../lib/palette'
import './ColorSwatches.css'

interface ColorSwatchesProps {
  /** Radio group name; must be unique on the page. */
  name: string
  value: string
  onChange: (hex: string) => void
}

/** Picks one of the activity palette colors. */
export function ColorSwatches({ name, value, onChange }: ColorSwatchesProps) {
  return (
    <fieldset className="swatches">
      <legend className="visually-hidden">Color</legend>
      {ACTIVITY_COLORS.map((color) => (
        <label key={color.hex} className="swatch" style={{ color: color.hex }}>
          <input
            type="radio"
            name={name}
            value={color.hex}
            checked={value.toLowerCase() === color.hex}
            onChange={() => onChange(color.hex)}
          />
          <span className="visually-hidden">{color.name}</span>
        </label>
      ))}
    </fieldset>
  )
}
