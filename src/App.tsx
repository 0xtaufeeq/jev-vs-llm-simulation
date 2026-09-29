import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, buildIndiaDataset, buildSampleDataset, categorize, moneyFor, monthKey, parseCsv, type Category, type Dataset } from './data'
import { compare, simulateLlm, type LlmRun } from './llm'
import { Race } from './components/Race'
import { Compare } from './components/Compare'
import { T, dealt, ratesFor, timeToDeal, win } from './timeline'
import { Stack } from './components/Stack'
import { DonutAndLegend, MoneyInOut } from './components/Charts'
import { Summary } from './components/Summary'
import { Caption } from './components/Caption'
import { Idle, type SampleOption } from './components/Idle'

const STAGE_W = 1166
const STAGE_H = 692

type Phase = 'idle' | 'run'

const zeroCounts = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>

/** prefix sums so any "first k categorized" state is O(categories × months) */
function usePrefix(ds: Dataset) {
  return useMemo(() => {
    const monthIdx = new Map(ds.months.map((m, i) => [m.key, i]))
    const nc = CATEGORIES.length
    const counts: Int32Array[] = [new Int32Array(nc)]
    // flows[k][month * nc + category]: money in / out among the first k categorized cards
    const ins: Float64Array[] = [new Float64Array(ds.months.length * nc)]
    const outs: Float64Array[] = [new Float64Array(ds.months.length * nc)]
    const txMonth: number[] = []
    ds.txns.forEach((t) => {
      const ci = CATEGORIES.indexOf(t.category)
      const c = new Int32Array(counts[counts.length - 1])
      c[ci]++
      counts.push(c)
      const mi = monthIdx.get(monthKey(t.date))
      txMonth.push(mi ?? -1)
      const iArr = new Float64Array(ins[ins.length - 1])
      const oArr = new Float64Array(outs[outs.length - 1])
      if (mi !== undefined) {
        if (t.amount < 0) oArr[mi * nc + ci] += -t.amount
        else iArr[mi * nc + ci] += t.amount
      }
      ins.push(iArr)
      outs.push(oArr)
    })
    const outBy = zeroCounts()
    const inBy = zeroCounts()
    ds.txns.forEach((t) => {
      if (t.amount < 0) outBy[t.category] += -t.amount
      else inBy[t.category] += t.amount
    })
    const monthTotals = (arr: Float64Array) => ds.months.map((_, j) => arr.slice(j * nc, (j + 1) * nc).reduce((s, v) => s + v, 0))
    const finalIn = monthTotals(ins[ins.length - 1])
    const finalOut = monthTotals(outs[outs.length - 1])
    return { counts, ins, outs, txMonth, outBy, inBy, finalIn, finalOut }
  }, [ds])
}

export default function App() {
  const samples = useMemo(() => ({ us: buildSampleDataset(), india: buildIndiaDataset() }), [])
  const sampleOptions: SampleOption[] = [
    { id: 'us', label: 'US sample · 3 mo', file: samples.us.fileName },
    { id: 'india', label: 'India sample · 6 mo', file: samples.india.fileName },
  ]
  const sample = samples.us
  const [ds, setDs] = useState<Dataset>(sample)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [scale, setScale] = useState(1)
  const [clock, setClock] = useState({ now: 0, dt: 0.016 })
  const t0 = useRef(0)
  // ?t=9.5 freezes the timeline at that second (handy for comparing frames)
  const [frozenAt] = useState(() => {
    const v = parseFloat(new URLSearchParams(window.location.search).get('t') ?? '')
    return isNaN(v) ? null : v
  })
  const idleSince = useRef(0)
  const [llm, setLlm] = useState<LlmRun | null>(null)
  const llmRef = useRef<LlmRun | null>(null)
  const [view, setView] = useState<'auto' | 'breakdown' | 'compare'>('auto')
  const compareAtRef = useRef(Infinity)

  // fit the fixed-size stage to the window
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H, 1.9))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const n = ds.txns.length
  const rates = useMemo(() => ratesFor(n), [n])
  const sortDur = useMemo(() => timeToDeal(n + T.SLOTS, rates), [n, rates])
  const summaryAt = T.SORT_START + sortDur + T.SUMMARY_GAP
  // Jev's progress IS the card deal: the last card is stamped once c reaches n + 1
  const jevSpan = useMemo(() => timeToDeal(n - 1 + T.CATEGORIZED_AT, rates), [n, rates])
  const endAt = summaryAt + 2.5

  // single animation clock
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      setClock({ now, dt })
      const elapsed = (now - t0.current) / 1000
      const r = llmRef.current
      const llmPending = !!r && r.readyAt.some((x) => !(x <= elapsed))
      const busy = elapsed < endAt || llmPending || elapsed < compareAtRef.current + 1.5
      if (phase === 'idle' ? now - idleSince.current < 1500 : elapsed < (frozenAt !== null ? 1.5 : Infinity) && busy)
        raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, endAt, frozenAt])

  const start = useCallback((next: Dataset) => {
    setError(null)
    setDs(next)
    setView('auto')
    t0.current = performance.now()
    // the LLM starts on the same statement at the same moment Jev does
    setLlm(simulateLlm(next))
    setPhase('run')
  }, [])


  // ?autoplay starts a sample right away, like the reference recording (?autoplay=india for the ₹ one)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const which = q.get('autoplay') || q.get('sample')
    if (q.has('autoplay') || q.has('t')) start(which === 'india' ? samples.india : samples.us)
  }, [start, samples])

  const handleFile = useCallback(
    async (f: File) => {
      try {
        start(parseCsv(await f.text(), f.name))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that file.')
      }
    },
    [start],
  )

  const reset = useCallback(() => {
    setLlm(null)
    idleSince.current = performance.now()
    setPhase('idle')
    setDs(sample)
  }, [sample])

  // --- derive the whole frame from elapsed time ---
  const running = phase === 'run'
  const e = running ? (frozenAt ?? (clock.now - t0.current) / 1000) : 0
  const c = running ? Math.min(n + T.SLOTS, dealt(e - T.SORT_START, rates)) : 0
  const k = c >= T.CATEGORIZED_AT ? Math.min(n, Math.floor(c - T.CATEGORIZED_AT) + 1) : 0
  const sorted = running && e >= T.SORT_START + sortDur
  const sSummary = running ? e - summaryAt : -1
  const inSummary = sSummary >= 0

  const pre = usePrefix(ds)
  const countsArr = pre.counts[k]
  const counts = zeroCounts()
  CATEGORIES.forEach((cat, i) => (counts[cat] = countsArr[i]))
  const nc = CATEGORIES.length
  const grid = (arr: Float64Array) => ds.months.map((_, j) => Array.from(arr.subarray(j * nc, (j + 1) * nc)))
  const inCur = grid(pre.ins[k])
  const outCur = grid(pre.outs[k])
  const fmt = useMemo(() => moneyFor(ds.currency), [ds.currency])
  const activeMonth = k > 0 ? pre.txMonth[k - 1] : -1

  // Jev = the rules engine; time it on the whole statement (averaged, since one pass is sub-millisecond)
  const jev = useMemo(() => {
    // browsers coarsen performance.now(), so repeat for ~10 ms and divide
    let labels: Category[] = []
    let reps = 0
    let elapsed = 0
    const t = performance.now()
    do {
      labels = ds.txns.map((x) => categorize(x.name, x.amount))
      reps++
      elapsed = performance.now() - t
    } while (elapsed < 10 && reps < 20000)
    return { labels, ms: elapsed / reps }
  }, [ds])
  const truth = useMemo(() => (ds.labelled ? ds.txns.map((t) => t.category) : null), [ds])
  // Put the LLM on the same clock as the cards: it starts when dealing starts, keeps its simulated
  // batch rhythm, and always lands visibly after Jev (at least 1.4x Jev's on-screen time).
  const llmVis = useMemo(() => {
    if (!llm) return null
    const modeled = Math.max(...llm.readyAt)
    const span = Math.max(modeled, jevSpan * 1.4)
    const scale = span / modeled
    return { run: { ...llm, readyAt: llm.readyAt.map((x) => T.SORT_START + x * scale) }, scale, modeled }
  }, [llm, jevSpan])
  llmRef.current = llmVis?.run ?? null
  const llmFinishedAt = llmVis ? T.SORT_START + llmVis.modeled * llmVis.scale : Infinity
  const compareAt = running && llm ? Math.max(summaryAt + 2, llmFinishedAt + 0.4) : Infinity
  compareAtRef.current = compareAt
  const compareReady = running && e >= compareAt
  const showCompare = compareReady && view !== 'breakdown'
  const cmp = useMemo(
    () => (compareReady && llm ? compare(ds, jev.labels, jev.ms, truth, llm) : null),
    [compareReady, llm, ds, jev, truth],
  )

  let captionText: string
  let captionKey: string
  if (!running) {
    captionText = error ?? 'Jev sorts every transaction for you'
    captionKey = error ? `err-${error}` : 'idle'
  } else if (e < T.READ_END) {
    captionText = `Reading ${ds.fileName}`
    captionKey = 'reading'
  } else if (k === 0) {
    captionText = `${ds.source} · ${n} transactions`
    captionKey = 'ready'
  } else {
    captionText = `${ds.source} · ${k} / ${n}`
    captionKey = 'sorting'
  }
  const captionFade = inSummary ? 1 - win(sSummary, 0, 0.25) : 1

  return (
    <div
      className="viewport"
      onDragOver={(ev) => {
        ev.preventDefault()
        if (!running) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(ev) => {
        ev.preventDefault()
        setDragging(false)
        const f = ev.dataTransfer.files?.[0]
        if (f && !running) handleFile(f)
      }}
    >
      <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        {running ? (
          !inSummary || sSummary < 0.3 ? (
            <Stack txns={ds.txns} e={e} c={c} fmt={fmt} llm={llmVis?.run ?? null} fadeOut={inSummary ? win(sSummary, 0, 0.25) : 0} />
          ) : null
        ) : (
          <Idle
            dragging={dragging}
            samples={sampleOptions}
            onSample={(id) => start(id === 'india' ? samples.india : samples.us)}
            onFile={handleFile}
          />
        )}

        {captionFade > 0 && <Caption text={captionText} revealKey={`${phase}-${captionKey}`} opacity={captionFade} tone={error && !running ? 'error' : 'muted'} />}

        <div className={`view${showCompare ? ' is-hidden' : ''}`}>
        <DonutAndLegend counts={counts} k={k} n={running ? n : 0} done={sorted || !running} dt={clock.dt} now={clock.now} />
        <MoneyInOut
          months={ds.months}
          inCur={inCur}
          outCur={outCur}
          finalIn={pre.finalIn}
          finalOut={pre.finalOut}
          activeMonth={activeMonth}
          done={sorted}
          showGhost={running}
          dt={clock.dt}
          short={fmt.short}
        />
        </div>

        {showCompare && cmp && llm && (
          <div className="view view-compare">
            <Compare cmp={cmp} />
          </div>
        )}

        {compareReady && (
          <div className="view-tabs" role="tablist">
            <button role="tab" aria-selected={!showCompare} className={!showCompare ? 'is-on' : ''} onClick={() => setView('breakdown')}>
              Breakdown
            </button>
            <button role="tab" aria-selected={showCompare} className={showCompare ? 'is-on' : ''} onClick={() => setView('compare')}>
              Jev vs LLM
            </button>
          </div>
        )}

        {running && llmVis && (
          <Race n={n} k={k} e={e - T.SORT_START} jevMs={jev.ms} llm={llmVis.run} llmScale={llmVis.scale} llmModeled={llmVis.modeled} />
        )}

        {inSummary && <Summary s={sSummary} n={n} counts={counts} outBy={pre.outBy} inBy={pre.inBy} fmt={fmt} onReset={reset} />}
      </div>
    </div>
  )
}
