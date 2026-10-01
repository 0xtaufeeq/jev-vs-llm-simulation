import { useMemo, useState } from 'react'
import { mulberry32 } from '../data'
import { JEV_IN, LLM_IN, LLM_OUT, QUIZ, fmtT, inTokFor, jevLatency, llmLatency, money, type Pick } from './examples'

function Stat({ k, v, tone }: { k: string; v: string; tone?: 'jev' | 'llm' }) {
  return (
    <div className="cmp-tile ex-stat">
      <div className="cmp-tile-label">{k}</div>
      <div className={`cmp-tile-jev${tone ? ` ex-${tone}` : ''}`}>{v}</div>
    </div>
  )
}

/* ---------- latency vs number of questions ---------- */
const QX = { l: 64, r: 610, t: 20, b: 260 }
const qx = (q: number) => QX.l + ((q - 1) / 19) * (QX.r - QX.l)
const qy = (s: number) => {
  const a = Math.log10(0.05)
  const b = Math.log10(20)
  return QX.b - ((Math.log10(s) - a) / (b - a)) * (QX.b - QX.t)
}
const linePath = (f: (q: number) => number) =>
  Array.from({ length: 20 }, (_, i) => `${i ? 'L' : 'M'}${qx(i + 1).toFixed(1)},${qy(f(i + 1)).toFixed(1)}`).join('')

export function QuestionsChart() {
  const [q, setQ] = useState(3)
  const llmPerM = (inTokFor(q) * LLM_IN + (150 + 22 * q) * LLM_OUT) * 1e6
  const jevPerM = inTokFor(q) * JEV_IN * 1e6
  const x = qx(q)
  return (
    <div className="ex-panel ex-pad">
      <label className="ex-ctl" htmlFor="qSlider">
        <span>
          Questions per decision <output>{q}</output>
        </span>
        <input id="qSlider" type="range" min={1} max={20} value={q} onChange={(e) => setQ(+e.target.value)} />
      </label>
      <div className="ex-chart">
        <svg viewBox="0 0 680 300" role="img" aria-label="Latency against number of questions, log scale">
          {([[0.1, '100 ms'], [0.3, '300 ms'], [1, '1 s'], [3, '3 s'], [10, '10 s']] as const).map(([v, l]) => (
            <g key={l}>
              <line x1={QX.l} x2={QX.r} y1={qy(v)} y2={qy(v)} stroke="#1f1f1f" />
              <text x={QX.l - 8} y={qy(v) + 4} textAnchor="end">
                {l}
              </text>
            </g>
          ))}
          {[1, 5, 10, 15, 20].map((n) => (
            <text key={n} x={qx(n)} y={QX.b + 22} textAnchor="middle">
              {n}
            </text>
          ))}
          <text x={(QX.l + QX.r) / 2} y={QX.b + 40} textAnchor="middle">
            questions per decision
          </text>
          <path d={linePath(llmLatency)} fill="none" stroke="var(--llm)" strokeWidth={2} />
          <path d={linePath(jevLatency)} fill="none" stroke="var(--jev)" strokeWidth={2} />
          <text x={QX.r + 8} y={qy(llmLatency(20)) + 4} className="ex-svg-llm">
            LLM
          </text>
          <text x={QX.r + 8} y={qy(jevLatency(20)) + 4} className="ex-svg-jev">
            Jev
          </text>
          <line x1={x} x2={x} y1={QX.t} y2={QX.b} stroke="#4a4a4a" strokeDasharray="3 4" />
          <circle cx={x} cy={qy(llmLatency(q))} r={5} fill="var(--llm)" stroke="var(--panel)" strokeWidth={2} />
          <circle cx={x} cy={qy(jevLatency(q))} r={5} fill="var(--jev)" stroke="var(--panel)" strokeWidth={2} />
        </svg>
      </div>
      <div className="ex-stats">
        <Stat k="LLM wait" v={fmtT(llmLatency(q))} tone="llm" />
        <Stat k="Jev wait" v={fmtT(jevLatency(q))} tone="jev" />
        <Stat k="LLM, per million calls" v={money(llmPerM)} tone="llm" />
        <Stat k="Jev, per million calls" v={money(jevPerM)} tone="jev" />
      </div>
      <p className="ex-note">
        Illustrative model. LLM: 0.7 s to first token, then about 150 reasoning tokens plus 22 output tokens per question at 60 tokens/s. Jev:
        90 ms plus 4 ms per question. Prices: Jev $0.042 per million input tokens with output free; LLM $2.50 in / $12.50 out.
      </p>
    </div>
  )
}

/* ---------- calibration dot plot ---------- */
const N = 80
// 80 imagined tickets: Jev's probabilities are calibrated (right with probability = confidence);
// the LLM gets the same tickets right but states 0.85–0.98 on everything.
const ITEMS = (() => {
  const r1 = mulberry32(20260928)
  const r2 = mulberry32(77)
  return Array.from({ length: N }, () => {
    const jc = 0.42 + 0.57 * Math.pow(r1(), 0.45)
    return { jc, ok: r1() < jc, lc: 0.85 + 0.13 * r2() }
  })
})()
const RIGHT = ITEMS.filter((d) => d.ok).length
const CX = { l: 30, r: 650, base: 196 }
const cxs = (c: number) => CX.l + ((c - 0.4) / 0.6) * (CX.r - CX.l)

export function Calibration() {
  const [mode, setMode] = useState<'jev' | 'llm'>('jev')
  const [thr, setThr] = useState(0.85)
  const key = mode === 'jev' ? 'jc' : 'lc'
  const dots = useMemo(() => {
    const bins = new Map<number, number>()
    return [...ITEMS]
      .sort((a, b) => a[key] - b[key])
      .map((d) => {
        const b = Math.floor((d[key] - 0.4) / 0.01)
        const k = (bins.get(b) ?? 0) + 1
        bins.set(b, k)
        return { x: cxs(0.4 + (b + 0.5) * 0.01), y: CX.base - 6 - (k - 1) * 10, c: d[key], ok: d.ok }
      })
  }, [key])
  const auto = ITEMS.filter((d) => d[key] >= thr)
  const errs = auto.filter((d) => !d.ok).length
  const tx = cxs(thr)

  return (
    <div className="ex-panel ex-pad">
      <div className="view-tabs ex-tabs" role="group" aria-label="Whose confidence">
        <button type="button" className={mode === 'jev' ? 'is-on' : ''} aria-pressed={mode === 'jev'} onClick={() => setMode('jev')}>
          Jev's probabilities
        </button>
        <button type="button" className={mode === 'llm' ? 'is-on' : ''} aria-pressed={mode === 'llm'} onClick={() => setMode('llm')}>
          LLM's stated confidence
        </button>
      </div>
      <div className="ex-legend">
        <span>
          <i style={{ background: 'var(--good)' }} />
          Correct
        </span>
        <span>
          <i style={{ background: 'var(--bad)' }} />
          Wrong
        </span>
        <span>Faded dots fall below the threshold and go to review</span>
      </div>
      <div className="ex-chart">
        <svg viewBox="0 0 680 250" role="img" aria-label="Dot plot of decisions by confidence">
          <rect x={CX.l} y={10} width={Math.max(0, tx - CX.l)} height={CX.base - 4} fill="#141414" />
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={4.3} fill={d.ok ? 'var(--good)' : 'var(--bad)'} opacity={d.c >= thr ? 1 : 0.25} />
          ))}
          <line x1={CX.l} x2={CX.r} y1={CX.base} y2={CX.base} stroke="#2a2a2a" />
          {[0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => (
            <text key={v} x={cxs(v)} y={CX.base + 20} textAnchor="middle">
              {v.toFixed(1)}
            </text>
          ))}
          <text x={(CX.l + CX.r) / 2} y={CX.base + 40} textAnchor="middle">
            confidence attached to the decision
          </text>
          <line x1={tx} x2={tx} y1={6} y2={CX.base} stroke="#ececec" strokeWidth={1.5} />
          <text x={Math.min(tx + 6, CX.r - 70)} y={20} className="ex-svg-jev">
            auto →
          </text>
          <text x={Math.max(tx - 6, CX.l + 70)} y={20} textAnchor="end">
            ← review
          </text>
        </svg>
      </div>
      <label className="ex-ctl" htmlFor="thr">
        <span>
          Auto-approve when confidence is at least <output>{thr.toFixed(2)}</output>
        </span>
        <input id="thr" type="range" min={0.4} max={0.99} step={0.01} value={thr} onChange={(e) => setThr(+e.target.value)} />
      </label>
      <div className="ex-stats">
        <Stat k="Handled automatically" v={`${auto.length} of ${N}`} tone={mode} />
        <Stat k="Mistakes let through" v={String(errs)} tone={mode} />
        <Stat k="Accuracy of automated set" v={auto.length ? `${Math.round(((auto.length - errs) / auto.length) * 100)}%` : '–'} tone={mode} />
        <Stat k="Sent to a person" v={String(N - auto.length)} />
      </div>
      <p className="ex-note">
        {mode === 'jev'
          ? `Both systems got ${RIGHT} of ${N} right (${Math.round((RIGHT / N) * 100)}%). Jev's probabilities spread out, and the mistakes collect at the low end, so raising the threshold removes them. That is what calibration buys you. Illustrative data.`
          : `Same ${RIGHT} right answers, but the LLM says it's 85–98% sure about everything. The mistakes are spread evenly, so any threshold either lets them through or sends almost everything to review. Illustrative data.`}
      </p>
    </div>
  )
}

/* ---------- cost calculator ---------- */
const VOL = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9]
const VOL_LABEL = ['1K', '10K', '100K', '1M', '10M', '100M', '1B']

export function CostCalc() {
  const [vi, setVi] = useState(3)
  const [tok, setTok] = useState(600)
  const [out, setOut] = useState(150)
  const [tier, setTier] = useState(2.5)
  const vol = VOL[vi]
  const pin = tier / 1e6
  const jc = vol * tok * JEV_IN
  const lc = vol * (tok * pin + out * pin * 5)
  const ratio = lc / jc
  return (
    <div className="ex-panel ex-pad">
      <div className="ex-ctls">
        <label className="ex-ctl" htmlFor="volR">
          <span>
            Decisions per month <output>{VOL_LABEL[vi]}</output>
          </span>
          <input id="volR" type="range" min={0} max={6} step={1} value={vi} onChange={(e) => setVi(+e.target.value)} />
        </label>
        <label className="ex-ctl" htmlFor="tokR">
          <span>
            Input tokens per decision <output>{tok.toLocaleString('en-US')}</output>
          </span>
          <input id="tokR" type="range" min={100} max={4000} step={100} value={tok} onChange={(e) => setTok(+e.target.value)} />
        </label>
        <label className="ex-ctl" htmlFor="outR">
          <span>
            LLM output tokens per decision <output>{out}</output>
          </span>
          <input id="outR" type="range" min={20} max={1000} step={10} value={out} onChange={(e) => setOut(+e.target.value)} />
        </label>
        <label className="ex-ctl" htmlFor="tier">
          <span>Compare against</span>
          <select id="tier" value={tier} onChange={(e) => setTier(+e.target.value)}>
            <option value={0.2}>Small LLM · $0.20 / $1.00</option>
            <option value={2.5}>Mid LLM · $2.50 / $12.50</option>
            <option value={10}>Frontier LLM · $10 / $50</option>
          </select>
        </label>
      </div>
      <div className="ex-cbars">
        <div className="ex-cbar">
          <span className="ex-llm">LLM</span>
          <span className="race-track">
            <span className="race-fill race-fill-llm" style={{ width: '100%' }} />
          </span>
          <span className="ex-amt">{money(lc)}/mo</span>
        </div>
        <div className="ex-cbar">
          <span className="ex-jev">Jev</span>
          <span className="race-track">
            <span className="race-fill race-fill-jev" style={{ width: `${Math.max(0.4, (jc / lc) * 100)}%` }} />
          </span>
          <span className="ex-amt">{money(jc)}/mo</span>
        </div>
      </div>
      <div className="ex-stats">
        <Stat k="Jev is cheaper by" v={`${ratio >= 10 ? Math.round(ratio).toLocaleString('en-US') : ratio.toFixed(1)}×`} tone="jev" />
        <Stat k="LLM wait per decision" v={`~${(0.7 + out / 60).toFixed(1)} s`} tone="llm" />
        <Stat k="Jev wait per decision" v="~0.1 s" tone="jev" />
        <Stat k="Saved per year" v={money((lc - jc) * 12)} />
      </div>
    </div>
  )
}

/* ---------- quiz ---------- */
export function Quiz() {
  const [picked, setPicked] = useState<Record<number, Pick>>({})
  const answered = Object.keys(picked).length
  const right = QUIZ.filter((q, i) => picked[i] === q.answer).length
  return (
    <>
      {answered > 0 && (
        <p className="ex-score">
          You've got {right} of {answered}.
        </p>
      )}
      <div className="ex-quiz">
        {QUIZ.map((q, i) => {
          const p = picked[i]
          return (
            <div key={q.task} className="ex-panel ex-qz">
              <p className="ex-task">{q.task}</p>
              <div className="ex-opts">
                {(['Jev', 'LLM', 'Both'] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    disabled={!!p}
                    className={p ? (o === q.answer ? 'is-right' : o === p ? 'is-wrong' : '') : ''}
                    onClick={() => setPicked((s) => ({ ...s, [i]: o }))}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {p && <p className="ex-why">{(p === q.answer ? 'Right. ' : `It's ${q.answer}. `) + q.why}</p>}
            </div>
          )
        })}
      </div>
    </>
  )
}
