import { useEffect, useMemo, useState } from 'react'
import type { Screen, Song } from '../../../types'
import * as db from '../../../hooks/useDB'
import { BB } from '../../../lib/bubble'
import { MOODS, songMatchesMood, type Mood } from '../../../lib/moods'
import {
  BubbleChip,
  BubbleEyebrow,
  BubbleIconBtn,
  BubbleShowTile,
  BubbleSongRow,
} from '../atoms'
import { Star4, Heart } from '../atoms/stickers'
import { IconPlus, IconClose } from '../atoms/icons'

type Filter = 'all' | 'fav' | 'recent' | 'spot'

type Props = {
  navigate: (s: Screen) => void
  initialMood?: Mood | null
  onMoodConsumed?: () => void
}

const FILTERS: { id: Filter; label: string; color: string; ink: string }[] = [
  { id: 'all', label: 'all', color: BB.primary, ink: '#fff' },
  { id: 'fav', label: '♥ faves', color: BB.primary, ink: '#fff' },
  { id: 'recent', label: 'recently added', color: BB.mint, ink: BB.ink },
  { id: 'spot', label: 'from spotify', color: BB.sky, ink: BB.ink },
]

function formatDuration(ms?: number): string | undefined {
  if (!ms || ms <= 0) return undefined
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function MobileLibrary({ navigate, initialMood, onMoodConsumed }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [mood, setMood] = useState<Mood | null>(initialMood ?? null)
  const [artistFilter, setArtistFilter] = useState<string | null>(null)

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  useEffect(() => {
    if (initialMood) onMoodConsumed?.()
  }, [initialMood, onMoodConsumed])

  const moodDef = mood ? MOODS.find((m) => m.id === mood) : undefined

  const filteredByChip = useMemo(() => {
    switch (filter) {
      case 'fav':
        return songs.filter((s) => s.isFavorite)
      case 'recent':
        return [...songs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
      case 'spot':
        return songs.filter((s) => !!s.spotifyTrackId)
      default:
        return songs
    }
  }, [songs, filter])

  const afterMood = useMemo(
    () => (mood ? filteredByChip.filter((s) => songMatchesMood(s, mood)) : filteredByChip),
    [filteredByChip, mood],
  )

  const afterArtist = useMemo(
    () => (artistFilter ? afterMood.filter((s) => s.artist === artistFilter) : afterMood),
    [afterMood, artistFilter],
  )

  const sorted = useMemo(
    () => [...afterArtist].sort((a, b) => a.title.localeCompare(b.title)),
    [afterArtist],
  )

  const artistGroups = useMemo(() => {
    const m = new Map<string, Song[]>()
    for (const s of songs) {
      const arr = m.get(s.artist) ?? []
      arr.push(s)
      m.set(s.artist, arr)
    }
    return [...m.entries()]
      .map(([artist, list]) => ({ artist, songs: list }))
      .sort((a, b) => b.songs.length - a.songs.length)
      .slice(0, 4)
  }, [songs])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '6px 0 18px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              color: BB.ink2,
              fontWeight: 600,
              fontFamily: 'var(--bb-font-script)',
            }}
          >
            your stash ♬
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -0.7,
              fontFamily: 'var(--bb-font-display)',
              color: BB.ink,
              marginTop: 2,
            }}
          >
            library
          </div>
          <div
            style={{ fontSize: 13, color: BB.ink2, fontWeight: 500, marginTop: 6 }}
          >
            {songs.length} {songs.length === 1 ? 'song' : 'songs'}
          </div>
        </div>
        <BubbleIconBtn color={BB.primary} size={46} onClick={() => navigate({ name: 'add' })}>
          <IconPlus size={20} />
        </BubbleIconBtn>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          margin: '0 -20px',
          padding: '0 20px 6px',
          scrollbarWidth: 'none',
        }}
      >
        {FILTERS.map((f) => (
          <BubbleChip
            key={f.id}
            active={filter === f.id}
            color={f.color}
            ink={f.ink}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </BubbleChip>
        ))}
      </div>

      {moodDef && (
        <div
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: moodDef.bg,
            color: moodDef.ink,
            padding: '8px 12px 8px 14px',
            borderRadius: 999,
            fontFamily: 'var(--bb-font-display)',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <span>{moodDef.emoji}</span>
          <span>{moodDef.label}</span>
          <button
            onClick={() => setMood(null)}
            aria-label="Clear mood filter"
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 22,
              height: 22,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.35)',
            }}
          >
            <IconClose size={12} style={{ color: moodDef.ink }} />
          </button>
        </div>
      )}

      {artistFilter && (
        <div
          style={{
            marginTop: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: BB.surface,
            color: BB.ink,
            padding: '8px 12px 8px 14px',
            borderRadius: 999,
            fontFamily: 'var(--bb-font-display)',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 2px 0 rgba(58,23,64,0.08)',
            marginLeft: moodDef ? 8 : 0,
          }}
        >
          <span>{artistFilter}</span>
          <button
            onClick={() => setArtistFilter(null)}
            aria-label="Clear artist filter"
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 22,
              height: 22,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: BB.bg2,
            }}
          >
            <IconClose size={12} style={{ color: BB.ink }} />
          </button>
        </div>
      )}

      {artistGroups.length > 0 && !artistFilter && (
        <>
          <BubbleEyebrow
            decoration={<Star4 size={18} color={BB.primary} />}
            right={`${artistGroups.length}`}
          >
            shows
          </BubbleEyebrow>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}
          >
            {artistGroups.map((g, i) => (
              <BubbleShowTile
                key={g.artist}
                artist={g.artist}
                songs={g.songs}
                stickerIndex={i}
                onClick={() => setArtistFilter(g.artist)}
              />
            ))}
          </div>
        </>
      )}

      <BubbleEyebrow
        decoration={<Heart size={18} color={BB.primary} />}
        right={sorted.length > 0 ? 'A→Z' : undefined}
      >
        all songs ({sorted.length})
      </BubbleEyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.length === 0 && (
          <div style={{ color: BB.ink2, fontSize: 14, padding: 16, textAlign: 'center' }}>
            no songs match — try a different filter
          </div>
        )}
        {sorted.map((s, i) => (
          <BubbleSongRow
            key={s.id}
            song={s}
            rank={i + 1}
            trailingText={formatDuration(s.duration)}
            onClick={() => navigate({ name: 'playback', songId: s.id })}
          />
        ))}
      </div>
    </div>
  )
}
