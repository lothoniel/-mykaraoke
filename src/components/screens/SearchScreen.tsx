import { useEffect, useMemo, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }
type Tab = 'All' | 'Songs' | 'Artists' | 'Shows'

const TABS: Tab[] = ['All', 'Songs', 'Artists', 'Shows']
const RECENTS_KEY = 'mykaraoke-recent-searches'
const MAX_RECENTS = 8

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

function SearchIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function XIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ClockIcon({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

function getShow(song: Song): string {
  return song.genres?.[0] ?? ''
}

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

function saveRecents(list: string[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)))
  } catch {
    /* ignore */
  }
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

export default function SearchScreen({ navigate }: Props) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('All')
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [recents, setRecents] = useState<string[]>(loadRecents)
  const [focused, setFocused] = useState(false)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    db.getAllSongs().then(setAllSongs)
  }, [])

  // Commit query to recents after the user pauses typing for 800ms
  useEffect(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current)
    const q = query.trim()
    if (!q || q.length < 2) return
    commitTimer.current = setTimeout(() => {
      setRecents((prev) => {
        const next = [q, ...prev.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENTS)
        saveRecents(next)
        return next
      })
    }, 800)
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current)
    }
  }, [query])

  function removeRecent(r: string) {
    setRecents((prev) => {
      const next = prev.filter((x) => x !== r)
      saveRecents(next)
      return next
    })
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allSongs.filter((s) => {
      const t = s.title.toLowerCase()
      const a = s.artist.toLowerCase()
      const show = getShow(s).toLowerCase()
      if (tab === 'Songs') return t.includes(q)
      if (tab === 'Artists') return a.includes(q)
      if (tab === 'Shows') return show.includes(q)
      return t.includes(q) || a.includes(q) || show.includes(q)
    })
  }, [query, tab, allSongs])

  const hasQuery = query.trim().length > 0

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 flex-none">
        <div className="min-w-0">
          <div className="text-[22px] font-extrabold text-text leading-tight" style={{ letterSpacing: '-0.4px' }}>
            Search
          </div>
          <div className="text-[13px] text-text-2 mt-0.5 truncate">Find any song in your library</div>
        </div>
        <button
          onClick={() => navigate({ name: 'add' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[13px] font-bold flex-none"
          style={{ background: 'var(--accent)', color: '#1C0840' }}
        >
          <PlusIcon size={14} />
          Add Song
        </button>
      </div>

      <div className="flex-1 px-6 pb-6 flex flex-col gap-4 overflow-hidden">
        {/* Search input */}
        <div className="relative flex-none">
          <span
            className="absolute left-[14px] top-1/2 text-text-2 pointer-events-none"
            style={{ transform: 'translateY(-50%)' }}
          >
            <SearchIcon size={16} color="#7060A0" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search songs, artists, or shows…"
            autoFocus
            className="w-full text-[14px] text-text outline-none"
            style={{
              padding: '12px 40px 12px 42px',
              borderRadius: 12,
              background: '#FFFFFF',
              border: `2px solid ${focused || hasQuery ? 'var(--accent)' : 'rgba(100, 60, 180, 0.09)'}`,
              boxShadow: focused || hasQuery ? '0 0 0 4px rgba(200, 241, 53, 0.18)' : 'none',
              transition: 'border-color 120ms, box-shadow 120ms',
            }}
          />
          {hasQuery && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-[14px] top-1/2 flex items-center justify-center"
              style={{
                transform: 'translateY(-50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#EBE4FF',
              }}
            >
              <XIcon size={11} color="#7060A0" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-none flex-wrap">
          {TABS.map((tb) => {
            const active = tab === tb
            return (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className="text-[13px]"
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontWeight: active ? 700 : 500,
                  background: active ? 'var(--accent)' : '#FFFFFF',
                  color: active ? '#1C0840' : '#7060A0',
                  border: active ? 'none' : '1px solid rgba(100, 60, 180, 0.09)',
                }}
              >
                {tb}
              </button>
            )
          })}
        </div>

        {/* Results + recents */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
          {hasQuery && (
            <div className="text-[13px] text-text-2 flex-none mb-1">
              <span className="text-text font-bold">
                {results.length} result{results.length === 1 ? '' : 's'}
              </span>{' '}
              for &ldquo;{query.trim()}&rdquo;
            </div>
          )}

          {hasQuery ? (
            results.length === 0 ? (
              <div className="text-center py-10 text-text-2 text-[13px]">
                No matches. Try a different term or tab.
              </div>
            ) : (
              <div className="flex flex-col gap-[3px]">
                {results.map((s, i) => (
                  <SongRow
                    key={s.id}
                    song={s}
                    highlight={i === 0}
                    onPlay={() => navigate({ name: 'playback', songId: s.id })}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-text-2 text-[13px]">
              Type to search your library.
            </div>
          )}

          {/* Recent searches */}
          {recents.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex-1 h-px" style={{ background: 'rgba(100, 60, 180, 0.09)' }} />
                <span
                  className="text-[11px] font-semibold uppercase text-text-2"
                  style={{ letterSpacing: 1 }}
                >
                  Recent Searches
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(100, 60, 180, 0.09)' }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {recents.map((r) => (
                  <div
                    key={r}
                    className="flex items-center gap-1.5"
                    style={{
                      padding: '5px 10px 5px 12px',
                      borderRadius: 20,
                      background: '#EBE4FF',
                    }}
                  >
                    <ClockIcon size={13} color="#7060A0" />
                    <button
                      onClick={() => setQuery(r)}
                      className="text-[12px] text-text-2"
                    >
                      {r}
                    </button>
                    <button
                      onClick={() => removeRecent(r)}
                      aria-label={`Remove ${r} from recent searches`}
                      className="flex items-center justify-center text-text-2 hover:text-text"
                      style={{ padding: 2 }}
                    >
                      <XIcon size={11} color="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
