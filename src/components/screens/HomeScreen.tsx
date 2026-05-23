import { useEffect, useMemo, useState } from 'react'
import * as db from '../../hooks/useDB'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }
type PrimaryFilter = 'All' | 'Favorites' | 'Recent' | 'Popular'

const PRIMARY_FILTERS: PrimaryFilter[] = ['All', 'Favorites', 'Recent', 'Popular']

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function PlayIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  )
}

function MicIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M19 11v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  )
}

function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function HeartIcon({ size = 13, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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

function SongRow({
  song,
  highlight,
  onPlay,
}: {
  song: Song
  highlight: boolean
  onPlay: () => void
}) {
  const show = song.genres?.[0]
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
      <div
        className="flex-none overflow-hidden"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #C8F135 0%, #7C3AED 100%)',
        }}
      >
        {song.coverArt ? (
          <img src={song.coverArt} alt="" className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{song.title}</div>
        <div className="text-[11px] text-text-2 truncate">
          {song.artist}
          {show ? ` · ${show}` : ''}
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

export default function HomeScreen({ navigate }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [primary, setPrimary] = useState<PrimaryFilter>('All')
  const [activeGenre, setActiveGenre] = useState<string | null>(null)

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  const genres = useMemo(() => {
    const freq = new Map<string, number>()
    for (const s of songs) for (const g of s.genres ?? []) freq.set(g, (freq.get(g) ?? 0) + 1)
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)
  }, [songs])

  const filteredSongs = useMemo(() => {
    let list = songs
    if (primary === 'Favorites') list = list.filter((s) => s.isFavorite)
    else if (primary === 'Recent')
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    else if (primary === 'Popular')
      list = [...list].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    if (activeGenre) list = list.filter((s) => s.genres?.includes(activeGenre))
    return list
  }, [songs, primary, activeGenre])

  const featured = songs[0] ?? null
  const featuredShow = featured?.genres?.[0]
  const visibleRows = filteredSongs.slice(0, 5)

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 flex-none">
        <div className="min-w-0">
          <div className="text-[22px] font-extrabold text-text leading-tight" style={{ letterSpacing: '-0.4px' }}>
            MyKaraoke
          </div>
          <div className="text-[13px] text-text-2 mt-0.5 truncate">
            Your anime karaoke library · {songs.length} song{songs.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <button
            onClick={() => navigate({ name: 'library' })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] bg-surface border border-border text-text-2 text-[13px] font-semibold hover:bg-white"
          >
            <SearchIcon size={14} />
            Search
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

      {/* Body */}
      <div className="flex-1 px-6 pb-6 flex flex-col gap-4 overflow-auto">
        {/* Featured hero */}
        {featured && (
          <section className="flex-none">
            <div
              className="text-[11px] font-bold uppercase text-text-2 mb-2.5"
              style={{ letterSpacing: 1.5 }}
            >
              Featured
            </div>
            <div
              className="relative flex overflow-hidden cursor-pointer"
              style={{
                height: 148,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 55%, #A78BFA 100%)',
              }}
              onClick={() => navigate({ name: 'playback', songId: featured.id })}
            >
              <div
                className="relative flex-none flex items-center justify-center"
                style={{
                  width: 148,
                  background: featured.coverArt
                    ? `url(${featured.coverArt}) center/cover`
                    : 'linear-gradient(135deg, #C8F135 0%, #7C3AED 100%)',
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.35)',
                  }}
                >
                  <PlayIcon size={16} color="white" />
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-between" style={{ padding: '18px 22px' }}>
                <div className="min-w-0">
                  <div
                    className="text-[20px] font-extrabold text-white truncate"
                    style={{ letterSpacing: '-0.3px' }}
                  >
                    {featured.title}
                  </div>
                  <div className="text-[13px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {featured.artist}
                    {featuredShow ? ` · ${featuredShow}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate({ name: 'playback', songId: featured.id })
                    }}
                    className="flex items-center gap-1.5 text-[13px] font-bold"
                    style={{
                      padding: '8px 18px',
                      borderRadius: 20,
                      background: 'var(--accent)',
                      color: '#1C0840',
                    }}
                  >
                    <MicIcon size={14} color="#1C0840" />
                    Sing Now
                  </button>
                  {fmtDuration(featured.duration) && (
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {fmtDuration(featured.duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Songs list */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2.5 flex-none">
            <span className="text-[15px] font-bold text-text">Your Songs</span>
            {songs.length > 5 && (
              <button
                onClick={() => navigate({ name: 'library' })}
                className="text-[13px] font-semibold"
                style={{ color: 'var(--accent-strong)' }}
              >
                See All →
              </button>
            )}
          </div>

          {/* Primary filter pills */}
          <div className="flex gap-1.5 mb-2 flex-none">
            {PRIMARY_FILTERS.map((f) => {
              const active = primary === f
              return (
                <button
                  key={f}
                  onClick={() => setPrimary(f)}
                  className="text-[12px]"
                  style={{
                    padding: '5px 13px',
                    borderRadius: 16,
                    fontWeight: active ? 700 : 400,
                    background: active ? 'var(--accent)' : '#EBE4FF',
                    color: active ? '#1C0840' : '#7060A0',
                  }}
                >
                  {f}
                </button>
              )
            })}
          </div>

          {/* Secondary genre chips (kept from current Home) */}
          {genres.length > 0 && (
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 flex-none [-webkit-overflow-scrolling:touch]">
              <button
                onClick={() => setActiveGenre(null)}
                className="text-[12px] flex-none capitalize"
                style={{
                  padding: '5px 12px',
                  borderRadius: 16,
                  fontWeight: activeGenre === null ? 700 : 400,
                  background: activeGenre === null ? 'var(--accent)' : '#EBE4FF',
                  color: activeGenre === null ? '#1C0840' : '#7060A0',
                }}
              >
                All genres
              </button>
              {genres.map((g) => {
                const active = activeGenre === g
                return (
                  <button
                    key={g}
                    onClick={() => setActiveGenre(active ? null : g)}
                    className="text-[12px] flex-none capitalize"
                    style={{
                      padding: '5px 12px',
                      borderRadius: 16,
                      fontWeight: active ? 700 : 400,
                      background: active ? 'var(--accent)' : '#EBE4FF',
                      color: active ? '#1C0840' : '#7060A0',
                    }}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          )}

          {/* Rows */}
          {songs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-text-2 py-10">
              <div className="text-4xl mb-3">🎤</div>
              <p className="text-[15px] font-bold text-text mb-1">No songs yet</p>
              <p className="text-[13px] mb-5">Add your first song to get started.</p>
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
                Add First Song
              </button>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="text-center py-10 text-text-2 text-[13px]">
              No songs match those filters.
            </div>
          ) : (
            <div className="flex flex-col gap-[3px] overflow-y-auto">
              {visibleRows.map((s, i) => (
                <SongRow
                  key={s.id}
                  song={s}
                  highlight={i === 0}
                  onPlay={() => navigate({ name: 'playback', songId: s.id })}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
