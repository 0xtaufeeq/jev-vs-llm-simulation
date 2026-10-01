// Content and models for the Jev explainer page. Everything here is simulated from the ranges
// TypeSafe publishes (Jev 70–500 ms, $0.042 / M input tokens, output free). No network calls.

// $ per token
export const JEV_IN = 0.042e-6
export const LLM_IN = 2.5e-6
export const LLM_OUT = 12.5e-6

export function money(v: number) {
  if (v === 0) return '$0'
  if (v < 0.01) return '$' + v.toPrecision(2).replace(/0+$/, '')
  if (v < 100) return '$' + v.toFixed(2)
  return '$' + Math.round(v).toLocaleString('en-US')
}

export const fmtT = (s: number) => (s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(2)} s`)

export type Question =
  | { key: string; type: 'Choice' | 'Score'; prompt: string; out: [string, number][] }
  | { key: string; type: 'Noul'; prompt: string; p: number }

export interface Example {
  id: string
  label: string
  state: string
  jevMs: number
  inTok: number
  qs: Question[]
  llm: { reasoning: number; texts: string[]; error?: string; summary: string }
}

export const EXAMPLES: Example[] = [
  {
    id: 'bank',
    label: 'Bank transaction',
    state: 'UPI/DR/412893/SWIGGY INSTAMART/YESB/Payment\n₹1,284.00 · 14 Sep 2026 · HDFC savings account',
    jevMs: 118,
    inTok: 190,
    qs: [
      { key: 'category', type: 'Choice', prompt: 'Which of 8 spending categories?', out: [['Groceries', 0.78], ['Dining', 0.14], ['Shopping', 0.05], ['Other', 0.03]] },
      { key: 'recurring', type: 'Noul', prompt: 'Is this a recurring payment?', p: 0.31 },
      { key: 'unusual', type: 'Score', prompt: 'How unusual is this for the account?', out: [['low', 0.72], ['medium', 0.22], ['high', 0.06]] },
    ],
    llm: {
      reasoning: 160,
      texts: [
        '{"category": "Food & Dining", "recurring": false, "unusual": "low", "confidence": 0.95}',
        '{"category": "Groceries", "recurring": false, "unusual": "low", "confidence": 0.95}',
      ],
      error: 'Type error: "Food & Dining" is not one of the 8 allowed categories. Retrying.',
      summary: 'Groceries, with a stated confidence of 0.95 on both attempts',
    },
  },
  {
    id: 'incident',
    label: 'Incident report',
    state: 'Checkout returns 502 for about 8% of card payments since 14:05 UTC.\nPayment-provider webhook logs show timeouts. Storefront pages load normally.',
    jevMs: 96,
    inTok: 160,
    qs: [
      { key: 'owner', type: 'Choice', prompt: 'Which team owns the investigation?', out: [['Payments', 0.7], ['Storefront', 0.2], ['Insufficient evidence', 0.1]] },
      { key: 'impact', type: 'Score', prompt: 'How disruptive is the impact?', out: [['moderate', 0.61], ['severe', 0.27], ['minor', 0.12]] },
      { key: 'failed_purchases', type: 'Noul', prompt: 'Does the report describe failed purchases?', p: 0.93 },
    ],
    llm: {
      reasoning: 220,
      texts: ['{"owner": "Payments", "impact": "moderate", "failed_purchases": true, "confidence": "high"}'],
      summary: 'Payments, "high" confidence, with no probability for Storefront',
    },
  },
  {
    id: 'guard',
    label: 'Agent tool call',
    state: 'tool: bash → rm -rf ./dist && npm run build\nuser asked: "Rebuild the docs site" · cwd: ~/projects/docs',
    jevMs: 104,
    inTok: 150,
    qs: [
      { key: 'action', type: 'Choice', prompt: 'Allow, ask the user, or block?', out: [['allow', 0.64], ['ask the user', 0.31], ['block', 0.05]] },
      { key: 'deletes_outside', type: 'Noul', prompt: 'Does it delete data outside the project?', p: 0.04 },
      { key: 'risk', type: 'Score', prompt: 'How risky is this call?', out: [['low', 0.58], ['medium', 0.34], ['high', 0.08]] },
    ],
    llm: {
      reasoning: 260,
      texts: ['{"action": "allow", "deletes_outside_project": false, "risk": "low", "confidence": 0.9}'],
      summary: 'allow, confidence 0.9; the agent waited the whole time',
    },
  },
]

export const tokenize = (s: string) => s.match(/\s*[A-Za-z_]{1,5}|\s*\d+(?:\.\d+)?|\s*[^\sA-Za-z_\d]/g) ?? []

export interface Attempt {
  start: number
  first: number // first token
  reasonEnd: number
  streamEnd: number
  done: number
  txt: string
  toks: string[]
  ok: boolean
}

export interface LlmPlan {
  attempts: Attempt[]
  end: number
  inTok: number
  outTok: number
}

/** The LLM's timeline for one call: first token, hidden reasoning, streamed JSON, validation, maybe a retry. */
export function planLlm(ex: Example): LlmPlan {
  let t = 0
  let inTok = 0
  let outTok = 0
  const attempts = ex.llm.texts.map((txt, i) => {
    const toks = tokenize(txt)
    const reason = i ? Math.round(ex.llm.reasoning * 0.5) : ex.llm.reasoning
    const first = t + (i ? 0.55 : 0.75)
    const reasonEnd = first + reason / 90
    const streamEnd = reasonEnd + toks.length / 38
    const a: Attempt = { start: t, first, reasonEnd, streamEnd, done: streamEnd + 0.09, txt, toks, ok: i === ex.llm.texts.length - 1 }
    t = a.done + (a.ok ? 0 : 0.35)
    inTok += ex.inTok + 320 + (i ? 60 : 0)
    outTok += reason + toks.length
    return a
  })
  return { attempts, end: attempts[attempts.length - 1].done, inTok, outTok }
}

export const llmCallCost = (p: LlmPlan) => p.inTok * LLM_IN + p.outTok * LLM_OUT

// latency / cost vs number of questions (illustrative model, see the note under the chart)
export const llmLatency = (q: number) => 0.7 + (150 + 22 * q) / 60
export const jevLatency = (q: number) => 0.09 + 0.004 * q
export const inTokFor = (q: number) => 500 + 25 * q

export type Pick = 'Jev' | 'LLM' | 'Both'
export const QUIZ: { task: string; answer: Pick; why: string }[] = [
  { task: 'Route each support ticket to one of six teams', answer: 'Jev', why: 'The answers are a fixed list and the volume is high. That is a Choice question.' },
  { task: 'Draft a calm reply to an angry customer', answer: 'LLM', why: "This needs written prose, and Jev doesn't generate text." },
  { task: "Check whether an agent's bash command is safe before it runs", answer: 'Jev', why: 'This is a guardrail on every tool call. At around 100 ms it can check all of them without slowing the agent.' },
  { task: 'Summarise a 40-page contract', answer: 'LLM', why: 'The output is open-ended text.' },
  { task: 'Tag 200,000 product reviews by sentiment', answer: 'Jev', why: 'A Score question at a volume where LLM pricing hurts. Output tokens are free with Jev.' },
  { task: 'Pick which model should handle an incoming request', answer: 'Jev', why: "This is model routing, LangChain's ModelRouterMiddleware pattern." },
  { task: 'Explain why a deploy failed and propose a fix', answer: 'LLM', why: 'Multi-step reasoning with a written answer and code.' },
  { task: 'Triage the inbox, then write replies to the urgent emails', answer: 'Both', why: 'Jev scores urgency for everything, and an LLM writes replies only for the few that matter.' },
]
