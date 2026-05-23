import { useEffect, useMemo, useState } from 'react'
import * as db from '../../hooks/useDB'
import { generateId } from '../../lib/id'
import { fetchLyrics } from '../../lib/lrclib'
import {
  getLikedSongs,
  getPlaylistTracks,
  getStoredOAuthToken,
  getUserPlaylists,
  startOAuthFlow,
} from '../../lib/spotify'
import type { Song, SpotifyPlaylistSummary, SpotifyTrackSummary } from '../../types'

type Props = {
  query: string
  allSongs: Song[]
  onSongAdded: (song: Song) => void
}

type SubTab = 'liked' | 'playlists'
type AddState = 'idle' | 'adding' | 'added'

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke="currentColor">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function CheckIcon({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function BackIcon({ size = 17, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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

function SpotifyTrackRow({
  track,
  addState,
  onAdd,
}: {
  track: SpotifyTrackSummary
  addState: AddState
  onAdd: () => void
}) {
  const disabled = addState !== 'idle'
  return (
    <div
      className="w-full flex items-center gap-[11px] text-left"
      style={{
        padding: '8px 10px',
        borderRadius: 11,
        background: addState === 'added' ? 'rgba(200, 241, 53, 0.13)' : 'transparent',
        border: `1px solid ${addState === 'added' ? 'rgba(200, 241, 53, 0.40)' : 'transparent'}`,
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
        {track.coverArt ? <img src={track.coverArt} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{track.title}</div>
        <div className="text-[11px] text-text-2 truncate">{track.artist}</div>
      </div>
      {fmtDuration(track.duration) && (
        <span className="text-[12px] text-text-2 flex-none">{fmtDuration(track.duration)}</span>
      )}
      <button
        onClick={onAdd}
        disabled={disabled}
        className="flex-none flex items-center gap-1 text-[12px] font-bold"
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: addState === 'added' ? 'transparent' : 'var(--accent)',
          color: addState === 'added' ? '#7060A0' : '#1C0840',
          border: addState === 'added' ? '1px solid rgba(100, 60, 180, 0.18)' : 'none',
          opacity: addState === 'adding' ? 0.6 : 1,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {addState === 'idle' && (
          <>
            <PlusIcon size={12} />
            Add
          </>
        )}
        {addState === 'adding' && 'Fetching…'}
        {addState === 'added' && (
          <>
            <CheckIcon size={11} color="currentColor" />
            Added
          </>
        )}
      </button>
    </div>
  )
}

function PlaylistRow({
  playlist,
  onOpen,
}: {
  playlist: SpotifyPlaylistSummary
  onOpen: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 text-left"
      style={{ padding: '8px 10px', borderRadius: 11 }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200, 241, 53, 0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
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
        {playlist.imageUrl ? (
          <img src={playlist.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-text truncate">{playlist.name}</div>
        <div className="text-[11px] text-text-2 truncate">
          {playlist.trackCount > 0
            ? `${playlist.trackCount} song${playlist.trackCount === 1 ? '' : 's'}`
            : 'Spotify playlist'}
        </div>
      </div>
      <span className="text-text-2 flex-none">
        <ChevronIcon size={16} color="currentColor" />
      </span>
    </button>
  )
}

export default function SpotifyBrowsePanel({ query, allSongs, onSongAdded }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('liked')
  const [liked, setLiked] = useState<SpotifyTrackSummary[] | null>(null)
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[] | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylistSummary | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrackSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasOAuth] = useState<boolean>(() => getStoredOAuthToken() !== null)
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!hasOAuth || liked !== null) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const tracks = await getLikedSongs()
        if (!cancelled) setLiked(tracks)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not reach Spotify')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [hasOAuth, liked])

  useEffect(() => {
    if (subTab !== 'playlists' || !hasOAuth || playlists !== null) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const pls = await getUserPlaylists()
        if (!cancelled) setPlaylists(pls)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not reach Spotify')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [subTab, hasOAuth, playlists])

  async function handleOpenPlaylist(playlist: SpotifyPlaylistSummary) {
    setSelectedPlaylist(playlist)
    setPlaylistTracks([])
    setLoading(true)
    setError(null)
    try {
      const tracks = await getPlaylistTracks(playlist.id)
      setPlaylistTracks(tracks)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load playlist tracks')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTrack(track: SpotifyTrackSummary) {
    if (addingIds.has(track.id) || addedIds.has(track.id)) return
    setAddingIds((prev) => new Set(prev).add(track.id))
    let lrcLyrics: string[] = []
    let lrcTimings: Song['timings'] = []
    try {
      const durationSec = track.duration ? Math.round(track.duration / 1000) : undefined
      const lrc = await fetchLyrics(track.title, track.artist, durationSec)
      if (lrc) {
        lrcLyrics = lrc.lyrics
        lrcTimings = lrc.timings ?? []
      }
    } catch {
      /* ignore — fall back to stub */
    }
    try {
      const newSong: Song = {
        id: generateId(),
        title: track.title,
        artist: track.artist,
        coverArt: track.coverArt,
        duration: track.duration,
        releaseDate: track.releaseDate,
        popularity: track.popularity,
        spotifyTrackId: track.id,
        spotifyLink: `https://open.spotify.com/track/${track.id}`,
        youtubeLink: undefined,
        lyrics: lrcLyrics,
        timings: lrcTimings,
        isFavorite: false,
        createdAt: new Date(),
      }
      await db.addSong(newSong)
      onSongAdded(newSong)
      setAddedIds((prev) => new Set(prev).add(track.id))
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev)
        next.delete(track.id)
        return next
      })
    }
  }

  function handleConnect() {
    startOAuthFlow().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Could not start Spotify sign-in')
    })
  }

  function handleBackFromPlaylist() {
    setSelectedPlaylist(null)
    setPlaylistTracks([])
  }

  const filteredTracks = useMemo(() => {
    const source = selectedPlaylist ? playlistTracks : (liked ?? [])
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
    )
  }, [query, liked, playlistTracks, selectedPlaylist])

  const filteredPlaylists = useMemo(() => {
    const source = playlists ?? []
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter((p) => p.name.toLowerCase().includes(q))
  }, [query, playlists])

  function addStateFor(trackId: string): AddState {
    if (addingIds.has(trackId)) return 'adding'
    if (addedIds.has(trackId)) return 'added'
    if (allSongs.some((s) => s.spotifyTrackId === trackId)) return 'added'
    return 'idle'
  }

  if (!hasOAuth) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
        <div className="text-[13px] text-text-2 max-w-[260px]">
          Connect your Spotify account to browse and add songs from your liked songs and playlists.
        </div>
        <button
          onClick={handleConnect}
          className="text-[13px] font-bold"
          style={{ padding: '9px 18px', borderRadius: 10, background: 'var(--accent)', color: '#1C0840' }}
        >
          Connect Spotify
        </button>
        {error && <div className="text-[12px] text-danger">{error}</div>}
      </div>
    )
  }

  const hasQuery = query.trim().length > 0

  return (
    <div className="flex flex-col gap-3 flex-1 overflow-hidden">
      {/* Sub-tabs (hidden when viewing a selected playlist) */}
      {!selectedPlaylist && (
        <div className="flex-none">
          <div className="flex" style={{ background: '#EBE4FF', borderRadius: 12, padding: 4 }}>
            <button
              onClick={() => setSubTab('liked')}
              className="flex-1 text-[13px]"
              style={{
                padding: 7,
                borderRadius: 9,
                background: subTab === 'liked' ? '#fff' : 'transparent',
                color: subTab === 'liked' ? '#1C0840' : '#7060A0',
                fontWeight: subTab === 'liked' ? 700 : 500,
                boxShadow: subTab === 'liked' ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
              }}
            >
              Liked Songs
            </button>
            <button
              onClick={() => setSubTab('playlists')}
              className="flex-1 text-[13px]"
              style={{
                padding: 7,
                borderRadius: 9,
                background: subTab === 'playlists' ? '#fff' : 'transparent',
                color: subTab === 'playlists' ? '#1C0840' : '#7060A0',
                fontWeight: subTab === 'playlists' ? 700 : 500,
                boxShadow: subTab === 'playlists' ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
              }}
            >
              Playlists
            </button>
          </div>
        </div>
      )}

      {/* Selected playlist header */}
      {selectedPlaylist && (
        <div className="flex-none flex items-center gap-2">
          <button
            onClick={handleBackFromPlaylist}
            aria-label="Back to playlists"
            className="text-text-2 hover:text-text"
            style={{ padding: 2 }}
          >
            <BackIcon size={17} color="currentColor" />
          </button>
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-text truncate">{selectedPlaylist.name}</div>
            <div className="text-[11px] text-text-2">
              {selectedPlaylist.trackCount} song{selectedPlaylist.trackCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {loading ? (
          <div className="text-center py-10 text-text-2 text-[13px]">Loading from Spotify…</div>
        ) : error ? (
          <div className="text-center py-10 text-danger text-[13px]">{error}</div>
        ) : subTab === 'playlists' && !selectedPlaylist ? (
          filteredPlaylists.length === 0 ? (
            <div className="text-center py-10 text-text-2 text-[13px]">
              {hasQuery ? 'No matching playlists.' : 'No playlists found.'}
            </div>
          ) : (
            <div className="flex flex-col gap-[3px]">
              {filteredPlaylists.map((p) => (
                <PlaylistRow key={p.id} playlist={p} onOpen={() => handleOpenPlaylist(p)} />
              ))}
            </div>
          )
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-10 text-text-2 text-[13px]">
            {hasQuery
              ? 'No matching tracks in your Spotify.'
              : selectedPlaylist
                ? 'This playlist is empty.'
                : 'No liked songs on Spotify yet.'}
          </div>
        ) : (
          <div className="flex flex-col gap-[3px]">
            {hasQuery && (
              <div className="text-[13px] text-text-2 flex-none mb-1">
                <span className="text-text font-bold">
                  {filteredTracks.length} result{filteredTracks.length === 1 ? '' : 's'}
                </span>{' '}
                for &ldquo;{query.trim()}&rdquo;
              </div>
            )}
            {filteredTracks.map((t) => (
              <SpotifyTrackRow
                key={t.id}
                track={t}
                addState={addStateFor(t.id)}
                onAdd={() => handleAddTrack(t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
