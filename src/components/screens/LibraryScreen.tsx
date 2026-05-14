import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { generateId } from '../../lib/id'
import { getLikedSongs, getPlaylistTracks, getStoredOAuthToken, getUserPlaylists, RELINK_REQUIRED } from '../../lib/spotify'
import type { Screen, Song, SpotifyPlaylistSummary, SpotifyTrackSummary } from '../../types'

type Props = { navigate: (s: Screen) => void }
type Sort = 'recent' | 'name' | 'favorites'
type Tab = 'local' | 'spotify'
type SpotifySubTab = 'liked' | 'playlists'

export default function LibraryScreen({ navigate }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [sort, setSort] = useState<Sort>('recent')
  const [activeTab, setActiveTab] = useState<Tab>('local')
  const spotifyConnected = !!getStoredOAuthToken()

  // Spotify top-level
  const [likedSongs, setLikedSongs] = useState<SpotifyTrackSummary[]>([])
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([])
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [spotifyError, setSpotifyError] = useState<string | null>(null)
  const [spotifyLoaded, setSpotifyLoaded] = useState(false)
  const [spotifySubTab, setSpotifySubTab] = useState<SpotifySubTab>('liked')
  const [spotifySearch, setSpotifySearch] = useState('')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  // Inline playlist view
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylistSummary | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrackSummary[]>([])
  const [playlistTracksLoading, setPlaylistTracksLoading] = useState(false)
  const [playlistTracksError, setPlaylistTracksError] = useState<string | null>(null)

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  useEffect(() => {
    if (activeTab !== 'spotify' || spotifyLoaded) return
    async function load() {
      setSpotifyLoading(true)
      setSpotifyError(null)
      try {
        const [liked, lists] = await Promise.all([getLikedSongs(), getUserPlaylists()])
        setLikedSongs(liked)
        setPlaylists(lists)
        setSpotifyLoaded(true)
      } catch (e: unknown) {
        setSpotifyError(e instanceof Error ? e.message : 'Failed to load Spotify')
      } finally {
        setSpotifyLoading(false)
      }
    }
    load()
  }, [activeTab, spotifyLoaded])

  async function handleOpenPlaylist(playlist: SpotifyPlaylistSummary) {
    setSelectedPlaylist(playlist)
    setPlaylistTracks([])
    setPlaylistTracksError(null)
    setPlaylistTracksLoading(true)
    setSpotifySearch('')
    try {
      const tracks = await getPlaylistTracks(playlist.id)
      setPlaylistTracks(tracks)
    } catch (e: unknown) {
      setPlaylistTracksError(e instanceof Error ? e.message : 'Failed to load tracks')
    } finally {
      setPlaylistTracksLoading(false)
    }
  }

  function handleBackFromPlaylist() {
    setSelectedPlaylist(null)
    setPlaylistTracks([])
    setPlaylistTracksError(null)
    setSpotifySearch('')
  }

  async function handleAddTrack(track: SpotifyTrackSummary) {
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
    setAddedIds((prev) => new Set(prev).add(track.id))
    db.getAllSongs().then(setSongs)
  }

  function switchSpotifySubTab(tab: SpotifySubTab) {
    setSpotifySubTab(tab)
    setSpotifySearch('')
    setSelectedPlaylist(null)
    setPlaylistTracks([])
  }

  const sorted = [...songs].sort((a, b) => {
    if (sort === 'name') return a.title.localeCompare(b.title)
    if (sort === 'favorites') {
      if (a.isFavorite === b.isFavorite) return 0
      return a.isFavorite ? -1 : 1
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const sortOptions: { label: string; value: Sort }[] = [
    { label: 'Recently Added', value: 'recent' },
    { label: 'A–Z', value: 'name' },
    { label: 'Favorites', value: 'favorites' },
  ]

  const localSongIds = new Set(songs.map((s) => s.spotifyTrackId).filter(Boolean) as string[])
  const q = spotifySearch.toLowerCase()
  const filteredLiked = likedSongs.filter(
    (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
  )
  const filteredPlaylists = playlists.filter((p) => p.name.toLowerCase().includes(q))
  const filteredPlaylistTracks = playlistTracks.filter(
    (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
  )

  function TrackRow({ track }: { track: SpotifyTrackSummary }) {
    const alreadyInLibrary = localSongIds.has(track.id)
    const justAdded = addedIds.has(track.id)
    return (
      <div className="flex items-center gap-3 py-2.5">
        {track.coverArt ? (
          <img src={track.coverArt} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 bg-coral-light rounded-xl flex-shrink-0 flex items-center justify-center text-base">🎵</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{track.title}</div>
          <div className="text-xs text-muted truncate">{track.artist}</div>
        </div>
        {alreadyInLibrary || justAdded ? (
          <span className="text-xs text-muted flex-shrink-0">In library</span>
        ) : (
          <button
            className="flex-shrink-0 w-7 h-7 rounded-full bg-coral text-white flex items-center justify-center hover:bg-coral-dark transition-colors"
            onClick={() => handleAddTrack(track)}
            aria-label={`Add ${track.title}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-12">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-ink">Your Library</h1>
        {activeTab === 'local' && <span className="text-sm text-muted">{songs.length} songs</span>}
      </div>

      {/* Top-level tabs */}
      {spotifyConnected && (
        <div className="flex bg-coral-soft rounded-xl p-1 mb-5">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'local' ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
            onClick={() => setActiveTab('local')}
          >
            My Songs
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'spotify' ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
            onClick={() => setActiveTab('spotify')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 11.5c2.5-1 5.5-1 8 0M7 15c3-1.5 7-1.5 10 0M9 8.5c2-0.5 5-0.5 7 0" />
            </svg>
            Spotify
          </button>
        </div>
      )}

      {/* My Songs tab */}
      {activeTab === 'local' && (
        <>
          {songs.length > 1 && (
            <div className="flex gap-2 mb-5">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    sort === o.value ? 'bg-coral text-white' : 'bg-coral-light text-ink hover:bg-coral-soft'
                  }`}
                  onClick={() => setSort(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}

          {songs.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <div className="text-5xl mb-3">🎵</div>
              <p className="text-base font-semibold text-ink mb-2">No songs yet</p>
              <p className="text-sm mb-6">Start by adding your first song.</p>
              <button
                className="bg-coral text-white font-semibold px-6 py-3 rounded-xl"
                onClick={() => navigate({ name: 'add' })}
              >
                Add a Song
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((s) => (
                <button
                  key={s.id}
                  className="w-full flex gap-3 py-3 text-left hover:bg-coral-soft rounded-xl px-2 -mx-2 transition-colors"
                  onClick={() => navigate({ name: 'playback', songId: s.id })}
                >
                  <div className="w-12 h-12 bg-coral-light rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-xl">
                    {s.coverArt ? (
                      <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
                    ) : '🎵'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink truncate">{s.title}</div>
                    <div className="text-xs text-muted truncate">{s.artist}</div>
                    {s.genres?.[0] && (
                      <span className="text-xs text-coral-dark capitalize">{s.genres[0]}</span>
                    )}
                  </div>
                  {s.isFavorite && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-coral self-center flex-shrink-0">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Spotify tab */}
      {activeTab === 'spotify' && (
        <div>
          {selectedPlaylist ? (
            /* Inline playlist view */
            <>
              <button
                className="flex items-center gap-2 text-sm text-muted hover:text-ink mb-4 transition-colors"
                onClick={handleBackFromPlaylist}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                <span className="font-semibold truncate">{selectedPlaylist.name}</span>
              </button>

              {/* Search within playlist */}
              <div className="relative mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search in playlist…"
                  value={spotifySearch}
                  onChange={(e) => setSpotifySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-coral-soft rounded-xl border-0 outline-none focus:ring-2 focus:ring-coral text-ink placeholder:text-muted"
                />
              </div>

              {playlistTracksLoading && <div className="text-center text-muted py-10 text-sm">Loading…</div>}
              {playlistTracksError && (
                <div className="text-center py-10">
                  {playlistTracksError === RELINK_REQUIRED ? (
                    <>
                      <p className="text-sm text-ink mb-1 font-semibold">Spotify needs to be relinked</p>
                      <p className="text-xs text-muted mb-4">Playlist access wasn't granted. Unlink and reconnect Spotify to fix this.</p>
                      <button
                        className="text-xs font-semibold text-white bg-coral px-4 py-2 rounded-xl"
                        onClick={() => navigate({ name: 'settings' })}
                      >
                        Go to Settings
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-red-500">{playlistTracksError}</p>
                  )}
                </div>
              )}
              {!playlistTracksLoading && !playlistTracksError && (
                <div className="divide-y divide-border">
                  {filteredPlaylistTracks.length === 0 ? (
                    <p className="text-center text-sm text-muted py-10">
                      {spotifySearch ? 'No results.' : 'No tracks in this playlist.'}
                    </p>
                  ) : (
                    filteredPlaylistTracks.map((track) => <TrackRow key={track.id} track={track} />)
                  )}
                </div>
              )}
            </>
          ) : (
            /* Sub-tabs + search */
            <>
              <div className="flex bg-coral-soft rounded-xl p-1 mb-4">
                <button
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    spotifySubTab === 'liked' ? 'bg-white text-ink shadow-sm' : 'text-muted'
                  }`}
                  onClick={() => switchSpotifySubTab('liked')}
                >
                  Liked Songs
                </button>
                <button
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    spotifySubTab === 'playlists' ? 'bg-white text-ink shadow-sm' : 'text-muted'
                  }`}
                  onClick={() => switchSpotifySubTab('playlists')}
                >
                  Playlists
                </button>
              </div>

              <div className="relative mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder={spotifySubTab === 'liked' ? 'Search songs…' : 'Search playlists…'}
                  value={spotifySearch}
                  onChange={(e) => setSpotifySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-coral-soft rounded-xl border-0 outline-none focus:ring-2 focus:ring-coral text-ink placeholder:text-muted"
                />
              </div>

              {spotifyLoading && <div className="text-center text-muted py-10 text-sm">Loading…</div>}
              {spotifyError && <div className="text-center text-red-500 py-10 text-sm">{spotifyError}</div>}

              {!spotifyLoading && !spotifyError && spotifySubTab === 'liked' && (
                <div className="divide-y divide-border">
                  {filteredLiked.length === 0 ? (
                    <p className="text-center text-sm text-muted py-10">
                      {spotifySearch ? 'No results.' : 'No liked songs found.'}
                    </p>
                  ) : (
                    filteredLiked.map((track) => <TrackRow key={track.id} track={track} />)
                  )}
                </div>
              )}

              {!spotifyLoading && !spotifyError && spotifySubTab === 'playlists' && (
                <div className="space-y-2">
                  {filteredPlaylists.length === 0 ? (
                    <p className="text-center text-sm text-muted py-10">
                      {spotifySearch ? 'No results.' : 'No playlists found.'}
                    </p>
                  ) : (
                    filteredPlaylists.map((p) => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-3 bg-coral-soft rounded-2xl p-3 text-left hover:shadow-sm transition-shadow"
                        onClick={() => handleOpenPlaylist(p)}
                      >
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 bg-coral-light rounded-xl flex-shrink-0 flex items-center justify-center text-xl">🎵</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-ink truncate">{p.name}</div>
                          {p.trackCount > 0 && <div className="text-xs text-muted">{p.trackCount} songs</div>}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted flex-shrink-0">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
