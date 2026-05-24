import { useEffect, useId, useMemo, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import { useSpotifyEmbed } from '../../hooks/useSpotifyEmbed'
import { useYouTube } from '../../hooks/useYouTube'
import { getLyricSettings } from '../../lib/settings'
import { findCurrentLineIndex } from '../../lib/lyrics'
import { extractVideoId, formatSeconds } from '../../lib/youtube'
import type { Screen, Song } from '../../types'

type Props = {
  songId: string
  version?: 'original' | 'romanized' | 'translation'
  navigate: (s: Screen) => void
  goBack: () => void
}
type LyricsTab = 'original' | 'romanized' | 'translation'

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function BackIcon({ size = 19, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function XIcon({ size = 19, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function HeartIcon({ size = 14, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill={filled ? 'currentColor' : 'none'} stroke="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function EditIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke="currentColor">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function YouTubeIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <polygon points="10 9 16 12 10 15 10 9" fill={color} stroke="none" />
    </svg>
  )
}

function SpotifyIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 11.5c2.5-1 5.5-1 8 0M7 15c3-1.5 7-1.5 10 0M9 8.5c2-0.5 5-0.5 7 0" />
    </svg>
  )
}

function ProgressBar({
  current,
  duration,
  onSeek,
}: {
  current: number
  duration: number
  onSeek?: (s: number) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const seekable = !!onSeek && duration > 0
  const pct = duration > 0 ? Math.max(0, Math.min(1, current / duration)) * 100 : 0

  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (!seekable || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, x / rect.width))
    onSeek?.(ratio * duration)
  }

  return (
    <div>
      <div
        ref={ref}
        role="slider"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(duration))}
        aria-valuenow={Math.round(current)}
        onPointerDown={(e) => {
          if (!seekable) return
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
          handlePointer(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e)
        }}
        className="relative"
        style={{
          height: 4,
          borderRadius: 4,
          background: '#EBE4FF',
          cursor: seekable ? 'pointer' : 'default',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            borderRadius: 4,
            background: 'var(--accent)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 0 3px #fff, 0 0 0 5px rgba(200, 241, 53, 0.33)',
            pointerEvents: 'none',
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-text-2">{formatSeconds(current)}</span>
        <span className="text-[11px] text-text-2">
          {duration > 0 ? formatSeconds(duration) : '–:––'}
        </span>
      </div>
    </div>
  )
}

export default function PlaybackScreen({ songId, version, navigate, goBack }: Props) {
  const uid = useId().replace(/:/g, '')
  const playerId = `yt-player-playback-${uid}`
  const spotifyEmbedId = `spotify-embed-${uid}`

  const [song, setSong] = useState<Song | null>(null)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [playerMode, setPlayerMode] = useState<'youtube' | 'spotify'>('youtube')
  const [lyricsTab, setLyricsTab] = useState<LyricsTab>(() => version ?? getLyricSettings().primary)
  const [relatedTab, setRelatedTab] = useState<'artist' | 'foryou'>('artist')

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const markedPlayedRef = useRef(false)

  useEffect(() => {
    markedPlayedRef.current = false
    db.getSong(songId).then((s) => {
      if (s) {
        setSong(s)
        setIsFavorite(s.isFavorite)
        setPlayerMode(s.youtubeLink ? 'youtube' : 'spotify')
        if (!version) {
          const has: Record<LyricsTab, boolean> = {
            original: s.lyrics.length > 0,
            romanized: (s.lyricsRomanized?.length ?? 0) > 0,
            translation: (s.lyricsTranslation?.length ?? 0) > 0,
          }
          const preferred = getLyricSettings().primary
          const fallbackOrder: LyricsTab[] = ['original', 'romanized', 'translation']
          const next = has[preferred] ? preferred : (fallbackOrder.find((t) => has[t]) ?? 'original')
          setLyricsTab(next)
        }
      }
    })
    db.getAllSongs().then(setAllSongs)
  }, [songId, version])

  const youtubeVideoId = song ? extractVideoId(song.youtubeLink ?? '') ?? null : null
  const { playerState, playerError, getCurrentTime, getDuration, seekTo, pause: pauseYouTube } =
    useYouTube(playerId, youtubeVideoId)

  const spotifyTrackId = playerMode === 'spotify' ? (song?.spotifyTrackId ?? null) : null
  const spotifyEmbed = useSpotifyEmbed(spotifyEmbedId, spotifyTrackId)

  useEffect(() => {
    if (playerMode !== 'youtube') return
    if (playerState === 'playing') {
      if (!markedPlayedRef.current) {
        markedPlayedRef.current = true
        db.markPlayed(songId).catch(() => {})
      }
      intervalRef.current = setInterval(() => {
        setCurrentTime(getCurrentTime())
      }, 150)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playerState, getCurrentTime, playerMode, songId])

  useEffect(() => {
    if (playerMode !== 'spotify') return
    if (!spotifyEmbed.isPaused && !markedPlayedRef.current) {
      markedPlayedRef.current = true
      db.markPlayed(songId).catch(() => {})
    }
  }, [spotifyEmbed.isPaused, playerMode, songId])

  const displayTime = playerMode === 'youtube' ? currentTime : spotifyEmbed.position

  function handleSwitchMode(mode: 'youtube' | 'spotify') {
    if (mode === 'spotify') pauseYouTube()
    if (mode === 'youtube') spotifyEmbed.pause()
    setPlayerMode(mode)
    setCurrentTime(0)
  }

  async function handleToggleFavorite() {
    if (!song) return
    await db.toggleFavorite(song.id)
    setIsFavorite((f) => !f)
  }

  const lyricSettings = useMemo(() => getLyricSettings(), [])
  const showOrigTab = !!song && song.lyrics.length > 0
  const showRomanizedTab = !!song && (song.lyricsRomanized?.length ?? 0) > 0
  const showTranslationTab = !!song && (song.lyricsTranslation?.length ?? 0) > 0
  const visibleTabs = useMemo(
    () =>
      [
        showOrigTab && 'original',
        showRomanizedTab && 'romanized',
        showTranslationTab && 'translation',
      ].filter(Boolean) as LyricsTab[],
    [showOrigTab, showRomanizedTab, showTranslationTab],
  )

  const activeLyrics: string[] =
    song == null
      ? []
      : lyricsTab === 'romanized' && showRomanizedTab
        ? (song.lyricsRomanized ?? song.lyrics)
        : lyricsTab === 'translation' && showTranslationTab
          ? (song.lyricsTranslation ?? song.lyrics)
          : song.lyrics

  const activeTimings = !song
    ? []
    : lyricsTab === 'romanized' && showRomanizedTab
      ? (song.timingsRomanized ?? [])
      : lyricsTab === 'translation' && showTranslationTab
        ? (song.timingsTranslation ?? [])
        : (song.timings ?? [])

  const sortedTimings = [...activeTimings].sort((a, b) => a.timestamp - b.timestamp)
  const currentLineIdx = findCurrentLineIndex(sortedTimings, displayTime)
  const hasTimings = activeTimings.length > 0

  function lyricsForVersion(v: LyricsTab): string[] | undefined {
    if (!song) return undefined
    if (v === 'original') return song.lyrics
    if (v === 'romanized') return song.lyricsRomanized
    return song.lyricsTranslation
  }
  const secondaryForCurrent =
    lyricSettings.paired && song && currentLineIdx >= 0 && lyricSettings.secondary !== lyricsTab
      ? (lyricsForVersion(lyricSettings.secondary)?.[currentLineIdx] ?? null)
      : null

  if (!song) {
    return (
      <div className="flex flex-col h-full bg-bg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 flex-none border-b border-border">
          <button
            onClick={goBack}
            aria-label="Back"
            className="text-text-2 hover:text-text"
            style={{ padding: 2 }}
          >
            <BackIcon size={19} color="currentColor" />
          </button>
          <div className="text-[17px] font-extrabold text-text" style={{ letterSpacing: '-0.3px' }}>
            Now Playing
          </div>
          <span style={{ width: 19 }} />
        </div>
        <div className="flex-1 flex items-center justify-center text-text-2 text-[13px]">
          Loading…
        </div>
      </div>
    )
  }

  const show = song.genres?.[0]
  const hasYoutube = !!song.youtubeLink
  const hasSpotify = !!song.spotifyTrackId
  const showToggle = hasYoutube && hasSpotify

  // Duration: YouTube via player, Spotify via embed (with cached metadata as fallback).
  const ytDuration = playerMode === 'youtube' ? getDuration() : 0
  const spotifyDuration = spotifyEmbed.duration > 0
    ? spotifyEmbed.duration
    : song.duration ? song.duration / 1000 : 0
  const totalDuration = playerMode === 'youtube' ? ytDuration : spotifyDuration

  // Visible window: current line + 2 before, 3 after (centered).
  const WINDOW_BEFORE = 2
  const WINDOW_AFTER = 3
  const baseIdx = currentLineIdx >= 0 ? currentLineIdx : 0
  const fromIdx = Math.max(0, baseIdx - WINDOW_BEFORE)
  const toIdx = Math.min(activeLyrics.length - 1, baseIdx + WINDOW_AFTER)
  const lyricsWindow: { line: string; idx: number; state: 'past' | 'current' | 'next' | 'upcoming' }[] = []
  for (let i = fromIdx; i <= toIdx; i++) {
    let state: 'past' | 'current' | 'next' | 'upcoming' = 'upcoming'
    if (currentLineIdx < 0) state = i === 0 ? 'next' : 'upcoming'
    else if (i < currentLineIdx) state = 'past'
    else if (i === currentLineIdx) state = 'current'
    else if (i === currentLineIdx + 1) state = 'next'
    else state = 'upcoming'
    lyricsWindow.push({ line: activeLyrics[i], idx: i, state })
  }

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 flex-none border-b border-border">
        <button
          onClick={goBack}
          aria-label="Back"
          className="text-text-2 hover:text-text"
          style={{ padding: 2 }}
        >
          <BackIcon size={19} color="currentColor" />
        </button>
        <div className="text-[17px] font-extrabold text-text" style={{ letterSpacing: '-0.3px' }}>
          Now Playing
        </div>
        <button
          onClick={goBack}
          aria-label="Close"
          className="text-text-2 hover:text-text"
          style={{ padding: 2 }}
        >
          <XIcon size={19} color="currentColor" />
        </button>
      </div>

      {/* 2-col grid */}
      <div className="flex-1 grid overflow-hidden min-h-0" style={{ gridTemplateColumns: '56% 1fr' }}>
        {/* Left column */}
        <div
          className="flex flex-col gap-3 overflow-hidden"
          style={{ padding: '18px 16px 18px 24px', borderRight: '1px solid rgba(100, 60, 180, 0.09)' }}
        >
          {/* Title block */}
          <div className="flex-none">
            <div className="text-[20px] font-extrabold text-text leading-tight" style={{ letterSpacing: '-0.3px' }}>
              {song.title}
            </div>
            <div className="text-[13px] text-text-2 mt-0.5 truncate">
              {song.artist}
              {show ? ` · ${show}` : ''}
            </div>
          </div>

          {/* Source toggle */}
          {showToggle && (
            <div
              className="flex flex-none"
              style={{ background: '#EBE4FF', borderRadius: 10, padding: 4, gap: 4 }}
            >
              <button
                onClick={() => handleSwitchMode('youtube')}
                className="flex-1 flex items-center justify-center gap-1.5 text-[13px]"
                style={{
                  padding: 7,
                  borderRadius: 8,
                  background: playerMode === 'youtube' ? '#fff' : 'transparent',
                  color: playerMode === 'youtube' ? '#1C0840' : '#7060A0',
                  fontWeight: 600,
                  boxShadow: playerMode === 'youtube' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <YouTubeIcon size={14} color={playerMode === 'youtube' ? '#1C0840' : '#7060A0'} />
                YouTube
              </button>
              <button
                onClick={() => handleSwitchMode('spotify')}
                className="flex-1 flex items-center justify-center gap-1.5 text-[13px]"
                style={{
                  padding: 7,
                  borderRadius: 8,
                  background: playerMode === 'spotify' ? '#fff' : 'transparent',
                  color: playerMode === 'spotify' ? '#1C0840' : '#7060A0',
                  fontWeight: 600,
                  boxShadow: playerMode === 'spotify' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <SpotifyIcon size={14} color={playerMode === 'spotify' ? '#16A34A' : '#7060A0'} />
                Spotify
              </button>
            </div>
          )}

          {/* Video / embed area — YouTube container stays mounted, hidden in Spotify mode */}
          <div
            className="flex-none relative w-full"
            style={
              playerMode === 'youtube'
                ? {
                    aspectRatio: '16 / 9',
                    maxHeight: 280,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#06061A',
                  }
                : {
                    height: 152,
                    borderRadius: 12,
                    overflow: 'hidden',
                  }
            }
          >
            <div
              className="absolute inset-0 yt-player"
              style={{ display: playerMode === 'youtube' ? undefined : 'none' }}
            >
              {youtubeVideoId ? (
                <>
                  <div id={playerId} className="w-full h-full" />
                  {playerError !== null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-2 px-5 text-center">
                      <p className="text-white text-[13px] font-semibold">
                        {playerError === 100 ? 'Video not found.' : 'This video cannot be embedded.'}
                      </p>
                      <button
                        className="text-[12px] underline"
                        style={{ color: 'var(--accent)' }}
                        onClick={() => navigate({ name: 'edit', songId: song.id })}
                      >
                        Change YouTube link
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  No YouTube link
                </div>
              )}
            </div>
            {playerMode === 'spotify' && (
              <div className="absolute inset-0">
                {hasSpotify ? (
                  <div id={spotifyEmbedId} className="w-full h-full" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-[12px]"
                    style={{ color: '#7060A0', background: '#EBE4FF' }}
                  >
                    No Spotify link
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress bar — seekable in both modes */}
          <div className="flex-none">
            <ProgressBar
              current={displayTime}
              duration={totalDuration}
              onSeek={
                playerMode === 'youtube'
                  ? (s) => { seekTo(s); setCurrentTime(s) }
                  : (s) => { spotifyEmbed.seek(s) }
              }
            />
          </div>

          {/* Related songs (tabbed) */}
          {(() => {
            const sameArtist = allSongs
              .filter((s) => s.id !== song.id && s.artist === song.artist)
              .slice(0, 8)
            const forYou = allSongs
              .filter((s) => s.id !== song.id && s.artist !== song.artist)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 8)
            const activeList = relatedTab === 'artist' ? sameArtist : forYou
            const hasAny = sameArtist.length > 0 || forYou.length > 0
            if (!hasAny) return null

            return (
              <div className="flex-none flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRelatedTab('artist')}
                    disabled={sameArtist.length === 0}
                    className="text-[12px] disabled:opacity-40"
                    style={{
                      padding: '4px 12px',
                      borderRadius: 16,
                      background: relatedTab === 'artist' ? 'var(--accent)' : '#EBE4FF',
                      color: relatedTab === 'artist' ? '#1C0840' : '#7060A0',
                      fontWeight: relatedTab === 'artist' ? 700 : 500,
                    }}
                  >
                    From {song.artist}
                  </button>
                  <button
                    onClick={() => setRelatedTab('foryou')}
                    disabled={forYou.length === 0}
                    className="text-[12px] disabled:opacity-40"
                    style={{
                      padding: '4px 12px',
                      borderRadius: 16,
                      background: relatedTab === 'foryou' ? 'var(--accent)' : '#EBE4FF',
                      color: relatedTab === 'foryou' ? '#1C0840' : '#7060A0',
                      fontWeight: relatedTab === 'foryou' ? 700 : 500,
                    }}
                  >
                    For you
                  </button>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                  {activeList.length === 0 ? (
                    <div className="text-[12px] text-text-2 py-3">
                      Nothing here yet — add more songs to your library.
                    </div>
                  ) : (
                    activeList.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate({ name: 'playback', songId: s.id })}
                        className="flex-none text-left"
                        style={{ width: 92 }}
                      >
                        <div
                          className="overflow-hidden mb-1"
                          style={{
                            width: 92,
                            height: 92,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #C8F135 0%, #7C3AED 100%)',
                          }}
                        >
                          {s.coverArt ? (
                            <img src={s.coverArt} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="text-[12px] font-semibold text-text truncate">{s.title}</div>
                        <div className="text-[11px] text-text-2 truncate">{s.artist}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })()}

          {/* Action buttons */}
          <div className="flex-none flex gap-2 mt-auto">
            <button
              onClick={handleToggleFavorite}
              className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold"
              style={{
                padding: '9px 6px',
                borderRadius: 10,
                background: '#FFFFFF',
                border: '1px solid rgba(100, 60, 180, 0.09)',
                color: isFavorite ? 'var(--accent-strong)' : '#7060A0',
              }}
            >
              <HeartIcon size={14} filled={isFavorite} />
              {isFavorite ? 'Favorited' : 'Favorite'}
            </button>
            <button
              onClick={() => navigate({ name: 'edit', songId: song.id })}
              className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-text-2"
              style={{
                padding: '9px 6px',
                borderRadius: 10,
                background: '#FFFFFF',
                border: '1px solid rgba(100, 60, 180, 0.09)',
              }}
            >
              <EditIcon size={14} />
              Edit
            </button>
          </div>
        </div>

        {/* Right column — Lyrics panel */}
        <div className="flex flex-col overflow-hidden" style={{ padding: '18px 20px' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-none">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold uppercase text-text-2"
                style={{ letterSpacing: 2 }}
              >
                Lyrics
              </span>
              {visibleTabs.length > 1 && (
                <div className="flex gap-0.5" style={{ background: '#EBE4FF', borderRadius: 9, padding: 2 }}>
                  {visibleTabs.map((tab) => {
                    const active = lyricsTab === tab
                    return (
                      <button
                        key={tab}
                        onClick={() => setLyricsTab(tab)}
                        className="text-[11px]"
                        style={{
                          padding: '3px 9px',
                          borderRadius: 7,
                          background: active ? 'var(--accent)' : 'transparent',
                          color: active ? '#1C0840' : '#7060A0',
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        {tab === 'original' ? 'Orig' : tab === 'romanized' ? 'Roman' : 'Trans'}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => navigate({ name: 'timing', songId: song.id, version: lyricsTab })}
              className="text-[12px] font-semibold underline"
              style={{ color: 'var(--accent-strong)', textUnderlineOffset: 3 }}
            >
              Edit timings
            </button>
          </div>

          {/* Centered line display */}
          <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
            {activeLyrics.length === 0 ? (
              <div className="text-center text-text-2 text-[13px]">
                <p className="mb-2">No lyrics yet.</p>
                <button
                  onClick={() => navigate({ name: 'edit', songId: song.id })}
                  className="underline"
                  style={{ color: 'var(--accent-strong)' }}
                >
                  Add lyrics
                </button>
              </div>
            ) : !hasTimings ? (
              <div className="text-center text-text-2 text-[13px]">
                <p className="mb-2">Lyrics aren't synced yet.</p>
                <button
                  onClick={() => navigate({ name: 'timing', songId: song.id, version: lyricsTab })}
                  className="underline"
                  style={{ color: 'var(--accent-strong)' }}
                >
                  Set timings
                </button>
              </div>
            ) : (
              lyricsWindow.map(({ line, idx, state }) => {
                const isCur = state === 'current'
                const isNext = state === 'next'
                const isPast = state === 'past'
                const activeSize = lyricSettings.fontSize
                const nextSize = Math.round(activeSize * 17 / 26)
                const restSize = Math.round(activeSize * 13 / 26)
                const nonActiveWeight = lyricSettings.bold ? 700 : (isNext ? 600 : 400)
                const transitionMs = lyricSettings.scrollSpeed * 10
                const lineTransition = transitionMs > 0
                  ? `font-size ${transitionMs}ms ease, color ${transitionMs}ms ease, font-weight ${transitionMs}ms ease, opacity ${transitionMs}ms ease, text-shadow ${transitionMs}ms ease`
                  : undefined
                return (
                  <div
                    key={idx}
                    className="text-center"
                    style={{
                      marginTop: isCur ? 6 : 0,
                      marginBottom: isCur ? 14 : 6,
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        fontWeight: isCur ? 800 : nonActiveWeight,
                        fontSize: isCur ? activeSize : isNext ? nextSize : restSize,
                        color: isCur ? lyricSettings.fontColor : isNext ? '#1C0840' : '#7060A0',
                        opacity: isPast ? 0.3 : state === 'upcoming' ? 0.2 : 1,
                        letterSpacing: isCur ? '-0.3px' : 0,
                        lineHeight: 1.3,
                        textShadow: isCur && lyricSettings.glow ? `0 0 20px ${lyricSettings.hlColor}` : undefined,
                        transition: lineTransition,
                      }}
                    >
                      {line}
                    </div>
                    {isCur && secondaryForCurrent && (
                      <div
                        style={{ fontSize: 14, fontWeight: 400, color: '#7060A0', marginTop: 5 }}
                      >
                        {secondaryForCurrent}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
