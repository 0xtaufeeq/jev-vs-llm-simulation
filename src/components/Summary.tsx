import { CATEGORIES, COLORS, type Category, type Money } from '../data'
import { easeOut, win } from '../timeline'

interface Props {
  s: number // seconds since summary began
  n: number
  counts: Record<Category, number>
  outBy: Record<Category, number>
  inBy: Record<Category, number>
  fmt: Money
  onReset: () => void
}

const rise = (t: number) => ({ opacity: t, transform: `translateY(${(1 - easeOut(t)) * 6}px)` })

export function Summary({ s, n, counts, outBy, inBy, fmt, onReset }: Props) {
  const fmtWhole = fmt.whole
  const totalOut = CATEGORIES.reduce((a, c) => a + outBy[c], 0)
  const totalIn = CATEGORIES.reduce((a, c) => a + inBy[c], 0)
  const check = easeOut(win(s, 0.1, 0.45))
  const rowsStart = 0.72
  const btn = win(s, rowsStart + CATEGORIES.length * 0.07 + 0.12, 0.35)

  return (
    <div className="summary">
      <svg className="summary-check" width="26" height="26" viewBox="0 0 24 24" style={{ opacity: win(s, 0.05, 0.15) }}>
        <path d="M4.5 12.5 L9.5 17.5 L19.5 6.5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - check} />
      </svg>
      <div className="summary-title" style={rise(win(s, 0.25, 0.3))}>
        {n} transactions sorted
      </div>

      <div className="summary-total" style={{ top: 221, ...rise(win(s, 0.4, 0.3)) }}>
        <span>Out</span>
        <span>{fmtWhole(totalOut)}</span>
      </div>
      <div className="summary-total" style={{ top: 245, ...rise(win(s, 0.47, 0.3)) }}>
        <span>In</span>
        <span>{fmtWhole(totalIn)}</span>
      </div>

      <div className="summary-total summary-net" style={{ top: 269, ...rise(win(s, 0.54, 0.3)) }}>
        <span>Net</span>
        <span className={totalIn - totalOut >= 0 ? 'is-pos' : 'is-neg'}>
          {totalIn - totalOut >= 0 ? '+' : '−'}
          {fmtWhole(Math.abs(totalIn - totalOut))}
        </span>
      </div>

      <div className="summary-head" style={{ opacity: win(s, 0.6, 0.3) }}>
        <span className="col-cat">Category</span>
        <span className="col-count">Count</span>
        <span className="col-out">Out</span>
        <span className="col-in">In</span>
      </div>
      {CATEGORIES.map((cat, i) => (
        <div key={cat} className="summary-row" style={{ top: 333 + i * 24, ...rise(win(s, rowsStart + i * 0.07, 0.3)) }}>
          <span className="col-cat">
            <span className="legend-dot" style={{ background: COLORS[cat] }} />
            {cat}
          </span>
          <span className="col-count">{counts[cat]}</span>
          <span className={`col-out${outBy[cat] ? '' : ' is-dash'}`}>{outBy[cat] ? fmtWhole(outBy[cat]) : '—'}</span>
          <span className={`col-in${inBy[cat] ? '' : ' is-dash'}`}>{inBy[cat] ? fmtWhole(inBy[cat]) : '—'}</span>
        </div>
      ))}

      <button className="sort-another" style={{ ...rise(btn), pointerEvents: btn > 0.5 ? 'auto' : 'none' }} onClick={onReset}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Sort another
      </button>
    </div>
  )
}
