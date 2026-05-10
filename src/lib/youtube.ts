export function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v')
    }
    return null
  } catch {
    return null
  }
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatMs(ms: number): string {
  return formatSeconds(ms / 1000)
}
