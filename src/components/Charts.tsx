import { useRef } from 'react'
import { CATEGORIES, COLORS, fmtPct, type Category } from '../data'

const CX = 649
const CY = 222
const R_OUT = 84
const R_IN = 57

function sector(a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (r: number, a: number) => `${CX + r * Math.cos(a)} ${CY + r * Math.sin(a)}`
  return `M ${p(R_OUT, a0)} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${p(R_OUT, a1)} L ${p(R_IN, a1)} A ${R_IN} ${R_IN} 0 ${large} 0 ${p(R_IN, a0)} Z`
}

/** exponential smoothing that survives re-renders */
function useSmoothed(target: number[], dt: number, speed = 10) {
  const ref = useRef<number[] | null>(null)
  if (!ref.current || ref.current.length !== target.length) ref.current = target.map(() => 0)
  const k = 1 - Math.exp(-dt * speed)
  ref.current = ref.current.map((v, i) => (Math.abs(target[i] - v) < 1e-4 ? target[i] : v + (target[i] - v) * k))
  return ref.current
}

interface DonutProps {
  counts: Record<Category, number>
  k: number
  n: number
  done: boolean
  dt: number
  now: number
}

export function DonutAndLegend({ counts, k, n, done, dt, now }: DonutProps) {
  const smooth = useSmoothed(
    CATEGORIES.map((c) => (n ? counts[c] / n : 0)),
    dt,
    9,
  )

  // flash a legend row when its count ticks up
  const prev = useRef<Record<string, number>>({})
  const bumped = useRef<Record<string, number>>({})
  for (const c of CATEGORIES) {
    if ((prev.current[c] ?? 0) < counts[c]) bumped.current[c] = now
    prev.current[c] = counts[c]
  }

  let a = -Math.PI / 2
  const arcs = CATEGORIES.map((cat, i) => {
    const sweep = smooth[i] * Math.PI * 2
    const a0 = a
    a += sweep
    if (sweep < 0.002) return null
    return <path key={cat} d={sector(a0, a0 + Math.min(sweep, Math.PI * 2 - 0.0001))} fill={COLORS[cat]} stroke="#0b0b0b" strokeWidth={1.6} strokeLinejoin="round" />
  })

  return (
    <>
      <div className="section-title" style={{ left: 561, top: 87 }}>
        Transactions
      </div>
      <svg className="donut" width={1166} height={692}>
        <circle cx={CX} cy={CY} r={(R_OUT + R_IN) / 2} fill="none" stroke="#212121" strokeWidth={R_OUT - R_IN} />
        {arcs}
      </svg>
      <div className="donut-center" style={{ left: CX, top: CY }}>
        <div className="donut-count">{k}</div>
        <div className="donut-sub">{done ? 'transactions' : `of ${n}`}</div>
      </div>
      {CATEGORIES.map((cat, i) => {
        const v = counts[cat]
        const hot = v > 0 && now - (bumped.current[cat] ?? -1e9) < 450 && !done
        return (
          <div key={cat} className={`legend-row${v === 0 ? ' is-empty' : ''}${hot ? ' is-hot' : ''}`} style={{ top: 131 + i * 26 }}>
            <span className="legend-dot" style={{ background: COLORS[cat] }} />
            <span className="legend-label">{cat}</span>
            <span className="legend-count">{v}</span>
            <span className="legend-pct">{fmtPct(v, n || 1)}</span>
          </div>
        )
      })}
    </>
  )
}

const BARS_X = 561
const BARS_W = 383
const BASE_Y = 560
const MAX_H = 124
const IN_COLOR = COLORS.Income

interface BarsProps {
  months: { key: string; label: string }[]
  // [month][category] amounts so far, one grid for money in and one for money out
  inCur: number[][]
  outCur: number[][]
  finalIn: number[]
  finalOut: number[]
  activeMonth: number
  done: boolean
  showGhost: boolean
  dt: number
  short: (n: number) => string
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function MoneyInOut({ months, inCur, outCur, finalIn, finalOut, activeMonth, done, showGhost, dt, short }: BarsProps) {
  const m = Math.max(1, months.length)
  const maxFinal = Math.max(1, ...finalIn, ...finalOut)
  const inFlat = useSmoothed(inCur.flat(), dt, 11)
  const outFlat = useSmoothed(outCur.flat(), dt, 11)
  const groupW = BARS_W / m
  const barW = Math.max(10, Math.min(20, groupW * 0.21))
  const gap = 3
  const totalIn = sum(inCur.map(sum))
  const totalOut = sum(outCur.map(sum))
  const nCat = CATEGORIES.length

  // one stacked bar; segments in category order from the baseline up
  const stack = (flat: number[], j: number, x: number, keyPrefix: string) => {
    let y = BASE_Y
    return CATEGORIES.map((cat, ci) => {
      const v = flat[j * nCat + ci] ?? 0
      const h = (v / maxFinal) * MAX_H
      if (h < 0.4) return null
      y -= h
      return (
        <div
          key={keyPrefix + cat}
          className="bar-seg"
          style={{ left: x, top: y, height: Math.max(0, h - 1.5), width: barW, background: COLORS[cat] }}
        />
      )
    })
  }

  return (
    <>
      <div className="section-title" style={{ left: 561, top: 375 }}>
        Money in &amp; out
      </div>
      <div className="flow-legend" style={{ left: 944, top: 375, opacity: showGhost ? 1 : 0.5 }}>
        <span className="flow-key">
          <span className="flow-swatch" style={{ background: IN_COLOR }} />
          In <b>{short(totalIn)}</b>
        </span>
        <span className="flow-key">
          <span className="flow-swatch flow-swatch-out" />
          Out <b>{short(totalOut)}</b>
        </span>
      </div>
      <div className="baseline" style={{ left: BARS_X, top: BASE_Y, width: BARS_W }} />
      {months.map((mo, j) => {
        const cx = BARS_X + groupW * (j + 0.5)
        const xIn = cx - gap / 2 - barW
        const xOut = cx + gap / 2
        const ghostIn = (finalIn[j] / maxFinal) * MAX_H
        const ghostOut = (finalOut[j] / maxFinal) * MAX_H
        const mIn = sum(inCur[j])
        const mOut = sum(outCur[j])
        const isActive = !done && j === activeMonth
        const labelTop = BASE_Y - Math.max(ghostIn, ghostOut) - 30
        return (
          <div key={mo.key}>
            <div className="bar-ghost" style={{ left: xIn, top: BASE_Y - ghostIn, height: ghostIn, width: barW, opacity: showGhost ? 1 : 0 }} />
            <div className="bar-ghost" style={{ left: xOut, top: BASE_Y - ghostOut, height: ghostOut, width: barW, opacity: showGhost ? 1 : 0 }} />
            {stack(inFlat, j, xIn, 'in-')}
            {stack(outFlat, j, xOut, 'out-')}
            <div
              className={`bar-value${isActive ? ' is-active' : ''}${done ? ' is-done' : ''}`}
              style={{ left: cx, top: labelTop, opacity: mIn + mOut > 0.5 ? 1 : 0 }}
            >
              <div className="bar-value-in">+{short(mIn)}</div>
              <div className="bar-value-out">−{short(mOut)}</div>
            </div>
            <div className="bar-month" style={{ left: cx, top: BASE_Y + 6 }}>
              {mo.label}
            </div>
          </div>
        )
      })}
    </>
  )
}
