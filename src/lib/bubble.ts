// Bubblepop (mobile) palette + helpers. Kept in sync with the bb-* Tailwind
// tokens and the .mobile-mode CSS scope in src/index.css.

export const BB = {
  bg: '#FFF1F4',
  bg2: '#FFE2EA',
  bgSoft: '#FFF8FA',
  surface: '#FFFFFF',
  ink: '#3A1740',
  ink2: '#9C6E92',
  ink3: '#C8AEC2',
  primary: '#FF7AB6',
  mint: '#7FDDD2',
  yellow: '#FFD93D',
  sky: '#A5D8FF',
  lilac: '#D5B3FF',
  cream: '#FFF4D6',
} as const

// Darken a hex by `amt` (0–1) for hard-offset shadows. Returns rgb(...).
export function darken(hex: string, amt: number): string {
  if (!hex || !hex.startsWith('#')) return 'rgba(0,0,0,0.2)'
  const n = parseInt(hex.replace('#', ''), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  r = Math.max(0, r * (1 - amt))
  g = Math.max(0, g * (1 - amt))
  b = Math.max(0, b * (1 - amt))
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`
}
