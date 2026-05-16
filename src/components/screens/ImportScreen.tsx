import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { generateId } from '../../lib/id'
import {
  getLikedSongs,
  getPlaylistTracks,
  getUserPlaylists,
} from '../../lib/spotify'
import type { Screen, SpotifyPlaylistSummary, SpotifyTrackSummary } from '../../types'

type Props = { navigate: (s: Screen) => void; goBack: () => void }
type Tab = 'liked' | 'playlists'

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function BackIcon({ size = 19, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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

function CheckIcon({ size = 11, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function ImportScreen({ navigate, goBack }: Props) {
  const [tab, setTab] = useState<Tab>('liked')
  const [likedSongs, setLikedSongs] = useState<SpotifyTrackSummary[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([])
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrackSummary[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylistSummary | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        setLikedSongs(await getLikedSongs())
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not reach Spotify')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (tab !== 'playlists' || playlists.length > 0) return
    async function load() {
      setLoading(true)
      setError(null)
      try {
        setPlaylists(await getUserPlaylists())
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not reach Spotify')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tab, playlists.length])

  function toggleTrack(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function handleOpenPlaylist(playlist: SpotifyPlaylistSummary) {
    setSelectedPlaylist(playlist)
    setSelected(new Set())
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

  async function handleAddSongs() {
    const tracks = (selectedPlaylist ? playlistTracks : likedSongs).filter((t) =>
      selected.has(t.id),
    )
    if (tracks.length === 0) return
    setImporting(true)
    for (const track of tracks) {
      await db.addSong({
        id: generateId(),
        title: track.title,
        artist: track.artist,
        coverArt: track.coverArt,
        duration: track.duration,
        releaseDate: track.releaseDate,
        popularity: track.popularity,
        spotifyTrackId: track.id,
        youtubeLink: undefined,
        lyrics: [],
        timings: [],
        isFavorite: false,
        createdAt: new Date(),
      })
    }
    setImporting(false)
    navigate({ name: 'library' })
  }

  const displayTracks = selectedPlaylist ? playlistTracks : likedSongs
  const showingTracks = tab === 'liked' || selectedPlaylist !== null
  const showingPlaylists = tab === 'playlists' && !selectedPlaylist

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="flex-none flex items-center gap-3 border-b border-border" style={{ padding: '14px 28px' }}>
        <button
          onClick={() => {
            if (selectedPlaylist) {
              setSelectedPlaylist(null)
              setPlaylistTracks([])
              setSelected(new Set())
            } else {
              goBack()
            }
          }}
          aria-label="Back"
          className="text-text-2 hover:text-text"
          style={{ padding: 2 }}
        >
          <BackIcon size={19} color="currentColor" />
        </button>
        <div className="min-w-0">
          <div className="text-[22px] font-extrabold text-text leading-tight truncate" style={{ letterSpacing: '-0.4px' }}>
            {selectedPlaylist ? selectedPlaylist.name : 'Import from Spotify'}
          </div>
          <div className="text-[13px] text-text-2 mt-0.5">
            {selectedPlaylist
              ? `${playlistTracks.length} track${playlistTracks.length === 1 ? '' : 's'}`
              : 'Pick songs to add to your karaoke library.'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {!selectedPlaylist && (
        <div className="flex-none" style={{ padding: '14px 28px 0' }}>
          <div className="flex" style={{ background: '#EBE4FF', borderRadius: 12, padding: 4 }}>
            <button
              onClick={() => { setTab('liked'); setSelected(new Set()) }}
              className="flex-1 text-[13px]"
              style={{
                padding: 7,
                borderRadius: 9,
                background: tab === 'liked' ? '#fff' : 'transparent',
                color: tab === 'liked' ? '#1C0840' : '#7060A0',
                fontWeight: tab === 'liked' ? 700 : 500,
                boxShadow: tab === 'liked' ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
              }}
            >
              Liked Songs
            </button>
            <button
              onClick={() => { setTab('playlists'); setSelected(new Set()) }}
              className="flex-1 text-[13px]"
              style={{
                padding: 7,
                borderRadius: 9,
                background: tab === 'playlists' ? '#fff' : 'transparent',
                color: tab === 'playlists' ? '#1C0840' : '#7060A0',
                fontWeight: tab === 'playlists' ? 700 : 500,
                boxShadow: tab === 'playlists' ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
              }}
            >
              Playlists
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '14px 28px 0' }}>
        {loading && (
          <div className="text-center text-text-2 text-[13px] py-10">Loading from Spotify…</div>
        )}
        {error && !loading && (
          <div className="text-center text-danger text-[13px] py-10">{error}</div>
        )}

        {/* Playlists list */}
        {!loading && !error && showingPlaylists && (
          <div className="flex flex-col gap-1.5 pb-4">
            {playlists.length === 0 ? (
              <div className="text-center text-text-2 text-[13px] py-10">
                You don&apos;t have any Spotify playlists yet.
              </div>
            ) : (
              playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleOpenPlaylist(p)}
                  className="w-full flex items-center gap-3 text-left"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 11,
                  }}
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
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-text truncate">{p.name}</div>
                    <div className="text-[11px] text-text-2 truncate">
                      {p.trackCount > 0
                        ? `${p.trackCount} song${p.trackCount === 1 ? '' : 's'}`
                        : 'Spotify playlist'}
                    </div>
                  </div>
                  <span className="text-text-2 flex-none">
                    <ChevronIcon size={16} color="currentColor" />
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Tracks list (Liked or selected playlist) */}
        {!loading && !error && showingTracks && (
          <div className="flex flex-col pb-28">
            {displayTracks.length === 0 ? (
              <div className="text-center text-text-2 text-[13px] py-10">
                {selectedPlaylist ? 'This playlist is empty.' : 'No liked songs on Spotify yet.'}
              </div>
            ) : (
              displayTracks.map((track) => {
                const isSelected = selected.has(track.id)
                return (
                  <button
                    key={track.id}
                    onClick={() => toggleTrack(track.id)}
                    className="w-full flex items-center gap-3 text-left"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 11,
                      background: isSelected ? 'rgba(200, 241, 53, 0.13)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(200, 241, 53, 0.40)' : 'transparent'}`,
                    }}
                  >
                    <div
                      className="flex-none flex items-center justify-center"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        border: isSelected
                          ? '2px solid var(--accent)'
                          : '2px solid rgba(100, 60, 180, 0.20)',
                      }}
                    >
                      {isSelected && <CheckIcon size={11} color="#1C0840" />}
                    </div>
                    <div
                      className="flex-none overflow-hidden"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #C8F135 0%, #7C3AED 100%)',
                      }}
                    >
                      {track.coverArt ? (
                        <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text truncate">{track.title}</div>
                      <div className="text-[11px] text-text-2 truncate">{track.artist}</div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {selected.size > 0 && (
        <div
          className="flex-none"
          style={{
            padding: '12px 28px',
            background: '#FFFFFF',
            borderTop: '1px solid rgba(100, 60, 180, 0.09)',
          }}
        >
          <button
            onClick={handleAddSongs}
            disabled={importing}
            className="w-full text-[14px] font-bold disabled:opacity-40"
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#1C0840',
            }}
          >
            {importing
              ? 'Adding…'
              : `Add ${selected.size} song${selected.size !== 1 ? 's' : ''} to library`}
          </button>
        </div>
      )}
    </div>
  )
}
