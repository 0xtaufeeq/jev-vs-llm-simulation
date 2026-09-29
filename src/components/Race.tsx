import { LLM_LABEL, llmCost, type LlmRun } from '../llm'
import { T } from '../timeline'

interface Props {
  n: number
  k: number // cards Jev has stamped so far (same count the left side shows)
  e: number // seconds since dealing started
  jevMs: number // measured compute time for the whole statement
  llm: LlmRun // readyAt already mapped onto the on-screen clock
  llmScale: number // on-screen seconds per simulated second
  llmModeled: number // simulated total seconds
}

export const fmtMs = (ms: number) => (ms < 0.01 ? '<0.01 ms' : ms < 1 ? `${ms.toFixed(2)} ms` : ms < 1000 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(1)} s`)
export const fmtUsd = (v: number) => (v === 0 ? '$0' : v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(3)}`)

/** Jev vs LLM progress on one shared clock: Jev tracks the card deal, the LLM its batches */
export function Race({ n, k, e, jevMs, llm, llmScale, llmModeled }: Props) {
  const jevDone = k === n
  const done = llm.readyAt.filter((r) => r <= e + T.SORT_START).length
  const llmDone = done === n
  const elapsed = llmDone ? llmModeled : Math.min(llmModeled, Math.max(0, e) / llmScale)
  // the full token bill is known up front; show it accruing with progress
  const cost = llmCost(llm) * (done / n)

  return (
    <div className="race" style={{ left: 561, top: 598 }}>
      <div className="race-row">
        <span className="race-name">Jev rules</span>
        <span className="race-track">
          <span className="race-fill race-fill-jev" style={{ width: `${(k / n) * 100}%` }} />
        </span>
        <span className="race-stat">
          {k}/{n}
          {jevDone ? ` · ${fmtMs(jevMs)}` : ''} · $0
        </span>
      </div>
      <div className="race-row">
        <span className="race-name">{LLM_LABEL}</span>
        <span className="race-track">
          <span className="race-fill race-fill-llm" style={{ width: `${(done / n) * 100}%` }} />
        </span>
        <span className="race-stat">
          {done}/{n} · {elapsed.toFixed(1)} s · {fmtUsd(cost)}
        </span>
      </div>
    </div>
  )
}
