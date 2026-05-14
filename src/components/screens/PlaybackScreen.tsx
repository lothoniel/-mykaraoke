import { useEffect, useId, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import { useYouTube } from '../../hooks/useYouTube'
import { getLyricSettings } from '../../lib/settings'
import { getArtistTopTracks, getPlaybackState, getStoredOAuthToken, getTrackMetadata, startPlayback } from '../../lib/spotify'
import { extractVideoId, formatSeconds } from '../../lib/youtube'
import type { Screen, Song, SpotifyTrackSummary } from '../../types'

type Props = {
  songId: string
  version?: 'original' | 'romaji' | 'translation'
  navigate: (s: Screen) => void
  goBack: () => void
}

function findCurrentLineIndex(timings: Song['timings'], currentTime: number): number {
  let idx = -1
  for (const t of timings) {
    if (t.timestamp <= currentTime) idx = t.lineIndex
    else break
  }
  return idx
}

export default function PlaybackScreen({ songId, version, navigate, goBack }: Props) {
  const uid = useId().replace(/:/g, '')
  const playerId = `yt-player-playback-${uid}`

  const [song, setSong] = useState<Song | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([])
  const [playerMode, setPlayerMode] = useState<'youtube' | 'spotify'>('youtube')
  const [spotifySyncError, setSpotifySyncError] = useState<'auth_error' | null>(null)
  const [localSyncRunning, setLocalSyncRunning] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [artistTopTracks, setArtistTopTracks] = useState<SpotifyTrackSummary[]>([])
  const [artistLibrarySongs, setArtistLibrarySongs] = useState<Song[]>([])
  const [lyricsTab, setLyricsTab] = useState<'original' | 'romaji' | 'translation'>(version ?? 'original')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const localSyncRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const localSyncStartRef = useRef<{ startedAt: number; timeAtStart: number } | null>(null)
  const suppressSpotifyPollRef = useRef(false)
  const currentLyricRef = useRef<HTMLDivElement | null>(null)
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    db.getSong(songId).then((s) => {
      if (s) {
        setSong(s)
        setIsFavorite(s.isFavorite)
        setPlayerMode(s.youtubeLink ? 'youtube' : 'spotify')
      }
    })
    db.getAllSongs().then((all) => {
      setRelatedSongs(all.filter((s) => s.id !== songId).slice(0, 3))
    })
    return () => { if (localSyncRef.current) clearInterval(localSyncRef.current) }
  }, [songId])

  useEffect(() => {
    if (!song) return
    db.getAllSongs().then((all) => {
      setArtistLibrarySongs(
        all.filter((s) => s.id !== songId && s.artist === song.artist).slice(0, 5)
      )
    })
    if (song.spotifyTrackId) {
      getTrackMetadata(song.spotifyTrackId)
        .then((meta) => getArtistTopTracks(meta.artistId))
        .then(setArtistTopTracks)
        .catch(() => {})
    }
  }, [song, songId])

  const youtubeVideoId = song ? extractVideoId(song.youtubeLink ?? '') ?? null : null
  const { playerState, playerError, getCurrentTime, pause: pauseYouTube } = useYouTube(playerId, youtubeVideoId)

  useEffect(() => {
    if (playerMode !== 'youtube') return
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
  }, [playerState, getCurrentTime, playerMode])

  useEffect(() => {
    if (playerMode !== 'spotify') return
    setSpotifySyncError(null)
    intervalRef.current = setInterval(async () => {
      const state = await getPlaybackState()
      if (state === 'auth_error') {
        setSpotifySyncError('auth_error')
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }
      if (state?.is_playing && !suppressSpotifyPollRef.current) setCurrentTime(state.progress_ms / 1000)
    }, 500)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playerMode])

  const currentSecond = Math.floor(currentTime)

  useEffect(() => {
    if (currentLyricRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current
      const el = currentLyricRef.current
      const elTop = el.offsetTop - container.offsetTop
      const scrollTarget = elTop - container.clientHeight / 2 + el.clientHeight / 2
      container.scrollTo({ top: scrollTarget, behavior: 'smooth' })
    }
  }, [currentSecond])

  function startLocalSync() {
    suppressSpotifyPollRef.current = true
    localSyncStartRef.current = { startedAt: Date.now(), timeAtStart: currentTime }
    if (localSyncRef.current) clearInterval(localSyncRef.current)
    localSyncRef.current = setInterval(() => {
      const ref = localSyncStartRef.current
      if (ref) setCurrentTime(ref.timeAtStart + (Date.now() - ref.startedAt) / 1000)
    }, 100)
    setLocalSyncRunning(true)
  }

  function pauseLocalSync() {
    if (localSyncRef.current) clearInterval(localSyncRef.current)
    localSyncRef.current = null
    localSyncStartRef.current = null
    suppressSpotifyPollRef.current = false
    setLocalSyncRunning(false)
  }

  function resetLocalSync() {
    pauseLocalSync()
    setCurrentTime(0)
  }

  async function handlePlayAndSync() {
    if (!song?.spotifyTrackId || isSyncing) return
    setIsSyncing(true)
    setPlaybackError(null)
    const result = await startPlayback(song.spotifyTrackId)
    setIsSyncing(false)
    if (result === 'ok') {
      startLocalSync()
    } else if (result === 'no_device') {
      setPlaybackError('No active Spotify device found. Open Spotify on any device first.')
    } else {
      setPlaybackError('Permission missing. Reconnect Spotify in Settings.')
    }
  }

  function handleSwitchMode(mode: 'youtube' | 'spotify') {
    if (mode === 'spotify') pauseYouTube()
    if (mode === 'youtube') pauseLocalSync()
    setPlayerMode(mode)
    setCurrentTime(0)
  }

  async function handleToggleFavorite() {
    if (!song) return
    await db.toggleFavorite(song.id)
    setIsFavorite((f) => !f)
  }

  if (!song) return null

  const lyricSettings = getLyricSettings()
  const showOrigTab = lyricSettings.origLang && song.lyrics.length > 0
  const showRomajiTab = lyricSettings.romaji && (song.lyricsRomaji?.length ?? 0) > 0
  const showTranslationTab = lyricSettings.translations && (song.lyricsTranslation?.length ?? 0) > 0
  const visibleTabs = [
    showOrigTab && 'original',
    showRomajiTab && 'romaji',
    showTranslationTab && 'translation',
  ].filter(Boolean) as ('original' | 'romaji' | 'translation')[]

  const activeLyrics =
    lyricsTab === 'romaji' && showRomajiTab ? (song.lyricsRomaji ?? song.lyrics)
    : lyricsTab === 'translation' && showTranslationTab ? (song.lyricsTranslation ?? song.lyrics)
    : song.lyrics

  const activeTimings =
    lyricsTab === 'romaji' && showRomajiTab ? (song.timingsRomaji ?? [])
    : lyricsTab === 'translation' && showTranslationTab ? (song.timingsTranslation ?? [])
    : song.timings

  const sortedTimings = [...activeTimings].sort((a, b) => a.timestamp - b.timestamp)
  const currentLineIdx = findCurrentLineIndex(sortedTimings, currentTime)
  const hasTimings = activeTimings.length > 0
  const timingMap = new Map(sortedTimings.map((t) => [t.lineIndex, t.timestamp]))

  const hasYoutube = !!song.youtubeLink
  const hasSpotify = !!song.spotifyTrackId
  const showToggle = hasYoutube && hasSpotify
  const hasOAuthToken = !!getStoredOAuthToken()
  const hasControlScope = getStoredOAuthToken()?.scope?.includes('user-modify-playback-state') ?? false

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-12">
      {/* Back button */}
      <button
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink mb-4 transition-colors"
        onClick={goBack}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back
      </button>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-8">
        {/* Left: song info + player */}
        <div>
          {/* Song header */}
          <div className="flex gap-4 mb-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-coral-light relative">
              {song.coverArt ? (
                <img src={song.coverArt} alt={song.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {song.genres && song.genres.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-1">
                  {song.genres.slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="bg-coral text-white text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                    >
                      {g}
                    </span>
                  ))}
                  {song.releaseDate && (
                    <span className="bg-coral-soft text-muted text-xs font-semibold px-2 py-0.5 rounded-full">
                      {song.releaseDate.slice(0, 4)}
                    </span>
                  )}
                </div>
              )}
              <h1 className="text-2xl font-bold text-ink leading-tight truncate">{song.title}</h1>
              <p className="text-sm text-muted">{song.artist}</p>
              <button
                className={`mt-2 flex items-center gap-1 text-xs font-semibold transition-colors ${
                  isFavorite ? 'text-coral' : 'text-muted hover:text-coral'
                }`}
                onClick={handleToggleFavorite}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {isFavorite ? 'Favorited' : 'Add to favorites'}
              </button>
            </div>
          </div>

          {/* Player source toggle */}
          {showToggle && (
            <div className="flex gap-1 mb-3 bg-coral-soft rounded-xl p-1 w-fit">
              <button
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  playerMode === 'youtube'
                    ? 'bg-coral text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
                onClick={() => handleSwitchMode('youtube')}
              >
                YouTube
              </button>
              <button
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  playerMode === 'spotify'
                    ? 'bg-coral text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
                onClick={() => handleSwitchMode('spotify')}
              >
                Spotify
              </button>
            </div>
          )}

          {/* YouTube container is always mounted — the YT IFrame API replaces the inner div
              with an iframe, so we must never let React unmount it. CSS hide instead. */}
          <div style={{ display: playerMode === 'youtube' ? undefined : 'none' }}>
            {youtubeVideoId ? (
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden yt-player">
                <div id={playerId} className="w-full h-full" />
                {playerError !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/90 rounded-2xl gap-3 px-6 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8694A" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-white text-sm font-semibold">
                      {playerError === 100 ? 'Video not found.' : 'This video cannot be embedded.'}
                    </p>
                    <p className="text-muted text-xs">
                      {playerError === 100
                        ? 'The video may have been deleted or made private.'
                        : 'The video owner has disabled embedding. Try a different YouTube link.'}
                    </p>
                    <button
                      className="mt-1 text-xs text-coral underline"
                      onClick={() => navigate({ name: 'edit', songId: song.id })}
                    >
                      Change YouTube link
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full aspect-video bg-coral-soft rounded-2xl flex items-center justify-center text-muted">
                No YouTube link
              </div>
            )}
          </div>

          {playerMode === 'spotify' && (
            hasSpotify ? (
              hasOAuthToken ? (
                <>
                  <div className="w-full rounded-2xl overflow-hidden">
                    <iframe
                      src={`https://open.spotify.com/embed/track/${song.spotifyTrackId}?utm_source=generator`}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="w-full border-0"
                      style={{ height: '152px' }}
                    />
                  </div>
                  {spotifySyncError === 'auth_error' ? (
                    <p className="mt-2 text-xs text-muted">
                      Lyrics sync needs updated permissions.{' '}
                      <button className="text-coral underline" onClick={() => navigate({ name: 'settings' })}>
                        Reconnect Spotify in Settings
                      </button>
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {hasControlScope ? (
                        <div className="flex items-center gap-2">
                          {!localSyncRunning ? (
                            <button
                              className="flex items-center gap-1.5 px-4 py-2 bg-coral text-white rounded-lg text-xs font-semibold hover:bg-coral-dark transition-colors disabled:opacity-60"
                              onClick={handlePlayAndSync}
                              disabled={isSyncing}
                            >
                              {isSyncing ? 'Starting…' : (
                                <>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                  Play &amp; Sync
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-coral text-white transition-colors"
                              onClick={pauseLocalSync}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                              </svg>
                              Pause lyrics
                            </button>
                          )}
                          {currentTime > 0 && (
                            <button className="text-xs text-muted hover:text-ink transition-colors" onClick={resetLocalSync}>
                              Reset
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-muted">
                            <button className="text-coral underline" onClick={() => navigate({ name: 'settings' })}>
                              Reconnect Spotify
                            </button>
                            {' '}to enable one-tap Play &amp; Sync.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                localSyncRunning
                                  ? 'bg-coral text-white'
                                  : 'border border-border text-ink hover:bg-coral-soft'
                              }`}
                              onClick={localSyncRunning ? pauseLocalSync : startLocalSync}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                {localSyncRunning
                                  ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                                  : <polygon points="5 3 19 12 5 21 5 3" />}
                              </svg>
                              {localSyncRunning ? 'Pause lyrics' : 'Start lyrics'}
                            </button>
                            {currentTime > 0 && (
                              <button className="text-xs text-muted hover:text-ink transition-colors" onClick={resetLocalSync}>
                                Reset
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      {playbackError && (
                        <p className="text-xs text-red-500">{playbackError}</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full aspect-video bg-coral-soft rounded-2xl flex flex-col items-center justify-center gap-3 text-center px-6">
                  <p className="text-sm font-semibold text-ink">Connect Spotify to use this player</p>
                  <button
                    className="text-xs text-coral underline"
                    onClick={() => navigate({ name: 'settings' })}
                  >
                    Go to Settings
                  </button>
                </div>
              )
            ) : (
              <div className="w-full aspect-video bg-coral-soft rounded-2xl flex items-center justify-center text-muted">
                No Spotify link
              </div>
            )
          )}

          <div className="mt-3 text-xs text-muted flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {formatSeconds(currentTime)} elapsed
          </div>
        </div>

        {/* Right: Live Lyrics panel */}
        <div className="border border-border rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '520px' }}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-coral">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="font-semibold text-sm text-ink">Live Lyrics</span>
            {hasTimings && (
              <span className="bg-coral text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                Synced
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {visibleTabs.length > 1 && (
              <div className="flex gap-0.5 bg-coral-soft rounded-xl p-0.5">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      lyricsTab === tab ? 'bg-coral text-white' : 'text-muted hover:text-ink'
                    }`}
                    onClick={() => setLyricsTab(tab)}
                  >
                    {tab === 'original' ? 'Orig' : tab === 'romaji' ? 'Romaji' : 'Trans'}
                  </button>
                ))}
              </div>
            )}
            <button
              className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-coral-soft transition-colors"
              onClick={() => navigate({ name: 'edit', songId: song.id })}
              aria-label="Edit song"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-4 py-3 border-b border-border flex-shrink-0">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 border border-border text-ink text-xs font-semibold py-2 rounded-lg hover:bg-coral-soft transition-colors"
            onClick={() => navigate({ name: 'timing', songId: song.id, version: lyricsTab })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Edit Timings
          </button>
        </div>

        {/* Lyrics list */}
        <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto px-4 py-2">
          {!hasTimings ? (
            <div className="text-center py-8 text-muted text-sm">
              <p className="mb-2">No timings set yet.</p>
              <button
                className="text-coral underline text-xs"
                onClick={() => navigate({ name: 'timing', songId: song.id, version: lyricsTab })}
              >
                Set timings to sync lyrics
              </button>
            </div>
          ) : activeLyrics.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">No lyrics</div>
          ) : (
            activeLyrics.map((line, i) => {
              const ts = timingMap.get(i)
              const isCurrent = i === currentLineIdx
              const isPast = currentLineIdx >= 0 && i < currentLineIdx

              return (
                <div
                  key={i}
                  ref={isCurrent ? currentLyricRef : null}
                  className={`flex gap-3 items-start py-2.5 px-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-coral-light' : ''
                  }`}
                >
                  <span
                    className={`font-mono text-xs w-10 flex-shrink-0 pt-0.5 ${
                      isCurrent ? 'text-coral font-semibold' : 'text-muted'
                    }`}
                  >
                    {ts !== undefined ? formatSeconds(ts) : ''}
                  </span>
                  <span
                    className={`leading-snug flex-1 ${
                      isCurrent
                        ? 'font-bold text-ink text-base'
                        : isPast
                        ? 'text-muted text-sm'
                        : 'text-ink text-sm'
                    }`}
                  >
                    {line}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
      </div>

      {/* More from Artist */}
      {(artistTopTracks.length > 0 || artistLibrarySongs.length > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-4">More from {song.artist}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {artistTopTracks.length > 0
              ? artistTopTracks.map((t) => (
                  <div
                    key={t.id}
                    className="flex gap-3 items-center cursor-pointer border border-border rounded-2xl p-3 hover:shadow-sm transition-shadow"
                    onClick={() => navigate({ name: 'add' })}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-coral-light">
                      {t.coverArt
                        ? <img src={t.coverArt} alt={t.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-ink">{t.title}</div>
                      <div className="text-xs text-muted truncate">{t.artist}</div>
                    </div>
                  </div>
                ))
              : artistLibrarySongs.map((s) => (
                  <div
                    key={s.id}
                    className="flex gap-3 items-center cursor-pointer border border-border rounded-2xl p-3 hover:shadow-sm transition-shadow"
                    onClick={() => navigate({ name: 'playback', songId: s.id })}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-coral-light">
                      {s.coverArt
                        ? <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-ink">{s.title}</div>
                      <div className="text-xs text-muted truncate">{s.artist}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </section>
      )}

      {/* Related songs */}
      {relatedSongs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-ink">Continue the Bloom</h2>
            <button
              className="text-sm text-coral font-medium"
              onClick={() => navigate({ name: 'library' })}
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedSongs.map((s) => (
              <div
                key={s.id}
                className="flex gap-3 items-center cursor-pointer group border border-border rounded-2xl p-3 hover:shadow-sm transition-shadow"
                onClick={() => navigate({ name: 'playback', songId: s.id })}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-coral-light">
                  {s.coverArt ? (
                    <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">🎵</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {s.genres?.[0] && (
                    <span className="text-xs text-coral-dark font-semibold capitalize">
                      {s.genres[0]}
                    </span>
                  )}
                  <div className="text-sm font-semibold truncate text-ink">{s.title}</div>
                  <div className="text-xs text-muted truncate">{s.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
