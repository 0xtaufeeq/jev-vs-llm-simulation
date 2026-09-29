// All motion is derived from elapsed time so every panel stays in lockstep.

export const T = {
  READ_END: 1.25, // stack edges settle
  FLIP_END: 2.0, // top card flips up to face the viewer
  SORT_START: 2.25, // first card leaves the stack
  SLOTS: 4, // a card spends 4 "deal units" travelling from stack to exit
  CATEGORIZED_AT: 2, // badge is stamped + counted once c - i >= 2
  SUMMARY_GAP: 0.15,
}

export interface Rates {
  rmin: number
  rmax: number
  ramp: number
}

export function ratesFor(n: number): Rates {
  // the video deals ~15 cards/sec at full speed; big files go faster so they finish in ~15s
  return { rmin: 1.4, rmax: Math.max(15, n / 13), ramp: 4 }
}

/** cards dealt after `s` seconds of sorting (rate ramps linearly from rmin to rmax) */
export function dealt(s: number, r: Rates) {
  if (s <= 0) return 0
  if (s < r.ramp) return r.rmin * s + ((r.rmax - r.rmin) * s * s) / (2 * r.ramp)
  const a = r.rmin * r.ramp + ((r.rmax - r.rmin) * r.ramp) / 2
  return a + r.rmax * (s - r.ramp)
}

/** inverse of dealt(): seconds needed to reach `c` */
export function timeToDeal(c: number, r: Rates) {
  const a = r.rmin * r.ramp + ((r.rmax - r.rmin) * r.ramp) / 2
  if (c <= a) {
    const qa = (r.rmax - r.rmin) / (2 * r.ramp)
    const qb = r.rmin
    return (-qb + Math.sqrt(qb * qb + 4 * qa * c)) / (2 * qa)
  }
  return r.ramp + (c - a) / r.rmax
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** 0→1 progress of a window [start, start+dur] at time t */
export const win = (t: number, start: number, dur: number) => clamp01((t - start) / dur)
