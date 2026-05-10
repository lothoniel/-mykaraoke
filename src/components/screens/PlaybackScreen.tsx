import { useEffect, useId, useState, useRef } from 'react'
import * as db from '../../hooks/useDB'
import { useYouTube } from '../../hooks/useYouTube'
import { extractVideoId, formatSeconds } from '../../lib/youtube'
import type { Screen, Song } from '../../types'

type Props = { songId: string; navigate: (s: Screen) => void }

function findCurrentLineIndex(timings: Song['timings'], currentTime: number): number {
  let idx = -1
  for (const t of timings) {
    if (t.timestamp <= currentTime) idx = t.lineIndex
    else break
  }
  return idx
}

export default function PlaybackScreen({ songId, navigate }: Props) {
  const uid = useId().replace(/:/g, '')
  const playerId = `yt-player-playback-${uid}`

  const [song, setSong] = useState<Song | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [source, setSource] = useState<'youtube' | 'spotify'>('youtube')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    db.getSong(songId).then((s) => {
      if (s) {
        setSong(s)
        setIsFavorite(s.isFavorite)
      }
    })
  }, [songId])

  const videoId = song ? (extractVideoId(song.youtubeLink ?? '') ?? null) : null
  const { ready, playerState, getCurrentTime, getDuration } = useYouTube(playerId, videoId)

  // Poll current time when playing
  useEffect(() => {
    if (playerState === 'playing') {
      intervalRef.current = setInterval(() => {
        setCurrentTime(getCurrentTime())
      }, 150)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playerState, getCurrentTime])

  async function handleToggleFavorite() {
    if (!song) return
    await db.toggleFavorite(song.id)
    setIsFavorite((f) => !f)
  }

  if (!song) return null

  const sortedTimings = [...song.timings].sort((a, b) => a.timestamp - b.timestamp)
  const currentLineIdx = findCurrentLineIndex(sortedTimings, currentTime)
  const prevLine = currentLineIdx > 0 ? song.lyrics[currentLineIdx - 1] : null
  const currentLine = currentLineIdx >= 0 ? song.lyrics[currentLineIdx] : null
  const nextLines = currentLineIdx >= 0 ? song.lyrics.slice(currentLineIdx + 1, currentLineIdx + 3) : []

  const duration = getDuration()
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const hasTimings = song.timings.length > 0

  return (
    <div className="min-h-screen bg-canvas pb-10">
      <div className="max-w-4xl mx-auto p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-bold">Now Playing</h1>
          <button onClick={() => navigate({ name: 'home' })}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Desktop: side by side / Mobile: stacked */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-8 mb-6">
          {/* Video */}
          <div>
            {source === 'spotify' ? (
              <div className="w-full aspect-video bg-lavender-soft rounded-xl flex flex-col items-center justify-center text-center p-6">
                <div className="text-4xl mb-3">🎵</div>
                <div className="font-semibold text-ink mb-1">Spotify Playback</div>
                <div className="text-sm text-muted">Coming soon — sign in with Spotify to play here</div>
              </div>
            ) : videoId ? (
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden yt-player">
                <div id={playerId} />
              </div>
            ) : (
              <div className="w-full aspect-video bg-gray-200 rounded-xl flex items-center justify-center text-muted">
                No video
              </div>
            )}
          </div>

          {/* Lyrics panel */}
          <div className="flex flex-col mt-4 lg:mt-0">
            {/* Song info */}
            <div className="mb-3">
              <div className="text-xl font-bold">{song.title}</div>
              <div className="text-sm text-muted">{song.artist}</div>
            </div>

            {/* Source selector */}
            <div className="flex gap-2 mb-4">
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  source === 'youtube'
                    ? 'border-lavender bg-lavender text-ink'
                    : 'border-lavender-light bg-transparent text-ink'
                }`}
                onClick={() => setSource('youtube')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                YouTube
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  source === 'spotify'
                    ? 'border-lavender bg-lavender text-ink'
                    : 'border-lavender-light bg-transparent text-ink'
                }`}
                onClick={() => setSource('spotify')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M8 11.5c2.5-1 5.5-1 8 0M7 15c3-1.5 7-1.5 10 0M9 8.5c2-0.5 5-0.5 7 0" />
                </svg>
                Spotify
              </button>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="text-xs text-muted mb-1">
                {formatSeconds(currentTime)} / {duration > 0 ? formatSeconds(duration) : '--:--'}
              </div>
              <div className="w-full h-1 bg-lavender-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-lavender rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Lyrics display */}
            <div className="bg-lavender-soft rounded-xl p-6 flex-1 flex flex-col justify-center min-h-40">
              {!hasTimings && (
                <p className="text-center text-sm text-muted">
                  No timings set yet.{' '}
                  <button
                    className="underline text-lavender-dark"
                    onClick={() => navigate({ name: 'timing', songId: song.id })}
                  >
                    Set timings
                  </button>
                </p>
              )}
              {hasTimings && currentLine === null && (
                <p className="text-center text-xs text-muted">
                  <button
                    className="underline"
                    onClick={() => navigate({ name: 'timing', songId: song.id })}
                  >
                    Edit timings
                  </button>
                </p>
              )}
              {hasTimings && (
                <>
                  {prevLine && (
                    <p className="text-sm text-muted mb-3">{prevLine}</p>
                  )}
                  {currentLine !== null ? (
                    <p className="text-xl font-semibold leading-relaxed text-ink mb-4">
                      {currentLine}
                    </p>
                  ) : (
                    <p className="text-xl font-semibold text-muted mb-4 italic">
                      {ready ? '…' : 'Loading…'}
                    </p>
                  )}
                  {nextLines.length > 0 && (
                    <div className="text-sm text-muted leading-relaxed">
                      {nextLines.map((l, i) => (
                        <p key={i}>{l}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm ${
              isFavorite ? 'bg-lavender text-ink' : 'bg-lavender-light text-ink'
            }`}
            onClick={handleToggleFavorite}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Favorite
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 bg-lavender-light text-ink py-3 rounded-lg font-semibold text-sm"
            onClick={() => navigate({ name: 'details', songId: song.id })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Info
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 bg-lavender-light text-ink py-3 rounded-lg font-semibold text-sm"
            onClick={() => navigate({ name: 'edit', songId: song.id })}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
