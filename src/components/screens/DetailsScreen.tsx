import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { formatMs } from '../../lib/youtube'
import type { Screen, Song } from '../../types'

type Props = { songId: string; navigate: (s: Screen) => void; goBack: () => void }

export default function DetailsScreen({ songId, navigate, goBack }: Props) {
  const [song, setSong] = useState<Song | null>(null)
  const [showLyrics, setShowLyrics] = useState(false)

  useEffect(() => {
    db.getSong(songId).then((s) => { if (s) setSong(s) })
  }, [songId])

  if (!song) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <button
          className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-coral-soft transition-colors"
          onClick={goBack}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-ink">Song Details</h1>
      </div>

      {/* Cover art */}
      <div className="flex justify-center mb-5">
        {song.coverArt ? (
          <img
            src={song.coverArt}
            alt={song.title}
            className="w-48 h-48 rounded-2xl object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-48 h-48 bg-coral-light rounded-2xl flex items-center justify-center text-7xl">
            🎵
          </div>
        )}
      </div>

      <h2 className="text-2xl font-bold text-center text-ink mb-1">{song.title}</h2>
      <p className="text-sm text-muted text-center mb-6">{song.artist}</p>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {song.duration && (
          <div className="bg-coral-soft p-4 rounded-2xl">
            <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Duration</div>
            <div className="text-base font-semibold text-ink">{formatMs(song.duration)}</div>
          </div>
        )}
        {song.releaseDate && (
          <div className="bg-coral-soft p-4 rounded-2xl">
            <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Released</div>
            <div className="text-base font-semibold text-ink">{song.releaseDate.slice(0, 7)}</div>
          </div>
        )}
        {song.popularity !== undefined && (
          <div className="bg-coral-soft p-4 rounded-2xl">
            <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Popularity</div>
            <div className="text-base font-semibold text-ink">{song.popularity}/100</div>
          </div>
        )}
        <div className="bg-coral-soft p-4 rounded-2xl">
          <div className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Lines</div>
          <div className="text-base font-semibold text-ink">{song.lyrics.length}</div>
        </div>
      </div>

      {/* Genre tags */}
      {song.genres && song.genres.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase text-muted tracking-wide mb-2">Genre &amp; Mood</div>
          <div className="flex gap-2 flex-wrap">
            {song.genres.map((g) => (
              <span
                key={g}
                className="bg-coral text-white px-3 py-1 rounded-full text-xs font-semibold capitalize"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lyrics toggle */}
      <button
        className="w-full bg-coral-light text-ink font-semibold py-3 rounded-xl mb-3 hover:bg-coral hover:text-white transition-colors"
        onClick={() => setShowLyrics((v) => !v)}
      >
        {showLyrics ? 'Hide Lyrics' : 'View Lyrics'}
      </button>
      {showLyrics && (
        <div className="bg-white border border-border rounded-xl p-4 text-xs text-muted font-mono leading-relaxed max-h-48 overflow-y-auto mb-4">
          {song.lyrics.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="flex-1 bg-coral text-white font-semibold py-3 rounded-xl"
          onClick={goBack}
        >
          Back to Song
        </button>
        <button
          className="flex-1 border border-border text-ink font-semibold py-3 rounded-xl hover:bg-coral-soft transition-colors"
          onClick={() => navigate({ name: 'edit', songId: song.id })}
        >
          Edit
        </button>
      </div>
    </div>
  )
}
