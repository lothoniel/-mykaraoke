import type { Timing } from '../types'

export function findCurrentLineIndex(timings: Timing[], currentTime: number): number {
  let idx = -1
  for (const t of timings) {
    if (t.timestamp <= currentTime) idx = t.lineIndex
    else break
  }
  return idx
}
