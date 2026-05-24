import type { CSSProperties } from 'react'

type StickerProps = {
  size?: number
  color?: string
  style?: CSSProperties
}

export function Sparkle({ size = 24, color = '#fff', style }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path d="M12 1c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6z" fill={color} />
    </svg>
  )
}

export function Star4({ size = 18, color = '#fff', style }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10Z" fill={color} />
    </svg>
  )
}

export function Heart({ size = 18, color = '#FF7AB6', style }: StickerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" fill={color} />
    </svg>
  )
}

type FlowerProps = StickerProps & { center?: string }
export function Flower({ size = 22, color = '#FF7AB6', center = '#FFD93D', style }: FlowerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <g fill={color}>
        <circle cx="12" cy="5" r="3.5" />
        <circle cx="12" cy="19" r="3.5" />
        <circle cx="5" cy="12" r="3.5" />
        <circle cx="19" cy="12" r="3.5" />
      </g>
      <circle cx="12" cy="12" r="3" fill={center} />
    </svg>
  )
}
