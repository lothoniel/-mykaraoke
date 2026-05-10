import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { formatMs } from '../../lib/youtube'
import type { Screen, Song } from '../../types'

type Props = { songId: string; navigate: (s: Screen) => void }

export default function DetailsScreen({ songId, navigate }: Props) {
  const [song, setSong] = useState<Song | null>(null)
  const [showLyrics, setShowLyrics] = useState(false)

  useEffect(() => {
    db.getSong(songId).then((s) => { if (s) setSong(s) })
  }, [songId])

  if (!song) return null

  return (
    <div className="min-h-screen bg-canvas p-5 pb-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Song Details</h1>

      {/* Cover art */}
      <div className="flex justify-center mb-5">
        {song.coverArt ? (
          <img
            src={song.coverArt}
            alt={song.title}
            className="w-48 h-48 rounded-xl object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-48 h-48 bg-lavender rounded-xl flex items-center justify-center text-7xl">🎵</div>
        )}
      </div>

      <h2 className="text-xl font-bold text-center mb-1">{song.title}</h2>
      <p className="text-sm text-muted text-center mb-6">{song.artist}</p>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {song.duration && (
          <div className="bg-lavender-soft p-4 rounded-lg">
            <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Duration</div>
            <div className="text-base font-semibold">{formatMs(song.duration)}</div>
          </div>
        )}
        {song.releaseDate && (
          <div className="bg-lavender-soft p-4 rounded-lg">
            <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Released</div>
            <div className="text-base font-semibold">{song.releaseDate.slice(0, 7)}</div>
          </div>
        )}
        {song.popularity !== undefined && (
          <div className="bg-lavender-soft p-4 rounded-lg">
            <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Popularity</div>
            <div className="text-base font-semibold">{song.popularity}/100</div>
          </div>
        )}
        <div className="bg-lavender-soft p-4 rounded-lg">
          <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Lines</div>
          <div className="text-base font-semibold">{song.lyrics.length}</div>
        </div>
      </div>

      {/* Genre tags */}
      {song.genres && song.genres.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase text-muted tracking-wide mb-2">Genre & Mood</div>
          <div className="flex gap-2 flex-wrap">
            {song.genres.map((g) => (
              <span key={g} className="bg-lavender text-ink px-3 py-1 rounded-full text-xs font-semibold capitalize">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* About Artist */}
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase text-muted tracking-wide mb-2">About Artist</div>
        {song.genres && song.genres.length > 0 ? (
          <p className="text-sm text-gray-600 leading-relaxed">
            {song.artist} is known for {song.genres.slice(0, 3).join(', ')} music.
          </p>
        ) : (
          <p className="text-sm text-muted">No artist info available.</p>
        )}
      </div>

      {/* Lyrics preview */}
      <button
        className="w-full bg-lavender text-ink font-semibold py-3 rounded-lg mb-3"
        onClick={() => setShowLyrics((v) => !v)}
      >
        📝 {showLyrics ? 'Hide' : 'View'} Lyrics
      </button>
      {showLyrics && (
        <div className="bg-white border border-lavender-light rounded-lg p-4 text-xs text-muted font-mono leading-relaxed max-h-48 overflow-y-auto mb-4">
          {song.lyrics.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      <button
        className="w-full bg-lavender-light text-ink font-semibold py-3.5 rounded-lg"
        onClick={() => navigate({ name: 'playback', songId: song.id })}
      >
        ← Back
      </button>
    </div>
  )
}
