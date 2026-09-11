import '../views.css'

export function HistoryView() {
  return (
    <section className="view" aria-labelledby="view-title">
      <h1 id="view-title" className="view-title">
        History
      </h1>
      <p className="view-lede">
        Nothing tracked yet. Every session you finish will land here, grouped by day.
      </p>
    </section>
  )
}
