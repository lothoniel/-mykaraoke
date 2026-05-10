import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { generateId } from '../../lib/id'
import {
  getLikedSongs,
  getPlaylistTracks,
  getUserPlaylists,
} from '../../lib/spotify'
import type { Screen, SpotifyPlaylistSummary, SpotifyTrackSummary } from '../../types'

type Props = { navigate: (s: Screen) => void }
type Tab = 'liked' | 'playlists'

export default function ImportScreen({ navigate }: Props) {
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
    setLoading(true)
    setError(null)
    getLikedSongs()
      .then(setLikedSongs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'playlists' || playlists.length > 0) return
    setLoading(true)
    setError(null)
    getUserPlaylists()
      .then(setPlaylists)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [tab, playlists.length])

  function toggleTrack(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
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
    <div className="flex flex-col bg-canvas" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0 p-5 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => {
              if (selectedPlaylist) {
                setSelectedPlaylist(null)
                setPlaylistTracks([])
                setSelected(new Set())
              } else {
                navigate({ name: 'settings' })
              }
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">
            {selectedPlaylist ? selectedPlaylist.name : 'Import from Spotify'}
          </h1>
        </div>

        {/* Tabs — only show when not inside a playlist */}
        {!selectedPlaylist && (
          <div className="flex bg-lavender-soft rounded-xl p-1 mb-4">
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
      <div className="flex-1 overflow-y-auto px-5">
        {loading && (
          <div className="text-center text-muted py-10 text-sm">Loading…</div>
        )}
        {error && (
          <div className="text-center text-red-500 py-10 text-sm">{error}</div>
        )}

        {/* Playlists list */}
        {!loading && !error && tab === 'playlists' && !selectedPlaylist && (
          <div className="space-y-2 pb-4">
            {playlists.map((p) => (
              <button
                key={p.id}
                className="w-full flex items-center gap-3 bg-lavender-soft rounded-xl p-3 text-left"
                onClick={() => handleOpenPlaylist(p)}
              >
                {p.imageUrl && (
                  <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
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

        {/* Track list (liked songs or playlist tracks) */}
        {!loading && !error && (tab === 'liked' || selectedPlaylist) && (
          <div className="pb-24">
            {displayTracks.map((track) => (
              <button
                key={track.id}
                className="w-full flex items-center gap-3 py-3 border-b border-lavender-soft last:border-0 text-left"
                onClick={() => toggleTrack(track.id)}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selected.has(track.id) ? 'bg-lavender-dark border-lavender-dark' : 'border-lavender-dark'
                }`}>
                  {selected.has(track.id) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {track.coverArt && (
                  <img src={track.coverArt} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{track.title}</div>
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
        <div className="flex-shrink-0 p-4 border-t border-lavender-soft bg-canvas">
          <button
            className="w-full py-4 bg-lavender text-ink font-bold text-base rounded-lg disabled:opacity-40"
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
