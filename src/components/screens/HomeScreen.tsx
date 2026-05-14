import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }

function SongCard({ song, navigate }: { song: Song; navigate: (s: Screen) => void }) {
  const genre = song.genres?.[0]
  return (
    <div
      className="cursor-pointer group"
      onClick={() => navigate({ name: 'playback', songId: song.id })}
    >
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-coral-light group-hover:shadow-md transition-shadow">
        {song.coverArt ? (
          <img src={song.coverArt} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-coral-light to-coral-soft">
            🎵
          </div>
        )}
        {genre && (
          <span className="absolute top-2 left-2 bg-coral text-white text-xs font-semibold px-2 py-0.5 rounded-full capitalize leading-tight">
            {genre}
          </span>
        )}
        {song.isFavorite && (
          <span className="absolute top-2 right-2 text-coral drop-shadow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </span>
        )}
      </div>
      <div className="text-sm font-semibold leading-tight truncate text-ink">{song.title}</div>
      <div className="text-xs text-muted truncate">{song.artist}</div>
    </div>
  )
}

const moodColors = [
  { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-coral-soft', text: 'text-coral', border: 'border-coral-light' },
]

export default function HomeScreen({ navigate }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [activeGenre, setActiveGenre] = useState<string | null>(null)

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  const totalMs = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0)
  const totalHours = Math.round(totalMs / 360000) / 10
  const avgHours = songs.length > 0 ? Math.round((totalHours / songs.length) * 10) / 10 : 0

  const genreFreq = new Map<string, number>()
  for (const song of songs) {
    for (const g of song.genres ?? []) {
      genreFreq.set(g, (genreFreq.get(g) ?? 0) + 1)
    }
  }
  const genres = [...genreFreq.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)

  const filteredSongs = activeGenre
    ? songs.filter((s) => s.genres?.includes(activeGenre))
    : songs

  const featured = songs[0] ?? null
  const moodGenres = genres.slice(0, 3)
  const hasMoods = moodGenres.length > 0
  const favorites = songs.filter((s) => s.isFavorite)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-12">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-ink mb-1">Welcome back</h1>
          <p className="text-muted text-sm mb-4">Ready to sing your heart out?</p>
          {songs.length > 0 && (
            <div className="flex items-end gap-5">
              <div>
                <span className="text-2xl font-bold text-ink block">{songs.length}</span>
                <span className="text-xs text-muted">songs</span>
              </div>
              {totalHours > 0 && (
                <>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <span className="text-2xl font-bold text-ink block">{totalHours}h</span>
                    <span className="text-xs text-muted">total</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <span className="text-2xl font-bold text-ink block">{avgHours}h</span>
                    <span className="text-xs text-muted">avg</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {featured && (
          <div
            className="flex gap-3 items-center bg-coral-soft rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-shadow sm:w-72 flex-shrink-0"
            onClick={() => navigate({ name: 'playback', songId: featured.id })}
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-coral-light">
              {featured.coverArt ? (
                <img src={featured.coverArt} alt={featured.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted mb-0.5">Featured</div>
              <div className="font-semibold text-sm truncate text-ink">{featured.title}</div>
              <div className="text-xs text-muted truncate">{featured.artist}</div>
              <div className="mt-2">
                <span className="bg-coral text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Start Karaoke
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Genre filter chips */}
      {genres.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Explore by Genre
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            <button
              className={`flex-none px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                activeGenre === null
                  ? 'bg-coral text-white'
                  : 'bg-coral-light text-ink hover:bg-coral-soft'
              }`}
              onClick={() => setActiveGenre(null)}
            >
              All
            </button>
            {genres.map((g) => (
              <button
                key={g}
                className={`flex-none px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
                  activeGenre === g
                    ? 'bg-coral text-white'
                    : 'bg-coral-light text-ink hover:bg-coral-soft'
                }`}
                onClick={() => setActiveGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Library grid */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-ink">
            {activeGenre ? (
              <span className="capitalize">{activeGenre}</span>
            ) : (
              'Your Karaoke Library'
            )}
          </h2>
          {songs.length > 10 && !activeGenre && (
            <button
              className="text-sm text-coral font-medium"
              onClick={() => navigate({ name: 'library' })}
            >
              View all
            </button>
          )}
        </div>

        {filteredSongs.length === 0 && songs.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <div className="text-5xl mb-4">🎤</div>
            <p className="text-base font-semibold text-ink mb-2">No songs yet</p>
            <p className="text-sm mb-6">Add your first song to get started!</p>
            <button
              className="bg-coral text-white font-semibold px-6 py-3 rounded-xl"
              onClick={() => navigate({ name: 'add' })}
            >
              Add First Song
            </button>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">
            No songs with genre &ldquo;{activeGenre}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredSongs.slice(0, 10).map((s) => (
              <SongCard key={s.id} song={s} navigate={navigate} />
            ))}
          </div>
        )}
      </section>

      {/* Sing to Your Mood / Favorites */}
      {songs.length > 0 && (hasMoods || favorites.length > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-4">Sing to Your Mood</h2>
          {hasMoods ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {moodGenres.map((genre, idx) => {
                const moodSongs = songs.filter((s) => s.genres?.includes(genre)).slice(0, 2)
                const color = moodColors[idx]
                return (
                  <div key={genre} className={`${color.bg} border ${color.border} rounded-2xl p-4`}>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${color.text} mb-3 block capitalize`}
                    >
                      {genre}
                    </span>
                    <div className="space-y-2">
                      {moodSongs.map((s) => (
                        <button
                          key={s.id}
                          className="w-full flex items-center gap-2 text-left"
                          onClick={() => navigate({ name: 'playback', songId: s.id })}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white">
                            {s.coverArt ? (
                              <img src={s.coverArt} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm">
                                🎵
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate text-ink">{s.title}</div>
                            <div className="text-xs text-muted truncate">{s.artist}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {favorites.slice(0, 4).map((s) => (
                <SongCard key={s.id} song={s} navigate={navigate} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Bottom action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-coral-soft rounded-2xl p-5">
          <div className="text-sm font-bold text-ink mb-1">Grow the Library</div>
          <p className="text-xs text-muted mb-4">
            Add songs from Spotify or enter them manually to build your collection.
          </p>
          <button
            className="bg-coral text-white text-sm font-semibold px-4 py-2 rounded-xl"
            onClick={() => navigate({ name: 'add' })}
          >
            Add a Song
          </button>
        </div>
        <div className="bg-coral-soft rounded-2xl p-5">
          <div className="text-sm font-bold text-ink mb-1">Continue Singing</div>
          <p className="text-xs text-muted mb-4">
            Browse your full library and pick something to sing.
          </p>
          <button
            className="border border-border text-ink text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white transition-colors"
            onClick={() => navigate({ name: 'library' })}
          >
            View Library
          </button>
        </div>
      </div>
    </div>
  )
}
