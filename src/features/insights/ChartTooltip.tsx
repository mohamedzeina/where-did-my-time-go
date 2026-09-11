export interface TooltipRow {
  key: string
  color?: string
  label: string
  value: string
}

interface ChartTooltipProps {
  /** Horizontal center of the hovered mark, as a fraction of the chart width (0–1). */
  x: number
  title: string
  /** The headline value, shown strongest. */
  value: string
  rows?: TooltipRow[]
}

/**
 * Floating readout above a hovered or focused mark. Values lead and labels follow; each row
 * is keyed with a short stroke of its series color.
 */
export function ChartTooltip({ x, title, value, rows = [] }: ChartTooltipProps) {
  return (
    <div
      className="chart-tooltip"
      aria-hidden="true"
      style={{ left: `clamp(7rem, ${x * 100}%, calc(100% - 7rem))` }}
    >
      <p className="chart-tooltip-title">{title}</p>
      <p className="chart-tooltip-value">{value}</p>
      {rows.length > 0 && (
        <ul className="chart-tooltip-rows">
          {rows.map((row) => (
            <li key={row.key}>
              <span className="chart-key" style={{ background: row.color }} />
              <strong>{row.value}</strong>
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
