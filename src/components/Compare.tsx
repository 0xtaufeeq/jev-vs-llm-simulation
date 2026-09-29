import { COLORS, type Category } from '../data'
import type { Comparison } from '../llm'
import { fmtMs, fmtUsd } from './Race'

interface Props {
  cmp: Comparison
}

const pct = (v: number) => `${(v * 100).toFixed(v === 1 ? 0 : 1)}%`

function fmtDuration(s: number) {
  if (s < 1) return fmtMs(s * 1000)
  if (s < 90) return `${s.toFixed(1)} s`
  if (s < 5400) return `${(s / 60).toFixed(1)} min`
  return `${(s / 3600).toFixed(1)} h`
}

function fmtTimes(x: number) {
  if (!Number.isFinite(x)) return '∞×'
  if (x >= 1e6) return `${(x / 1e6).toFixed(1)}M×`
  if (x >= 1e4) return `${Math.round(x / 1e3)}K×`
  return x >= 1000 ? `${Math.round(x).toLocaleString('en-US')}×` : `${x.toFixed(x < 10 ? 1 : 0)}×`
}

function Chip({ cat, dim }: { cat: Category; dim?: boolean }) {
  return (
    <span className={`cmp-chip${dim ? ' is-dim' : ''}`}>
      <span className="legend-dot" style={{ background: COLORS[cat], width: 6, height: 6 }} />
      {cat}
    </span>
  )
}

export function Compare({ cmp }: Props) {
  const per10k = 10000 / cmp.n
  const jevSec = cmp.jevMs / 1000
  const speedup = cmp.llmSeconds / Math.max(jevSec, 1e-6)
  const accGap = (cmp.jevAccuracy - cmp.llmAccuracy) * 100
  const misses = cmp.misses.slice(0, 6)
  const wrongRows = cmp.misses.reduce((s, m) => s + m.count, 0)
  let delay = 0
  const next = () => ({ animationDelay: `${(delay += 60)}ms` })

  return (
    <div className="compare">
      <div className="section-title" style={{ left: 0, top: 0 }}>
        Jev vs LLM
      </div>
      <div className="cmp-sub">Same {cmp.n} transactions, categorized both ways.</div>

      <div className="cmp-tiles">
        {cmp.hasTruth ? (
          <div className="cmp-tile" style={next()}>
            <div className="cmp-tile-label">Accuracy</div>
            <div className="cmp-tile-jev">{pct(cmp.jevAccuracy)}</div>
            <div className="cmp-tile-llm">LLM {pct(cmp.llmAccuracy)}</div>
            <div className="cmp-pill">{accGap > 0 ? `+${accGap.toFixed(1)} pts` : 'Even'}</div>
          </div>
        ) : (
          <div className="cmp-tile" style={next()}>
            <div className="cmp-tile-label">Consistency</div>
            <div className="cmp-tile-jev">{pct(cmp.jevConsistency)}</div>
            <div className="cmp-tile-llm">LLM {pct(cmp.llmConsistency)}</div>
            <div className="cmp-pill">Same merchant, same label</div>
          </div>
        )}
        <div className="cmp-tile" style={next()}>
          <div className="cmp-tile-label">Time</div>
          <div className="cmp-tile-jev">{fmtMs(cmp.jevMs)}</div>
          <div className="cmp-tile-llm">LLM {fmtDuration(cmp.llmSeconds)}</div>
          <div className="cmp-pill">{fmtTimes(speedup)} faster</div>
        </div>
        <div className="cmp-tile" style={next()}>
          <div className="cmp-tile-label">Cost</div>
          <div className="cmp-tile-jev">$0</div>
          <div className="cmp-tile-llm">LLM {fmtUsd(cmp.llmCostUsd)}</div>
          <div className="cmp-pill">Free, runs on-device</div>
        </div>
      </div>

      <div className="cmp-table">
        <div className="cmp-row cmp-head" style={next()}>
          <span />
          <span>Jev</span>
          <span>LLM</span>
        </div>
        <div className="cmp-row" style={next()}>
          <span>Same label for repeat merchants</span>
          <span className="cmp-win">{pct(cmp.jevConsistency)}</span>
          <span>{pct(cmp.llmConsistency)}</span>
        </div>
        <div className="cmp-row" style={next()}>
          <span>Same answer on every run</span>
          <span className="cmp-win">Always</span>
          <span>Not guaranteed</span>
        </div>
        <div className="cmp-row" style={next()}>
          <span>Time for 10,000 transactions</span>
          <span className="cmp-win">{fmtDuration(jevSec * per10k)}</span>
          <span>{fmtDuration(cmp.llmSeconds * per10k)}</span>
        </div>
        <div className="cmp-row" style={next()}>
          <span>Cost for 10,000 transactions</span>
          <span className="cmp-win">$0</span>
          <span>{fmtUsd(cmp.llmCostUsd * per10k)}</span>
        </div>
        <div className="cmp-row" style={next()}>
          <span>Statement data sent off-device</span>
          <span className="cmp-win">None</span>
          <span>{cmp.n} rows</span>
        </div>
      </div>

      <div className="cmp-misses" style={next()}>
        <div className="cmp-misses-title">
          {wrongRows === 0 ? 'The LLM matched Jev on every row' : `Where the LLM disagreed with Jev · ${wrongRows} rows`}
        </div>
        {misses.map((m, i) => (
          <div key={m.name + m.llm} className="cmp-miss" style={{ animationDelay: `${delay + 60 + i * 50}ms` }}>
            <span className="cmp-miss-name">{m.name}</span>
            <Chip cat={m.jev} />
            <span className="cmp-arrow">→</span>
            <Chip cat={m.llm} dim />
            <span className="cmp-miss-count">×{m.count}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
