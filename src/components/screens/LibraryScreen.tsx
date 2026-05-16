import { useEffect, useMemo, useState } from 'react'
import * as db from '../../hooks/useDB'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }
type Tab = 'all' | 'fav' | 'spotify'
type SortKey = 'title' | 'artist' | 'show' | 'recent'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All Songs' },
  { id: 'fav', label: 'Favorites' },
  { id: 'spotify', label: 'Spotify' },
]

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'title', label: 'Title' },
  { id: 'artist', label: 'Artist' },
  { id: 'show', label: 'Show' },
  { id: 'recent', label: 'Recently Added' },
]

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function PlayIcon({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  )
}

function HeartIcon({ size = 13, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke="currentColor">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SortIcon({ size = 16, descending }: { size?: number; descending: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke="currentColor">
      <line x1="3" y1="6" x2="14" y2="6" />
      <line x1="3" y1="12" x2="11" y2="12" />
      <line x1="3" y1="18" x2="8" y2="18" />
      <polyline points={descending ? '17 9 17 21 21 17' : '17 15 17 3 21 7'} />
      <line x1="17" y1={descending ? '21' : '3'} x2="17" y2={descending ? '21' : '3'} />
    </svg>
  )
}

function SpotifyIcon({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} {...strokeAttrs}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 11.5c2.5-1 5.5-1 8 0M7 15c3-1.5 7-1.5 10 0M9 8.5c2-0.5 5-0.5 7 0" />
    </svg>
  )
}

function fmtDuration(ms?: number): string {
  if (!ms || ms <= 0) return ''
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function totalMinutes(songs: Song[]): number {
  const ms = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0)
  return Math.round(ms / 60000)
}

function getShow(song: Song): string {
  return song.genres?.[0] ?? 'Uncategorized'
}

function compareSongs(a: Song, b: Song, key: SortKey, asc: boolean): number {
  let cmp = 0
  if (key === 'title') cmp = a.title.localeCompare(b.title)
  else if (key === 'artist') cmp = a.artist.localeCompare(b.artist)
  else if (key === 'show') cmp = getShow(a).localeCompare(getShow(b))
  else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  return asc ? cmp : -cmp
}

function SongRow({
  song,
  index,
  highlight,
  onPlay,
}: {
  song: Song
  index: number
  highlight: boolean
  onPlay: () => void
}) {
  const show = getShow(song)
  return (
    <button
      onClick={onPlay}
      className="w-full flex items-center gap-[11px] text-left transition-colors"
      style={{
        padding: '8px 10px',
        borderRadius: 11,
        background: highlight ? 'rgba(200, 241, 53, 0.18)' : 'transparent',
        border: `1px solid ${highlight ? 'rgba(200, 241, 53, 0.33)' : 'transparent'}`,
      }}
      onMouseEnter={(e) => {
        if (!highlight) e.currentTarget.style.background = 'rgba(200, 241, 53, 0.04)'
      }}
      onMouseLeave={(e) => {
        if (!highlight) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span className="text-[12px] text-text-2 flex-none text-center" style={{ width: 18 }}>
        {index + 1}
      </span>
      <div
        className="flex-none overflow-hidden"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #C8F135 0%, #7C3AED 100%)',
        }}
      >
        {song.coverArt ? <img src={song.coverArt} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{song.title}</div>
        <div className="text-[11px] text-text-2 truncate">
          {song.artist} · {show}
        </div>
      </div>
      {fmtDuration(song.duration) && (
        <span className="text-[12px] text-text-2 flex-none">{fmtDuration(song.duration)}</span>
      )}
      {song.isFavorite && (
        <span className="flex-none" style={{ color: 'var(--accent)' }}>
          <HeartIcon size={13} filled />
        </span>
      )}
      <div
        className="flex-none flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: highlight ? 'var(--accent)' : '#EBE4FF',
        }}
      >
        <PlayIcon size={11} color={highlight ? '#1C0840' : '#7060A0'} />
      </div>
    </button>
  )
}

export default function LibraryScreen({ navigate }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [descending, setDescending] = useState(true)

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  const totalMin = totalMinutes(songs)

  const sorted = useMemo(() => {
    return [...songs].sort((a, b) => compareSongs(a, b, sort, !descending))
  }, [songs, sort, descending])

  const filtered = useMemo(() => {
    if (tab === 'fav') return sorted.filter((s) => s.isFavorite)
    if (tab === 'spotify') return sorted.filter((s) => !!s.spotifyTrackId)
    return sorted
  }, [sorted, tab])

  const groupedBySpotifyShow = useMemo(() => {
    if (tab !== 'spotify') return null
    const groups = new Map<string, Song[]>()
    for (const s of filtered) {
      const k = getShow(s)
      const arr = groups.get(k) ?? []
      arr.push(s)
      groups.set(k, arr)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, tab])

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 flex-none">
        <div className="min-w-0">
          <div className="text-[22px] font-extrabold text-text leading-tight" style={{ letterSpacing: '-0.4px' }}>
            Your Library
          </div>
          <div className="text-[13px] text-text-2 mt-0.5 truncate">
            {songs.length} song{songs.length === 1 ? '' : 's'}
            {totalMin > 0 ? ` · ${totalMin} min` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <button
            onClick={() => setDescending((d) => !d)}
            aria-label={descending ? 'Sort descending' : 'Sort ascending'}
            className="flex items-center justify-center bg-surface border border-border text-text-2 hover:bg-white"
            style={{ width: 36, height: 36, borderRadius: 9 }}
          >
            <SortIcon size={16} descending={descending} />
          </button>
          <button
            onClick={() => navigate({ name: 'add' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[13px] font-bold"
            style={{ background: 'var(--accent)', color: '#1C0840' }}
          >
            <PlusIcon size={14} />
            Add Song
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col gap-3 overflow-hidden">
        {/* Segmented tabs */}
        <div
          className="flex flex-none"
          style={{ background: '#EBE4FF', borderRadius: 12, padding: 4, gap: 0 }}
        >
          {TABS.map((tb) => {
            const active = tab === tb.id
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className="flex-1 flex items-center justify-center gap-1.5 text-[13px]"
                style={{
                  padding: '7px',
                  borderRadius: 9,
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1C0840' : '#7060A0',
                  fontWeight: active ? 700 : 500,
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
                }}
              >
                {tb.id === 'spotify' && (
                  <SpotifyIcon size={13} color={active ? '#16A34A' : '#7060A0'} />
                )}
                {tb.label}
              </button>
            )
          })}
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-1.5 flex-none flex-wrap">
          <span className="text-[12px] text-text-2">Sort by:</span>
          {SORTS.map((s) => {
            const active = sort === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className="text-[12px]"
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontWeight: active ? 700 : 400,
                  background: active ? 'rgba(200, 241, 53, 0.18)' : 'transparent',
                  color: active ? 'var(--accent-strong)' : '#7060A0',
                  border: active ? '1px solid rgba(200, 241, 53, 0.45)' : '1px solid transparent',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
          {songs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-2 py-10">
              <div className="text-4xl mb-3">🎵</div>
              <p className="text-[15px] font-bold text-text mb-1">No songs yet</p>
              <p className="text-[13px] mb-5">Start by adding your first song.</p>
              <button
                onClick={() => navigate({ name: 'add' })}
                className="flex items-center gap-1.5 text-[13px] font-bold"
                style={{
                  padding: '9px 18px',
                  borderRadius: 9,
                  background: 'var(--accent)',
                  color: '#1C0840',
                }}
              >
                <PlusIcon size={14} />
                Add a Song
              </button>
            </div>
          ) : tab === 'spotify' ? (
            <>
              {filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-text-2 py-10">
                  <SpotifyIcon size={32} color="#7060A0" />
                  <p className="text-[15px] font-bold text-text mb-1 mt-3">No Spotify songs yet</p>
                  <p className="text-[13px] mb-5">Import songs from your Spotify library to see them here.</p>
                </div>
              ) : (
                groupedBySpotifyShow!.map(([show, items], gi) => (
                  <div key={show}>
                    <div
                      className="text-[11px] font-bold uppercase text-text-2"
                      style={{ letterSpacing: 1.2, padding: '8px 10px 4px' }}
                    >
                      {show}
                    </div>
                    {items.map((song, i) => (
                      <SongRow
                        key={song.id}
                        song={song}
                        index={i}
                        highlight={gi === 0 && i === 0}
                        onPlay={() => navigate({ name: 'playback', songId: song.id })}
                      />
                    ))}
                  </div>
                ))
              )}
              <div className="pt-3 flex justify-center">
                <button
                  onClick={() => navigate({ name: 'import' })}
                  className="text-[13px] font-semibold underline"
                  style={{ color: 'var(--accent-strong)', textUnderlineOffset: 3 }}
                >
                  Browse more from Spotify →
                </button>
              </div>
            </>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-text-2 text-[13px]">
              {tab === 'fav' ? 'No favorites yet — tap the heart on a song to add it here.' : 'No songs.'}
            </div>
          ) : (
            filtered.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                highlight={i === 0}
                onPlay={() => navigate({ name: 'playback', songId: song.id })}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
