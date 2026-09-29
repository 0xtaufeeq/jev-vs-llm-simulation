// LLM side of the Jev vs LLM comparison. Fully simulated — no network calls are ever made.
// A deterministic stand-in with realistic batch latency, token use at frontier-model pricing,
// and the kinds of mistakes LLMs make on ambiguous bank narrations.
import type { Category, Dataset } from './data'

export const LLM_LABEL = 'LLM'
// $ per token, typical frontier-model pricing ($4 in / $20 out per million)
const PRICE_IN = 4 / 1e6
const PRICE_OUT = 20 / 1e6
const BATCH = 25
const CONCURRENCY = 4

export interface LlmRun {
  labels: (Category | null)[] // per transaction, null until its batch returns
  readyAt: number[] // seconds after run start when the label arrived (Infinity = pending)
  batches: number
  inputTokens: number
  outputTokens: number
}

export const llmCost = (r: Pick<LlmRun, 'inputTokens' | 'outputTokens'>) => r.inputTokens * PRICE_IN + r.outputTokens * PRICE_OUT

function emptyRun(ds: Dataset): LlmRun {
  return {
    labels: ds.txns.map(() => null),
    readyAt: ds.txns.map(() => Infinity),
    batches: Math.ceil(ds.txns.length / BATCH),
    inputTokens: 0,
    outputTokens: 0,
  }
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Plausible confusions: ambiguous narrations where a model without the user's context guesses differently
// from call to call. [pattern, wrong label, probability per occurrence]
const CONFUSIONS: [RegExp, Category, number][] = [
  [/refund/i, 'Shopping', 0.55],
  [/instamart/i, 'Dining', 0.45],
  [/uber eats/i, 'Transport', 0.25],
  [/zerodha|sip/i, 'Bills', 0.4],
  [/house help|lakshmi/i, 'Bills', 0.5],
  [/zelle|check #/i, 'Bills', 0.35],
  [/recharge|fastag/i, 'Bills', 0.35],
  [/walgreens/i, 'Groceries', 0.35],
  [/target|dmart/i, 'Groceries', 0.25],
  [/cashout|trip split|upi from/i, 'Other', 0.45],
  [/interest/i, 'Other', 0.3],
  [/atm/i, 'Bills', 0.15],
]

/** Whole run is a pure function of the dataset, so ?t= frames stay deterministic. */
export function simulateLlm(ds: Dataset): LlmRun {
  const run = emptyRun(ds)
  const rnd = mulberry32(ds.txns.length * 7919 + 17)
  const lanes = Array(CONCURRENCY).fill(0.35) // first request leaves right after the file is read
  for (let b = 0; b < run.batches; b++) {
    const idx = ds.txns.slice(b * BATCH, (b + 1) * BATCH).map((t) => t.id)
    // a frontier model at low effort: a few seconds per 25-row structured-output call
    const latency = 3.4 + idx.length * 0.08 + rnd() * 2.2
    const lane = lanes.indexOf(Math.min(...lanes))
    const done = lanes[lane] + latency
    lanes[lane] = done
    run.inputTokens += 420 + idx.length * 34 // instructions + one JSON row per transaction
    run.outputTokens += 180 + idx.length * 14 // thinking at low effort + one label per row
    for (const i of idx) {
      const t = ds.txns[i]
      let label: Category = t.category
      for (const [re, wrong, p] of CONFUSIONS) {
        if (re.test(t.name) && rnd() < p) {
          label = wrong
          break
        }
      }
      if (label === t.category && t.amount < 0 && rnd() < 0.012) {
        // stray slip into a neighbouring bucket
        const near = (['Shopping', 'Other', 'Bills'] as Category[]).filter((c) => c !== t.category)
        label = near[Math.floor(rnd() * near.length)]
      }
      run.labels[i] = label
      run.readyAt[i] = done
    }
  }
  return run
}

// ---------------- comparison ----------------

export interface Comparison {
  n: number
  hasTruth: boolean
  jevAccuracy: number
  llmAccuracy: number
  agreement: number
  jevMs: number
  llmSeconds: number
  llmCostUsd: number
  jevConsistency: number
  llmConsistency: number
  repeatedMerchants: number
  misses: { name: string; jev: Category; llm: Category; count: number }[]
  unlabelled: number
}

/** share of repeated merchants that always received the same label */
function consistency(ds: Dataset, labels: (Category | null)[]) {
  const seen = new Map<string, Set<string>>()
  const counts = new Map<string, number>()
  ds.txns.forEach((t, i) => {
    const key = t.name.toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (!seen.has(key)) seen.set(key, new Set())
    seen.get(key)!.add(labels[i] ?? '∅')
  })
  const repeated = [...counts].filter(([, c]) => c > 1).map(([k]) => k)
  const stable = repeated.filter((k) => seen.get(k)!.size === 1).length
  return { repeated: repeated.length, rate: repeated.length ? stable / repeated.length : 1 }
}

export function compare(ds: Dataset, jevLabels: Category[], jevMs: number, truth: Category[] | null, llm: LlmRun): Comparison {
  const n = ds.txns.length
  const acc = (labels: (Category | null)[]) => (truth ? labels.filter((l, i) => l === truth[i]).length / n : NaN)
  const agree = jevLabels.filter((l, i) => l === llm.labels[i]).length / n

  const missMap = new Map<string, { name: string; jev: Category; llm: Category; count: number }>()
  ds.txns.forEach((t, i) => {
    const l = llm.labels[i]
    if (!l || l === jevLabels[i]) return
    const key = `${t.name}|${l}`
    const m = missMap.get(key) ?? { name: t.name, jev: jevLabels[i], llm: l, count: 0 }
    m.count++
    missMap.set(key, m)
  })

  const jc = consistency(ds, jevLabels)
  const lc = consistency(ds, llm.labels)
  const finite = llm.readyAt.filter(Number.isFinite)
  return {
    n,
    hasTruth: !!truth,
    jevAccuracy: acc(jevLabels),
    llmAccuracy: acc(llm.labels),
    agreement: agree,
    jevMs,
    llmSeconds: finite.length ? Math.max(...finite) : 0,
    llmCostUsd: llmCost(llm),
    jevConsistency: jc.rate,
    llmConsistency: lc.rate,
    repeatedMerchants: jc.repeated,
    misses: [...missMap.values()].sort((a, b) => b.count - a.count),
    unlabelled: llm.labels.filter((l) => !l).length,
  }
}
