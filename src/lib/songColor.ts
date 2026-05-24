// Deterministic gradient picker for mobile (Bubblepop) album art.
// The Song schema does not store gradient colors; we derive them per-song
// from a hash of the id so the same song always gets the same gradient.

const PALETTE: Array<[string, string, string]> = [
  ['#FF7AB6', '#FFB3D9', '#FFD93D'], // pink → pink-soft → yellow
  ['#7FDDD2', '#A5E8DF', '#A5D8FF'], // mint → mint-soft → sky
  ['#D5B3FF', '#E8D1FF', '#FF7AB6'], // lilac → lilac-soft → pink
  ['#FFD93D', '#FFE89A', '#FFB3D9'], // yellow → yellow-soft → pink-soft
  ['#A5D8FF', '#C4E6FF', '#D5B3FF'], // sky → sky-soft → lilac
  ['#FF7AB6', '#FF9FCF', '#7FDDD2'], // pink → coral → mint
] as const

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getSongGradient(id: string): [string, string, string] {
  return PALETTE[hashString(id) % PALETTE.length]
}
