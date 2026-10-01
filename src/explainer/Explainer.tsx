import type { ReactNode } from 'react'
import { RaceDemo } from './RaceDemo'
import { Calibration, CostCalc, QuestionsChart, Quiz } from './Interactives'

function Head({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="ex-head">
      <span className="section-title">{kicker}</span>
      <h2>{title}</h2>
      {children && <p className="ex-lede">{children}</p>}
    </div>
  )
}

const TOKENS = Array.from({ length: 28 }, (_, i) => i)

const PATTERN_1 = `from langchain_typesafe import (
    Noul, TypeSafeClassifier)

clf = TypeSafeClassifier()
r = clf.invoke({
  "state": "The deploy failed twice and
            customers are seeing 500s.",
  "questions": {
    "urgent": Noul(instructions=
      "Does this need attention now?"),
  },
})
if r.nouls["urgent"].noul > 0.8:
    escalate_to_llm(ticket)`

const PATTERN_2 = `from langchain_typesafe.experimental\\
  .middleware import (
    ModelChoice, ModelRouterMiddleware)

router = ModelRouterMiddleware(
  choices={
    "fast": ModelChoice(
      model="openai:luna",
      criteria="Direct lookups"),
    "powerful": ModelChoice(
      model="openai:sol",
      criteria="Complex decisions"),
  },
  instructions="Choose the least costly
    model that can complete the task.")`

const PATTERN_3 = `from langchain.agents import create_agent
from langchain_typesafe.experimental\\
  .middleware import AutoModeMiddleware

guardrail = AutoModeMiddleware(
    tools=["bash"])

agent = create_agent(
    "openai:gpt-5.6-luna",
    middleware=[guardrail])`

const TABLE: [string, string, string][] = [
  ['Returns', 'Text: a string you parse', 'Typed values: a choice, a score, a probability'],
  ['Sampling', 'One token at a time, in order', 'All answers in one parallel pass'],
  ['Trained for', 'Human preference (RLHF) and verifiable rewards (RLVR)', 'Calibrated decisions (RLCD)'],
  ['Input shape', 'A sequence of messages', 'Program state plus questions'],
  ['Confidence', 'Self-reported, often overconfident and inconsistent', 'Built in; higher confidence goes with higher accuracy'],
  ['Type errors', 'Possible: broken JSON, values outside the schema', 'None: answers always fit the schema'],
  ['Latency', '3 s to 329 s for frontier models', '70 ms to 500 ms end to end'],
  ['Price', '$0.20–$10 per M input tokens; output ~5× input', '$0.042 per M input tokens; output free'],
  ['One more question', 'More output tokens, more seconds', 'A few input tokens; time barely moves'],
  ['Writes prose or code', 'Yes', 'No'],
  ['Inputs', 'Text, and images or audio on many models', 'Text only; transcribe or describe media first'],
]

export function Explainer() {
  return (
    <main className="ex">
      <header className="ex-hero">
        <a className="ex-back" href="./">
          ← Transaction categorization demo
        </a>
        <span className="section-title">TypeSafe AI · System One model · early access since 28 Sep 2026</span>
        <h1>
          <span className="ex-muted">LLMs write.</span>
          <br />
          Jev decides.
        </h1>
        <p className="ex-lede ex-lede-hero">
          Jev is a model that doesn't generate text. You hand it some state and a few questions, and it returns{' '}
          <strong>typed answers with calibrated probabilities</strong> in about a tenth of a second.
        </p>
        <RaceDemo />
        <p className="ex-note">
          Simulation. Timings sit inside the ranges TypeSafe publishes (Jev 70–500 ms; frontier LLMs 3 s and up). LLM cost assumes $2.50 / $12.50
          per million input / output tokens. Jev's probabilities are illustrative; the incident example uses the figures from Vercel's explainer.
        </p>
      </header>

      <section>
        <Head kicker="The name" title="Thinking, fast and slow">
          TypeSafe borrowed the idea from Daniel Kahneman's two modes of thought. Chat models act like System 2. Jev is built to be System 1.
        </Head>
        <div className="ex-twin">
          <div className="ex-panel ex-card is-llm">
            <span className="section-title ex-llm">System 2 · slow, deliberate</span>
            <h3>Large language models</h3>
            <p>
              They reason out loud, one token after another, and they're good at open-ended work: drafting, explaining, planning, writing code.
              Training optimises them for human preference (RLHF) and verifiable rewards (RLVR). The output is a string, so your code has to parse
              it, validate it and hope the confidence it states means something.
            </p>
          </div>
          <div className="ex-panel ex-card is-jev">
            <span className="section-title ex-jev">System 1 · fast, intuitive</span>
            <h3>Jev, a System One model</h3>
            <p>
              Jev makes focused judgement calls: which team, how risky, is this true. You define the possible answers up front, and Jev returns a
              probability for each, sampled in parallel in a single query. It's trained with <b>Reinforcement Learning for Calibrated Decisions
              (RLCD)</b>, so when it says 0.9 it should be right about nine times in ten.
            </p>
          </div>
        </div>
      </section>

      <section>
        <Head kicker="What it is" title="A function call that returns a judgement">
          TypeSafe calls it "a frontier-intelligence function call: unstructured state in, typed probabilistic decisions out." Your application
          owns the answer space and decides what to do with the result.
        </Head>
        <div className="ex-sig" aria-label="Diagram: state and questions go into Jev, typed answers with probabilities come out">
          <div className="ex-panel ex-box">
            <span className="section-title">State</span>
            <pre>{`Text, JSON, arrays, agent messages.
"The deploy failed twice and
customers are seeing 500s."`}</pre>
          </div>
          <div className="ex-arrow" aria-hidden="true">
            +
          </div>
          <div className="ex-panel ex-box">
            <span className="section-title">Questions</span>
            <pre>{`urgent: Noul
  "Does this need attention now?"
team:   Choice[web, infra, data]
impact: Score[low, med, high]`}</pre>
          </div>
          <div className="ex-arrow" aria-hidden="true">
            →
          </div>
          <div className="ex-panel ex-box">
            <span className="section-title">Typed answers</span>
            <pre>{`urgent → 0.94
team   → infra 0.81 · web 0.15 · data 0.04
impact → high 0.66 · med 0.29 · low 0.05
(always valid for the schema)`}</pre>
          </div>
        </div>
        <div className="ex-types">
          <div className="ex-panel ex-card">
            <h3>
              Choice <code>pick one</code>
            </h3>
            <p>Pick from options you define. Returns a probability for every option plus a confidence.</p>
            <p className="ex-ex">Which team owns this incident? Which category is this bank transaction?</p>
          </div>
          <div className="ex-panel ex-card">
            <h3>
              Score <code>rate it</code>
            </h3>
            <p>Rate against ordered levels such as low, medium and high. Returns a continuous score and the full distribution behind it.</p>
            <p className="ex-ex">How disruptive is the impact? How risky is this tool call?</p>
          </div>
          <div className="ex-panel ex-card">
            <h3>
              Noul <code>true or false</code>
            </h3>
            <p>A yes/no statement. Returns the probability that it's true, so you can choose your own cut-off.</p>
            <p className="ex-ex">Does the report describe failed purchases? Is this email urgent?</p>
          </div>
        </div>
      </section>

      <section>
        <Head kicker="How it works" title="Parallel answers instead of serial tokens">
          An LLM writes its answer token by token, and each token waits on the one before it. Jev scores a fixed answer space, so all the answers
          come back from one pass.
        </Head>
        <div className="ex-twin">
          <div className="ex-panel ex-card ex-pipe is-llm">
            <h3 className="ex-llm">LLM pipeline</h3>
            <div className="ex-tokrow is-llm" aria-hidden="true">
              {TOKENS.map((i) => (
                <span key={i} className="ex-tok" style={{ animationDelay: `${i * 0.16}s` }} />
              ))}
            </div>
            <div className="ex-st">
              <b>Prompt</b>Instructions, schema and data, written as messages.
            </div>
            <div className="ex-st">
              <b>Generate tokens, one at a time</b>Hidden reasoning first, then the JSON. More answers means more tokens and more seconds.
            </div>
            <div className="ex-st is-warn">
              <b>Parse and validate</b>The output is a string. It can be malformed JSON or contain a value outside your enum.
            </div>
            <div className="ex-st is-warn">
              <b>Retry on failure</b>Send the whole prompt again and pay for it twice.
            </div>
            <div className="ex-st is-warn">
              <b>Guess how sure it is</b>Self-reported confidence tends to cluster near "very sure" whether the answer is right or wrong.
            </div>
          </div>
          <div className="ex-panel ex-card ex-pipe is-jev">
            <h3 className="ex-jev">Jev pipeline</h3>
            <div className="ex-tokrow is-jev" aria-hidden="true">
              <span className="ex-tok" />
              <span className="ex-tok" />
              <span className="ex-tok" />
            </div>
            <div className="ex-st">
              <b>State + questions</b>Program state and the answer space you define in code.
            </div>
            <div className="ex-st">
              <b>One parallel pass</b>A parallel sampler scores every question together. Adding questions barely changes response time.
            </div>
            <div className="ex-st">
              <b>Typed values out</b>Answers always match the schema, so there's no parsing step and no type errors.
            </div>
            <div className="ex-st">
              <b>Calibrated probabilities</b>RLCD training means higher confidence goes with higher accuracy. You can put a threshold on it.
            </div>
          </div>
        </div>
      </section>

      <section>
        <Head kicker="Interactive · latency" title="Add more questions. Watch who slows down.">
          Every extra answer an LLM writes costs output tokens and time. Jev evaluates independent questions together, so each extra question costs
          a few input tokens and very little time.
        </Head>
        <QuestionsChart />
      </section>

      <section>
        <Head kicker="Interactive · calibration" title="Confidence you can set a threshold on">
          Picture 80 support tickets, and say both systems got the same tickets right. The only difference is the confidence they attach. Drag the
          threshold. Tickets above it are handled automatically, and the rest go to a person.
        </Head>
        <Calibration />
      </section>

      <section>
        <Head kicker="Interactive · cost" title="What it costs at scale">
          Jev charges <b>$0.042 per million input tokens</b>, about 4 cents, and nothing for output. LLMs charge $0.20 to $10 per million input
          tokens, and output usually costs around five times more than input.
        </Head>
        <CostCalc />
        <div className="ex-anchors">
          <div className="ex-anchor">
            <span className="ex-big">
              1,700 PRs
              <br />≈ 9¢
            </span>
            <p>Claire Vo clustered pull requests pairwise with Jev for about nine cents in total.</p>
          </div>
          <div className="ex-anchor">
            <span className="ex-big">200,000</span>
            <p>Classifications across 1,100 ChatPRD signals, a job that would be hard to justify at LLM prices.</p>
          </div>
          <div className="ex-anchor">
            <span className="ex-big">4,500</span>
            <p>YouTube comments turned into a searchable audience dashboard.</p>
          </div>
          <div className="ex-anchor">
            <span className="ex-big">193.6× · 444.6×</span>
            <p>Faster and cheaper on TypeSafe's own homepage workflow, which they flag as the high end of the gains.</p>
          </div>
        </div>
      </section>

      <section>
        <Head kicker="Side by side" title="Jev and an LLM, row by row" />
        <div className="ex-panel ex-table-wrap">
          <table className="ex-table">
            <thead>
              <tr>
                <th />
                <th className="ex-llm">LLM</th>
                <th className="ex-jev">Jev</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map(([k, l, j]) => (
                <tr key={k}>
                  <th>{k}</th>
                  <td>{l}</td>
                  <td className="is-jev">{j}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ex-note ex-gap">Speed, price and calibration claims are TypeSafe's, from the launch post.</p>
      </section>

      <section>
        <Head kicker="Interactive · quiz" title="Which would you reach for?">
          The rule of thumb from LangChain's harness guide: use an LLM for open-ended reasoning and generation, and Jev for the fast, structured
          decisions along the way.
        </Head>
        <Quiz />
      </section>

      <section>
        <Head kicker="In practice" title="Use both in one harness">
          Agent loops make lots of small decisions. If each of those is a full LLM call, the loop gets slow and expensive. Hand those decisions to
          Jev and keep the LLM for the thinking.
        </Head>
        <div className="ex-pats">
          <div className="ex-panel ex-card">
            <span className="section-title">Pattern 1</span>
            <h3>Triage, then escalate</h3>
            <p>Jev scores everything. Only the urgent or low-confidence items go to an LLM for a closer look. This is how Claire Vo filters her Gmail.</p>
            <pre className="ex-code">{PATTERN_1}</pre>
          </div>
          <div className="ex-panel ex-card">
            <span className="section-title">Pattern 2</span>
            <h3>Route to the right model</h3>
            <p>Jev reads each request and picks the cheapest model that can handle it, so the powerful one only runs when it's needed.</p>
            <pre className="ex-code">{PATTERN_2}</pre>
          </div>
          <div className="ex-panel ex-card">
            <span className="section-title">Pattern 3</span>
            <h3>Guard tool calls</h3>
            <p>Before an agent runs a risky tool, Jev classifies the call and blocks it if needed. At 100 ms, it can check every call.</p>
            <pre className="ex-code">{PATTERN_3}</pre>
          </div>
        </div>
        <p className="ex-note ex-gap">
          Code from LangChain's "Building a harness with Jev". Jev is also available through Vercel AI Gateway with the AI SDK's{' '}
          <code>experimental_evaluate</code> API.
        </p>
      </section>

      <section>
        <Head kicker="Know the limits" title="What Jev doesn't do" />
        <div className="ex-limits">
          <div className="ex-panel ex-card">
            <h3>Typed doesn't mean correct</h3>
            <p>
              The schema guarantee covers the shape of the answer, not whether it's right. A valid category can still be the wrong one. Test it
              against outcomes you already know before you automate.
            </p>
          </div>
          <div className="ex-panel ex-card">
            <h3>It can't write</h3>
            <p>No prose, no code, no explanations. If you need a reply drafted or a fix proposed, that's still an LLM's job.</p>
          </div>
          <div className="ex-panel ex-card">
            <h3>Text in only</h3>
            <p>Jev can't read images or audio directly. Convert them to descriptions or transcripts first.</p>
          </div>
          <div className="ex-panel ex-card">
            <h3>The benchmarks are TypeSafe's own</h3>
            <p>
              Their workflow evaluations were built by their own capabilities team. They say there could be some bias, and that their side-by-side
              demo shows Jev in a favourable light.
            </p>
          </div>
        </div>
      </section>

      <section className="ex-sources">
        <span className="section-title">Sources</span>
        <ul>
          <li>
            <a href="https://typesafe.ai/blog/introducing-system-one-models-and-jev">Introducing System One models and Jev</a> · TypeSafe AI
          </li>
          <li>
            <a href="https://www.langchain.com/blog/building-a-harness-with-jev">Building a harness with Jev</a> · LangChain
          </li>
          <li>
            <a href="https://www.lennysnewsletter.com/p/jev-for-beginners-how-to-use-it-and">Jev for beginners</a> · Lenny's Newsletter
          </li>
          <li>
            <a href="https://vercel.com/i/what-is-jev">What is Jev?</a> · Vercel
          </li>
        </ul>
        <p>The race, the latency chart, the dot plot and the cost calculator are simulations built from the published ranges. They aren't measurements.</p>
      </section>
    </main>
  )
}
