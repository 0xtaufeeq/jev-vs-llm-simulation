import { useMemo } from 'react'
import { COLORS, type Money, type Txn } from '../data'
import type { LlmRun } from '../llm'
import { T, clamp01, easeInOut, lerp, win } from '../timeline'

// Stage geometry (px), measured from the reference recording
export const STACK_X = 254
export const STACK_W = 134
export const STACK_BOTTOM = 568
const STACK_MAX_H = 318
const CARD_H = 148
const MAX_LINES = 207

interface Key {
  p: number
  x: number
  y: number
  ry: number
  rz: number
  o: number
}

// Card flight path: stack top → fanned → front (badge stamped) → out to the right
const PATH: Key[] = [
  { p: 0, x: 0, y: 0, ry: 0, rz: 0, o: 1 },
  { p: 0.25, x: 4, y: -7, ry: 0, rz: -0.8, o: 1 },
  { p: 0.5, x: 18, y: -20, ry: 0, rz: -0.4, o: 1 },
  { p: 0.72, x: 46, y: -28, ry: 0, rz: 0, o: 1 },
  { p: 0.86, x: 122, y: -27, ry: -28, rz: 0, o: 0.6 },
  { p: 1, x: 200, y: -24, ry: -52, rz: 0, o: 0 },
]

function pose(p: number) {
  let i = 0
  while (i < PATH.length - 2 && p > PATH[i + 1].p) i++
  const a = PATH[i]
  const b = PATH[i + 1]
  const t = easeInOut(clamp01((p - a.p) / (b.p - a.p)))
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    o: lerp(a.o, b.o, t),
  }
}

// deterministic per-line jitter so the stack looks hand-piled
function jitter(i: number) {
  const s = Math.sin(i * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

interface Props {
  txns: Txn[]
  e: number // seconds since run start
  c: number // cards dealt
  fadeOut: number // 0..1 at end
  fmt: Money
  llm: LlmRun | null
}

export function Stack({ txns, e, c, fadeOut, fmt, llm }: Props) {
  const n = txns.length
  const lines = Math.min(n, MAX_LINES)
  const lineH = Math.min(STACK_MAX_H / lines, 4)

  const jit = useMemo(
    () => Array.from({ length: lines }, (_, i) => ({ dx: (jitter(i) - 0.5) * 2.4, rot: (jitter(i + 97) - 0.5) * 0.7, w: (jitter(i + 31) - 0.5) * 1.6 })),
    [lines],
  )

  // intro: edges fall from a loose spread into a tight pile
  const settle = easeInOut(win(e, 0, T.READ_END))
  const introFade = win(e, 0, 0.25)

  const head = Math.ceil(c) // index of the card currently face-up on the pile
  const under = Math.max(0, n - 1 - head)
  const linesShown = n > 0 ? Math.round((under / n) * lines) : 0
  const stackTop = STACK_BOTTOM - linesShown * lineH

  const flip = e < T.READ_END ? 0 : easeInOut(win(e, T.READ_END, T.FLIP_END - T.READ_END))

  const lineEls = []
  for (let j = 0; j < linesShown; j++) {
    const finalY = STACK_BOTTOM - (j + 1) * lineH
    const looseY = STACK_BOTTOM - 523 * Math.pow((j + 1) / lines, 3)
    const y = lerp(looseY, finalY, settle)
    const jj = jit[j]
    lineEls.push(
      <div
        key={j}
        className="stack-line"
        style={{
          transform: `translate(${STACK_X + jj.dx * (1 - settle * 0.4)}px, ${y}px) rotate(${jj.rot * (1.6 - settle)}deg)`,
          width: STACK_W + jj.w,
          height: Math.max(1.4, lineH),
        }}
      />,
    )
  }

  const cards = []
  for (let i = Math.max(0, head - T.SLOTS); i <= head && i < n; i++) {
    const raw = (c - i) / T.SLOTS
    if (raw >= 1) continue
    const p = clamp01(raw)
    const pz = pose(p)
    const t = txns[i]
    const isFace = i === head && p === 0
    const badge = clamp01((c - i - 1.4) / 0.5)
    const flipDeg = isFace && e < T.FLIP_END ? (1 - flip) * 90 : 0
    if (isFace && e < T.READ_END) continue
    cards.push(
      <div
        key={t.id}
        className="card"
        style={{
          transform: `translate3d(${STACK_X + pz.x}px, ${stackTop - CARD_H + pz.y}px, 0) rotateY(${pz.ry}deg) rotateZ(${pz.rz}deg) rotateX(${flipDeg}deg)`,
          opacity: pz.o * (isFace && e < T.FLIP_END ? 0.35 + 0.65 * flip : 1),
          zIndex: 10 + Math.round(p * 100),
        }}
      >
        <div className="card-date">{fmt.date(t.date)}</div>
        <div className="card-name">{t.name}</div>
        <div
          className="card-badge"
          style={{ opacity: badge, transform: `scale(${lerp(1.35, 1, easeInOut(badge))})` }}
        >
          <span className="card-badge-dot" style={{ background: COLORS[t.category] }} />
          {t.category}
        </div>
        <div className="card-amount">{fmt.card(t.amount)}</div>
        {llm && badge > 0 && (
          <div className="card-llm" style={{ opacity: badge }}>
            {llm.readyAt[t.id] <= e && llm.labels[t.id] ? (
              llm.labels[t.id] === t.category ? (
                <span className="card-llm-ok">LLM · {llm.labels[t.id]} ✓</span>
              ) : (
                <span className="card-llm-bad">LLM · {llm.labels[t.id]} ✗</span>
              )
            ) : (
              <span className="card-llm-wait">LLM · thinking…</span>
            )}
          </div>
        )}
        <div className="card-shade" style={{ opacity: Math.min(0.85, -pz.ry / 50) }} />
      </div>,
    )
  }

  return (
    <div className="stack" style={{ opacity: introFade * (1 - fadeOut) }}>
      {lineEls}
      {cards}
    </div>
  )
}
