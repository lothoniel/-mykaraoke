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
        setError(e instanceof Error ? e.message : 'Failed to load')
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
        setError(e instanceof Error ? e.message : 'Failed to load')
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
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSongs() {
    const tracks = (selectedPlaylist ? playlistTracks : likedSongs).filter((t) =>
      selected.has(t.id)
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

  return (
    <div className="flex flex-col bg-canvas" style={{ height: 'calc(100dvh - 56px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <button
            className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-coral-soft transition-colors"
            onClick={() => {
              if (selectedPlaylist) {
                setSelectedPlaylist(null)
                setPlaylistTracks([])
                setSelected(new Set())
              } else {
                goBack()
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-ink">
            {selectedPlaylist ? selectedPlaylist.name : 'Import from Spotify'}
          </h1>
        </div>

        {!selectedPlaylist && (
          <div className="flex bg-coral-soft rounded-xl p-1 mb-4">
            <button
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'liked' ? 'bg-white text-ink shadow-sm' : 'text-muted'
              }`}
              onClick={() => { setTab('liked'); setSelected(new Set()) }}
            >
              Liked Songs
            </button>
            <button
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === 'playlists' ? 'bg-white text-ink shadow-sm' : 'text-muted'
              }`}
              onClick={() => { setTab('playlists'); setSelected(new Set()) }}
            >
              Playlists
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        {loading && <div className="text-center text-muted py-10 text-sm">Loading…</div>}
        {error && <div className="text-center text-red-500 py-10 text-sm">{error}</div>}

        {!loading && !error && tab === 'playlists' && !selectedPlaylist && (
          <div className="space-y-2 pb-4">
            {playlists.map((p) => (
              <button
                key={p.id}
                className="w-full flex items-center gap-3 bg-coral-soft rounded-2xl p-3 text-left hover:shadow-sm transition-shadow"
                onClick={() => handleOpenPlaylist(p)}
              >
                {p.imageUrl && (
                  <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-ink truncate">{p.name}</div>
                  <div className="text-xs text-muted">{p.trackCount} songs</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
            {playlists.length === 0 && (
              <div className="text-center text-muted py-10 text-sm">No playlists found</div>
            )}
          </div>
        )}

        {!loading && !error && (tab === 'liked' || selectedPlaylist) && (
          <div className="pb-24 divide-y divide-border">
            {displayTracks.map((track) => (
              <button
                key={track.id}
                className="w-full flex items-center gap-3 py-3 text-left"
                onClick={() => toggleTrack(track.id)}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selected.has(track.id)
                      ? 'bg-coral border-coral'
                      : 'border-border'
                  }`}
                >
                  {selected.has(track.id) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {track.coverArt && (
                  <img src={track.coverArt} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-ink">{track.title}</div>
                  <div className="text-xs text-muted truncate">{track.artist}</div>
                </div>
              </button>
            ))}
            {displayTracks.length === 0 && (
              <div className="text-center text-muted py-10 text-sm">No songs found</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {selected.size > 0 && (
        <div className="flex-shrink-0 p-4 border-t border-border bg-canvas">
          <button
            className="w-full py-4 bg-coral text-white font-bold text-base rounded-xl disabled:opacity-40 hover:bg-coral-dark transition-colors"
            onClick={handleAddSongs}
            disabled={importing}
          >
            {importing ? 'Adding…' : `Add ${selected.size} Song${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
