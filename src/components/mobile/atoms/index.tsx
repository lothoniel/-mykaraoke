import type { CSSProperties, ReactNode, MouseEvent } from 'react'
import { BB, darken } from '../../../lib/bubble'
import { getSongGradient } from '../../../lib/songColor'
import type { Song } from '../../../types'
import { Heart, Sparkle, Star4, Flower } from './stickers'

// ─── BubbleAlbum ────────────────────────────────────────────────────────────
// Renders a song's gradient "puffy" album tile with shine overlay.
type BubbleAlbumProps = {
  song: Pick<Song, 'id' | 'coverArt'>
  size?: number
  radius?: number
  shadow?: boolean
  badge?: ReactNode
}
export function BubbleAlbum({ song, size = 56, radius = 14, shadow = true, badge }: BubbleAlbumProps) {
  const [a, b, c] = getSongGradient(song.id)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: song.coverArt
          ? `url(${song.coverArt}) center/cover`
          : `linear-gradient(135deg, ${a}, ${b} 55%, ${c})`,
        position: 'relative',
        overflow: 'visible',
        boxShadow: shadow
          ? `0 4px 0 rgba(58,23,64,0.12), inset 0 2px 6px rgba(255,255,255,0.35)`
          : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          background: 'radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,0.45), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      {badge}
    </div>
  )
}

// ─── BubbleIconBtn ──────────────────────────────────────────────────────────
type BubbleIconBtnProps = {
  children: ReactNode
  color?: string
  ink?: string
  size?: number
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  style?: CSSProperties
  hardShadow?: boolean
  ariaLabel?: string
}
export function BubbleIconBtn({
  children,
  color = BB.primary,
  ink = '#fff',
  size = 42,
  onClick,
  style,
  hardShadow = true,
  ariaLabel,
}: BubbleIconBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: 'none',
        background: color,
        color: ink,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: hardShadow ? `0 4px 0 ${darken(color, 0.18)}` : 'none',
        transition: 'transform 0.08s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── BubbleButton ───────────────────────────────────────────────────────────
type BubbleButtonProps = {
  children: ReactNode
  color?: string
  ink?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  style?: CSSProperties
  block?: boolean
  sm?: boolean
  disabled?: boolean
}
export function BubbleButton({
  children,
  color = BB.primary,
  ink = '#fff',
  onClick,
  style,
  block,
  sm,
  disabled,
}: BubbleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: sm ? 38 : 48,
        padding: sm ? '0 16px' : '0 22px',
        borderRadius: 999,
        border: 'none',
        background: color,
        color: ink,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--bb-font-display)',
        fontWeight: 700,
        fontSize: sm ? 13 : 15,
        letterSpacing: -0.2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxShadow: `0 5px 0 ${darken(color, 0.18)}, 0 10px 22px ${color}44`,
        width: block ? '100%' : 'auto',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── BubbleChip ─────────────────────────────────────────────────────────────
type BubbleChipProps = {
  children: ReactNode
  active?: boolean
  color?: string
  ink?: string
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  style?: CSSProperties
}
export function BubbleChip({
  children,
  active,
  color = BB.primary,
  ink = '#fff',
  onClick,
  style,
}: BubbleChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36,
        padding: '0 16px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: active ? color : BB.surface,
        color: active ? ink : BB.ink,
        fontFamily: 'var(--bb-font-display)',
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: -0.1,
        boxShadow: active
          ? `0 3px 0 ${darken(color, 0.18)}`
          : '0 2px 0 rgba(58,23,64,0.08)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── BubbleEyebrow ──────────────────────────────────────────────────────────
type BubbleEyebrowProps = {
  children: ReactNode
  decoration?: ReactNode
  right?: ReactNode
}
export function BubbleEyebrow({ children, decoration, right }: BubbleEyebrowProps) {
  return (
    <div
      style={{
        margin: '26px 4px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--bb-font-display)',
          fontWeight: 700,
          fontSize: 19,
          letterSpacing: -0.3,
          color: BB.ink,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {decoration} {children}
      </div>
      {right && (
        <div style={{ fontSize: 12, color: BB.ink2, fontWeight: 600 }}>{right}</div>
      )}
    </div>
  )
}

// ─── BubbleSongRow ──────────────────────────────────────────────────────────
type BubbleSongRowProps = {
  song: Song
  onClick?: () => void
  rank?: number
  showFav?: boolean
  trailing?: ReactNode
  trailingText?: string
}
export function BubbleSongRow({
  song,
  onClick,
  rank,
  showFav = true,
  trailing,
  trailingText,
}: BubbleSongRowProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: BB.surface,
        padding: 10,
        borderRadius: 18,
        boxShadow: `0 2px 0 rgba(58,23,64,0.06)`,
        cursor: 'pointer',
      }}
    >
      {rank != null && (
        <div
          style={{
            width: 22,
            textAlign: 'center',
            fontFamily: 'var(--bb-font-display)',
            fontWeight: 700,
            fontSize: 12,
            color: BB.ink2,
          }}
        >
          {rank}
        </div>
      )}
      <BubbleAlbum song={song} size={50} radius={14} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            fontFamily: 'var(--bb-font-display)',
            color: BB.ink,
            letterSpacing: -0.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {song.title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: BB.ink2,
            fontWeight: 500,
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {song.artist}
        </div>
      </div>
      {showFav && song.isFavorite && <Heart size={14} color={BB.primary} />}
      {trailingText && (
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 12,
            color: BB.ink2,
          }}
        >
          {trailingText}
        </div>
      )}
      {trailing}
    </div>
  )
}

// ─── BubbleShowTile ─────────────────────────────────────────────────────────
// Square gradient tile used in the Library "shows" grid (grouped by artist).
type BubbleShowTileProps = {
  artist: string
  songs: Song[]
  onClick?: () => void
  stickerIndex?: number
}
export function BubbleShowTile({ artist, songs, onClick, stickerIndex = 0 }: BubbleShowTileProps) {
  const first = songs[0]
  const [a, b, c] = first ? getSongGradient(first.id) : ['#FF7AB6', '#7FDDD2', '#FFD93D']
  const stickerKey = ((stickerIndex % 4) + 4) % 4
  const sticker =
    stickerKey === 0 ? <Sparkle size={20} color="rgba(255,255,255,0.85)" /> :
    stickerKey === 1 ? <Heart size={20} color="rgba(255,255,255,0.85)" /> :
    stickerKey === 2 ? <Star4 size={20} color="rgba(255,255,255,0.85)" /> :
    <Flower size={20} color="rgba(255,255,255,0.85)" center="rgba(255,255,255,0.6)" />
  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset',
        cursor: 'pointer',
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 24,
        background: `linear-gradient(155deg, ${a}, ${b} 55%, ${c})`,
        boxShadow: `0 6px 0 ${darken(b, 0.22)}, 0 12px 28px ${b}55`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(60% 60% at 25% 18%, rgba(255,255,255,0.5), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          transform: 'rotate(8deg)',
        }}
      >
        {sticker}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 12,
          color: '#fff',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--bb-font-display)',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: -0.3,
            textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {artist}
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            opacity: 0.9,
            marginTop: 2,
          }}
        >
          {songs.length} {songs.length === 1 ? 'song' : 'songs'}
        </div>
      </div>
    </button>
  )
}
