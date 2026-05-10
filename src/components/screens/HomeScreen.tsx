import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }

function SongGrid({ songs, navigate }: { songs: Song[]; navigate: (s: Screen) => void }) {
  if (songs.length === 0) return null
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {songs.map((s) => (
        <div
          key={s.id}
          className="cursor-pointer group"
          onClick={() => navigate({ name: 'playback', songId: s.id })}
        >
          <div className="w-full aspect-square bg-lavender rounded-lg overflow-hidden mb-2 group-hover:scale-105 transition-transform">
            {s.coverArt ? (
              <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">🎵</div>
            )}
          </div>
          <div className="text-sm font-semibold leading-tight">{s.title}</div>
          <div className="text-xs text-muted">{s.artist}</div>
        </div>
      ))}
    </div>
  )
}

export default function HomeScreen({ navigate }: Props) {
  const [songs, setSongs] = useState<Song[]>([])

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  const favorites = songs.filter((s) => s.isFavorite)
  const recent = songs.slice(0, 6)

  return (
    <div className="min-h-screen bg-canvas p-5 pb-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">MyKaraoke</h1>
        <button onClick={() => navigate({ name: 'settings' })}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Featured scroll */}
      {recent.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">Featured</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth [-webkit-overflow-scrolling:touch]">
            {recent.map((s) => (
              <div
                key={s.id}
                className="flex-none w-40 cursor-pointer"
                onClick={() => navigate({ name: 'playback', songId: s.id })}
              >
                <div className="w-40 h-40 bg-gradient-to-br from-lavender to-lavender-dark rounded-xl flex items-center justify-center text-5xl mb-2 overflow-hidden">
                  {s.coverArt ? (
                    <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    '🎵'
                  )}
                </div>
                <div className="text-sm font-semibold leading-tight truncate">{s.title}</div>
                <div className="text-xs text-muted truncate">{s.artist}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Your Songs */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Your Songs</h2>
          {songs.length > 0 && (
            <button
              className="text-sm text-muted"
              onClick={() => navigate({ name: 'library' })}
            >
              See All →
            </button>
          )}
        </div>
        {songs.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-3">🎤</div>
            <p className="text-sm">No songs yet. Add your first one!</p>
          </div>
        ) : (
          <SongGrid songs={songs.slice(0, 8)} navigate={navigate} />
        )}
      </section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">⭐ Favorites</h2>
          <SongGrid songs={favorites} navigate={navigate} />
        </section>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-8">
        <button
          className="flex-1 flex items-center justify-center gap-2 bg-lavender text-ink font-semibold py-3.5 rounded-lg active:bg-lavender-dark"
          onClick={() => navigate({ name: 'add' })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Song
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 bg-lavender-light text-ink font-semibold py-3.5 rounded-lg active:bg-lavender"
          onClick={() => navigate({ name: 'search' })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search
        </button>
      </div>
    </div>
  )
}

