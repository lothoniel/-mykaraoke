import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }

export default function LibraryScreen({ navigate }: Props) {
  const [songs, setSongs] = useState<Song[]>([])

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  return (
    <div className="min-h-screen bg-canvas p-5 pb-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Library</h1>

      {songs.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3">🎵</div>
          <p className="text-sm">No songs yet.</p>
        </div>
      ) : (
        <div>
          {songs.map((s) => (
            <button
              key={s.id}
              className="w-full flex gap-3 py-3 border-b border-lavender-soft last:border-0 text-left"
              onClick={() => navigate({ name: 'playback', songId: s.id })}
            >
              <div className="w-14 h-14 bg-lavender rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
                {s.coverArt ? (
                  <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
                ) : (
                  '🎵'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.title}</div>
                <div className="text-xs text-muted truncate">{s.artist}</div>
              </div>
              {s.isFavorite && <span className="text-sm self-center">⭐</span>}
            </button>
          ))}
        </div>
      )}

      <button
        className="mt-8 w-full bg-lavender-light text-ink font-semibold py-3.5 rounded-lg"
        onClick={() => navigate({ name: 'home' })}
      >
        ← Back
      </button>
    </div>
  )
}
