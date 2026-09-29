import { useRef } from 'react'

export interface SampleOption {
  id: string
  label: string
  file: string
}

interface Props {
  dragging: boolean
  samples: SampleOption[]
  onSample: (id: string) => void
  onFile: (f: File) => void
}

export function Idle({ dragging, samples, onSample, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className={`idle${dragging ? ' is-dragging' : ''}`}>
      <div className="idle-drop" onClick={() => input.current?.click()} role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}>
        <div className="idle-pile">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="idle-pile-line" style={{ bottom: i * 4, opacity: 0.35 + i * 0.07 }} />
          ))}
        </div>
        <div className="idle-title">Drop a bank statement</div>
        <div className="idle-sub">CSV with Date, Description, Amount</div>
      </div>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      <div className="idle-samples">
        {samples.map((s) => (
          <button key={s.id} className="idle-sample" onClick={() => onSample(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="idle-links">
        Sample CSVs:{' '}
        {samples.map((s, i) => (
          <span key={s.id}>
            {i > 0 && ' · '}
            <a className="idle-link" href={`samples/${s.file}`} download>
              {s.id === 'india' ? 'India' : 'US'}
            </a>
          </span>
        ))}
      </div>
    </div>
  )
}
