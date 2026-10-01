import { Fragment, useEffect, useMemo, useState } from 'react'
import { COLORS, type Category } from '../data'
import { EXAMPLES, JEV_IN, fmtT, llmCallCost, money, planLlm, type Attempt, type Example, type LlmPlan } from './examples'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function attemptView(a: Attempt, t: number, ex: Example) {
  if (t < a.first) return { label: a.start ? 'Retry: waiting for first token' : 'Waiting for first token', tone: 'live', text: null, caret: false, bad: false }
  if (t < a.reasonEnd) return { label: `Reasoning · ${Math.floor((t - a.first) * 90)} hidden tokens`, tone: 'live', text: null, caret: false, bad: false }
  if (t < a.streamEnd) {
    const n = Math.floor((t - a.reasonEnd) * 38)
    return { label: `Writing answer · ${n} tokens`, tone: 'live', text: a.toks.slice(0, n).join(''), caret: true, bad: false }
  }
  if (t < a.done) return { label: 'Parsing and validating JSON', tone: 'live', text: a.txt, caret: false, bad: false }
  if (a.ok) return { label: '✓ Parsed and matches the schema', tone: 'ok', text: a.txt, caret: false, bad: false }
  return { label: ex.llm.error ?? '', tone: 'err', text: a.txt, caret: false, bad: true }
}

function LlmLane({ ex, plan, t }: { ex: Example; plan: LlmPlan; t: number }) {
  return (
    <>
      {plan.attempts
        .filter((a) => t >= a.start)
        .map((a, i) => {
          const v = attemptView(a, t, ex)
          return (
            <Fragment key={i}>
              <div className={`ex-status is-${v.tone}`}>
                <span className="ex-dot" />
                {v.label}
              </div>
              {v.text !== null && (
                <pre className={`ex-stream${v.bad ? ' is-bad' : ''}`}>
                  {v.text}
                  {v.caret && <span className="ex-caret" />}
                </pre>
              )}
            </Fragment>
          )
        })}
      {t >= plan.end && (
        <div className="ex-foot">
          <span>Answer: {ex.llm.summary}</span>
          <span>
            {plan.inTok} in · {plan.outTok} out tokens
          </span>
          <span>{money(llmCallCost(plan))}</span>
        </div>
      )}
    </>
  )
}

function JevLane({ ex, t }: { ex: Example; t: number }) {
  if (t < ex.jevMs / 1000)
    return (
      <div className="ex-status is-live">
        <span className="ex-dot" />
        Evaluating {ex.qs.length} questions in one pass
      </div>
    )
  return (
    <>
      <div className="ex-status is-ok">
        <span className="ex-dot" />✓ All {ex.qs.length} answers arrived together, typed
      </div>
      <div className="ex-qs">
        {ex.qs.map((q) => {
          const rows: [string, number][] = q.type === 'Noul' ? [['true', q.p], ['false', +(1 - q.p).toFixed(2)]] : q.out
          const max = Math.max(...rows.map((r) => r[1]))
          return (
            <div key={q.key}>
              <div className="ex-q-head">
                <code>{q.key}</code>
                <span className="ex-tag">{q.type}</span>
              </div>
              <p className="ex-q-prompt">{q.prompt}</p>
              {rows.map(([o, v]) => (
                <div key={o} className={`ex-bar-row${v === max ? ' is-top' : ''}`}>
                  <span className="ex-opt">
                    {o in COLORS && <span className="legend-dot" style={{ background: COLORS[o as Category], width: 6, height: 6 }} />}
                    {o}
                  </span>
                  <span className="ex-bar">
                    <i style={{ width: `${v * 100}%` }} />
                  </span>
                  <span className="ex-pv">{v.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="ex-foot">
        <span>{ex.inTok} input tokens</span>
        <span>output free</span>
        <span>{money(ex.inTok * JEV_IN)}</span>
      </div>
    </>
  )
}

/** Hero: the same input sent to an LLM and to Jev, on one real-time clock. */
export function RaceDemo() {
  const [id, setId] = useState(EXAMPLES[0].id)
  const [run, setRun] = useState(0)
  const [t, setT] = useState(0)
  const ex = EXAMPLES.find((e) => e.id === id) ?? EXAMPLES[0]
  const plan = useMemo(() => planLlm(ex), [ex])

  useEffect(() => {
    if (reduceMotion()) {
      setT(Infinity)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const s = (now - t0) / 1000
      setT(s)
      if (s < plan.end) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [plan, run])

  const restart = (next: string) => {
    setId(next)
    setT(0)
    setRun((r) => r + 1)
  }
  const done = t >= plan.end
  const llmCost = llmCallCost(plan)
  const jevCost = ex.inTok * JEV_IN

  return (
    <div className="ex-panel ex-bench">
      <div className="ex-bench-top">
        <div className="view-tabs ex-tabs" role="group" aria-label="Example input">
          {EXAMPLES.map((e) => (
            <button key={e.id} type="button" className={e.id === id ? 'is-on' : ''} aria-pressed={e.id === id} onClick={() => restart(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
        <button type="button" className="idle-sample ex-btn" onClick={() => restart(id)}>
          ▶ Race again
        </button>
      </div>
      <div className="ex-state">
        <span className="section-title">State</span>
        <pre>{ex.state}</pre>
        <span className="section-title">Questions</span>
        <div className="ex-qlist">
          {ex.qs.map((q) => (
            <span key={q.key}>
              <b>{q.key}</b>: {q.type}
            </span>
          ))}
        </div>
      </div>
      <div className="ex-lanes">
        <div className="ex-lane">
          <div className="ex-lane-head">
            <div>
              <div className="ex-lane-name ex-llm">LLM</div>
              <div className="ex-lane-sub">Writes JSON one token at a time</div>
            </div>
            <div className="ex-clock ex-llm">{Math.min(t, plan.end).toFixed(2)} s</div>
          </div>
          <div className="ex-lane-body">
            <LlmLane ex={ex} plan={plan} t={t} />
          </div>
        </div>
        <div className="ex-lane">
          <div className="ex-lane-head">
            <div>
              <div className="ex-lane-name ex-jev">Jev</div>
              <div className="ex-lane-sub">Answers every question in one pass</div>
            </div>
            <div className="ex-clock ex-jev">{fmtT(Math.min(t, ex.jevMs / 1000))}</div>
          </div>
          <div className="ex-lane-body">
            <JevLane ex={ex} t={t} />
          </div>
        </div>
      </div>
      <div className="ex-verdict">
        {done ? (
          <span>
            Jev answered in <b className="ex-jev">{fmtT(ex.jevMs / 1000)}</b>. The LLM took <b className="ex-llm">{plan.end.toFixed(2)} s</b>,{' '}
            {Math.round((plan.end * 1000) / ex.jevMs)}× longer, and cost {Math.round(llmCost / jevCost)}× more for this one call.
          </span>
        ) : (
          <span>Racing…</span>
        )}
      </div>
    </div>
  )
}
