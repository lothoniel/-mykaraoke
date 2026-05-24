import type { CSSProperties, ReactNode } from 'react'

type IconProps = { size?: number; style?: CSSProperties }

function Stroke({ size = 22, style, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export const IconHome = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </Stroke>
)

export const IconLibrary = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 4h4v16H4z" />
    <path d="M10 4h4v16h-4z" />
    <path d="M16 4l4 1-3 15-4-1z" />
  </Stroke>
)

export const IconSearch = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Stroke>
)

export const IconSettings = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </Stroke>
)

export const IconPlus = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
)

export const IconPlay = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 4l14 8-14 8V4z" fill="currentColor" />
  </Stroke>
)

export const IconPause = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
  </Stroke>
)

export const IconHeart = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" />
  </Stroke>
)

export const IconHeartFilled = (p: IconProps) => (
  <Stroke {...p}>
    <path
      d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"
      fill="currentColor"
    />
  </Stroke>
)

export const IconClose = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Stroke>
)

export const IconBack = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M15 18l-6-6 6-6" />
  </Stroke>
)

export const IconChevR = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 6l6 6-6 6" />
  </Stroke>
)

export const IconChevD = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 9l6 6 6-6" />
  </Stroke>
)

export const IconLink = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
    <path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
  </Stroke>
)

export const IconCheck = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 12l5 5L20 7" />
  </Stroke>
)

export const IconShuffle = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M16 4h5v5" />
    <path d="M3 20l18-16" />
    <path d="M16 20h5v-5" />
    <path d="M14 14l7 6M3 4l7 6" />
  </Stroke>
)

export const IconSpotify = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M7 10c3-1 7-1 10 1" />
    <path d="M7.5 13c2.5-.8 5.5-.6 8 .8" />
    <path d="M8 16c2-.6 4.5-.4 6.5.6" />
  </Stroke>
)

export const IconTrash = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Stroke>
)
