import type { Timing } from '../types'

export type LrclibResult = {
  lyrics: string[]
  timings: Timing[] | null // null = plain lyrics only, no timestamps
}

export async function fetchLyrics(
  title: string,
  artist: string,
  durationSeconds?: number,
): Promise<LrclibResult | null> {
  const base = 'https://lrclib.net/api'
  const url = durationSeconds
    ? `${base}/get?track_name=${enc(title)}&artist_name=${enc(artist)}&duration=${Math.round(durationSeconds)}`
    : `${base}/search?track_name=${enc(title)}&artist_name=${enc(artist)}`

  const res = await fetch(url)
  if (!res.ok) return null

  const raw = await res.json()
  const data = durationSeconds ? raw : (raw as unknown[])[0]
  if (!data) return null

  const { syncedLyrics, plainLyrics } = data as {
    syncedLyrics?: string | null
    plainLyrics?: string | null
  }

  if (syncedLyrics) return parseLrc(syncedLyrics)
  if (plainLyrics) {
    return {
      lyrics: plainLyrics.split('\n').map((l: string) => l.trim()).filter(Boolean),
      timings: null,
    }
  }
  return null
}

function enc(s: string) {
  return encodeURIComponent(s)
}

function parseLrc(lrc: string): LrclibResult {
  const parsed: { timestamp: number; text: string }[] = []

  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d{2}):(\d{2}\.\d+)\]\s*(.*)$/)
    if (!m) continue
    const timestamp = parseInt(m[1]) * 60 + parseFloat(m[2])
    const text = m[3].trim()
    if (text) parsed.push({ timestamp, text })
  }

  return {
    lyrics: parsed.map((p) => p.text),
    timings: parsed.map((p, i) => ({ lineIndex: i, timestamp: p.timestamp })),
  }
}
