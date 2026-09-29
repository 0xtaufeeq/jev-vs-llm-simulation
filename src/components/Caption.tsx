import { useRef } from 'react'

interface Props {
  text: string
  /** changing this replays the left-to-right character reveal */
  revealKey: string
  opacity?: number
  tone?: 'muted' | 'error'
}

// Characters fade in left→right, like the caption swaps in the recording.
// Chars keep their index as key, so a ticking counter doesn't replay the reveal.
export function Caption({ text, revealKey, opacity = 1, tone = 'muted' }: Props) {
  const since = useRef({ key: '', at: 0 })
  if (since.current.key !== revealKey) since.current = { key: revealKey, at: performance.now() }
  const revealing = performance.now() - since.current.at < 900

  return (
    <div className={`caption caption-${tone}`} style={{ opacity }} aria-live="polite">
      <span key={revealKey}>
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            className={revealing ? 'caption-char' : undefined}
            style={revealing ? { animationDelay: `${i * 14}ms` } : undefined}
          >
            {ch}
          </span>
        ))}
      </span>
    </div>
  )
}
