import type { Timing } from '../types'

const MARKER_RE = /^\s*[[(【].*[\])】]\s*$/

export function findMarkerLines(lines: string[]): { index: number; text: string }[] {
  return lines
    .map((text, index) => ({ index, text }))
    .filter(({ text }) => MARKER_RE.test(text))
}

export type CopyTimingsResult =
  | {
      kind: 'ok'
      timings: Timing[]
      strippedLyrics: string[] | null
      partial?: { covered: number; versionTotal: number; originalTotal: number }
    }
  | {
      kind: 'mismatch'
      originalCount: number
      versionCount: number
      markers: { index: number; text: string }[]
    }

export function copyTimings(
  originalLyrics: string[],
  originalTimings: Timing[],
  versionLyrics: string[],
  strip: boolean | null,
  mode: 'strict' | 'partial' = 'strict',
): CopyTimingsResult {
  const markers = findMarkerLines(versionLyrics)

  if (mode === 'strict' && markers.length > 0 && strip === null) {
    return {
      kind: 'mismatch',
      originalCount: originalLyrics.length,
      versionCount: versionLyrics.length,
      markers,
    }
  }

  const effectiveLyrics =
    strip === true
      ? versionLyrics.filter((_, i) => !markers.some((m) => m.index === i))
      : versionLyrics

  if (mode === 'strict' && effectiveLyrics.length !== originalLyrics.length) {
    return {
      kind: 'mismatch',
      originalCount: originalLyrics.length,
      versionCount: effectiveLyrics.length,
      markers,
    }
  }

  const copied: Timing[] = originalTimings
    .filter((t) => t.lineIndex < effectiveLyrics.length)
    .map((t) => ({ lineIndex: t.lineIndex, timestamp: t.timestamp }))

  const isPartial = mode === 'partial' && effectiveLyrics.length !== originalLyrics.length
  return {
    kind: 'ok',
    timings: copied,
    strippedLyrics: strip === true ? effectiveLyrics : null,
    ...(isPartial && {
      partial: {
        covered: copied.length,
        versionTotal: effectiveLyrics.length,
        originalTotal: originalLyrics.length,
      },
    }),
  }
}
