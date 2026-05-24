import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Screen, Song, Timing } from '../../../types'
import * as db from '../../../hooks/useDB'
import { useYouTube } from '../../../hooks/useYouTube'
import { useSpotifyEmbed } from '../../../hooks/useSpotifyEmbed'
import { findCurrentLineIndex } from '../../../lib/lyrics'
import { getLyricSettings, type LyricVersion } from '../../../lib/settings'
import { extractVideoId, formatSeconds } from '../../../lib/youtube'
import { getSongGradient } from '../../../lib/songColor'
import { BB, darken } from '../../../lib/bubble'
import { BubbleIconBtn } from '../atoms'
import { Sparkle, Heart } from '../atoms/stickers'
import {
  IconBack,
  IconPlay,
  IconPause,
  IconHeart,
  IconHeartFilled,
  IconShuffle,
  IconChevR,
  IconYouTube,
  IconSpotify,
  IconImage,
} from '../atoms/icons'

type Props = {
  songId: string
  navigate: (s: Screen) => void
  goBack: () => void
}

type Mode = 'youtube' | 'spotify'
type View = 'art' | 'youtube' | 'spotify'

function lyricsForVersion(s: Song, v: LyricVersion): string[] {
  if (v === 'romanized') return s.lyricsRomanized ?? []
  if (v === 'translation') return s.lyricsTranslation ?? []
  return s.lyrics
}

function timingsForVersion(s: Song, v: LyricVersion): Timing[] {
  if (v === 'romanized') return s.timingsRomanized ?? []
  if (v === 'translation') return s.timingsTranslation ?? []
  return s.timings
}

export default function MobileNowPlaying({ songId, navigate: _navigate, goBack }: Props) {
  void _navigate
  const uid = useId().replace(/:/g, '')
  const ytId = `mob-yt-${uid}`
  const spotifyId = `mob-sp-${uid}`

  const [song, setSong] = useState<Song | null>(null)
  const [view, setView] = useState<View>('art')
  const [lastMode, setLastMode] = useState<Mode>('youtube')
  const [tab, setTab] = useState<LyricVersion>(getLyricSettings().primary)
  const [currentTime, setCurrentTime] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const markedRef = useRef(false)
  const lyricSettings = useMemo(() => getLyricSettings(), [])

  useEffect(() => {
    markedRef.current = false
    db.getSong(songId).then((s) => {
      if (!s) return
      setSong(s)
      const hasYt = !!extractVideoId(s.youtubeLink ?? '')
      const hasSp = !!s.spotifyTrackId
      setLastMode(hasYt ? 'youtube' : hasSp ? 'spotify' : 'youtube')
      setView('art')
      const avail: LyricVersion[] = []
      if (s.lyrics.length > 0) avail.push('original')
      if ((s.lyricsRomanized?.length ?? 0) > 0) avail.push('romanized')
      if ((s.lyricsTranslation?.length ?? 0) > 0) avail.push('translation')
      const primary = getLyricSettings().primary
      setTab(avail.includes(primary) ? primary : avail[0] ?? 'original')
    })
  }, [songId])

  const ytVideoId = song ? extractVideoId(song.youtubeLink ?? '') : null
  const mode: Mode = view === 'art' ? lastMode : view
  const yt = useYouTube(ytId, mode === 'youtube' ? ytVideoId : null)
  const sp = useSpotifyEmbed(spotifyId, mode === 'spotify' ? (song?.spotifyTrackId ?? null) : null)

  // poll YouTube time
  useEffect(() => {
    if (mode !== 'youtube') return
    if (yt.playerState === 'playing') {
      if (!markedRef.current) {
        markedRef.current = true
        db.markPlayed(songId).catch(() => {})
      }
      intervalRef.current = setInterval(() => setCurrentTime(yt.getCurrentTime()), 150)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [yt.playerState, mode, songId, yt.getCurrentTime, yt])

  useEffect(() => {
    if (mode !== 'spotify') return
    if (!sp.isPaused && !markedRef.current) {
      markedRef.current = true
      db.markPlayed(songId).catch(() => {})
    }
  }, [sp.isPaused, mode, songId])

  const displayTime = mode === 'youtube' ? currentTime : sp.position
  const ytDuration = mode === 'youtube' ? yt.getDuration() : 0
  const spDuration = sp.duration
  const fallbackDuration = song?.duration ? song.duration / 1000 : 0
  const duration =
    mode === 'youtube'
      ? ytDuration || fallbackDuration
      : spDuration || fallbackDuration

  const lines = useMemo(() => (song ? lyricsForVersion(song, tab) : []), [song, tab])
  const timings = useMemo(() => (song ? timingsForVersion(song, tab) : []), [song, tab])
  const sortedTimings = useMemo(() => [...timings].sort((a, b) => a.timestamp - b.timestamp), [timings])
  const currentIdx = findCurrentLineIndex(sortedTimings, displayTime)

  const secondaryLine =
    lyricSettings.paired && song && currentIdx >= 0 && lyricSettings.secondary !== tab
      ? lyricsForVersion(song, lyricSettings.secondary)[currentIdx] ?? null
      : null

  const visible = useMemo(() => {
    if (lines.length === 0) return [] as { text: string; realIdx: number; isCurrent: boolean; isPast: boolean }[]
    const start = Math.max(0, currentIdx - 2)
    const end = Math.min(lines.length, start + 5)
    const out: { text: string; realIdx: number; isCurrent: boolean; isPast: boolean }[] = []
    for (let i = start; i < end; i++) {
      out.push({
        text: lines[i] ?? '',
        realIdx: i,
        isCurrent: i === currentIdx,
        isPast: i < currentIdx,
      })
    }
    return out
  }, [lines, currentIdx])

  function togglePlay() {
    if (mode === 'youtube') {
      if (yt.playerState === 'playing') yt.pause()
      else yt.play()
    } else {
      sp.togglePlay()
    }
  }

  function seek(seconds: number) {
    const clamped = Math.max(0, Math.min(seconds, duration || seconds))
    if (mode === 'youtube') yt.seekTo(clamped)
    else sp.seek(clamped)
    if (mode === 'youtube') setCurrentTime(clamped)
  }

  function cycleTab() {
    if (!song) return
    const avail: LyricVersion[] = []
    if (song.lyrics.length > 0) avail.push('original')
    if ((song.lyricsRomanized?.length ?? 0) > 0) avail.push('romanized')
    if ((song.lyricsTranslation?.length ?? 0) > 0) avail.push('translation')
    if (avail.length <= 1) return
    const i = avail.indexOf(tab)
    setTab(avail[(i + 1) % avail.length])
  }

  async function toggleFav() {
    if (!song) return
    await db.toggleFavorite(song.id)
    setSong({ ...song, isFavorite: !song.isFavorite })
  }

  if (!song) {
    return <div style={{ padding: 20, color: BB.ink2 }}>loading…</div>
  }

  const isPlaying = mode === 'youtube' ? yt.playerState === 'playing' : !sp.isPaused
  const [g1, g2, g3] = getSongGradient(song.id)
  const hasYt = !!ytVideoId
  const hasSp = !!song.spotifyTrackId
  const showVideo = view !== 'art'

  const viewOrder: View[] = ['art']
  if (hasYt) viewOrder.push('youtube')
  if (hasSp) viewOrder.push('spotify')
  const nextView = viewOrder.length > 1
    ? viewOrder[(viewOrder.indexOf(view) + 1) % viewOrder.length]
    : null
  const nextIcon =
    nextView === 'youtube' ? <IconYouTube size={20} /> :
    nextView === 'spotify' ? <IconSpotify size={20} /> :
    nextView === 'art' ? <IconImage size={20} /> : null
  const nextLabel =
    nextView === 'youtube' ? 'Show video' :
    nextView === 'spotify' ? 'Show Spotify embed' :
    nextView === 'art' ? 'Show artwork' : 'Switch view'

  return (
    <div style={{ position: 'relative', paddingBottom: 24 }}>
      <Sparkle
        size={18}
        color={BB.yellow}
        style={{ position: 'absolute', top: 6, left: 60, transform: 'rotate(-10deg)', opacity: 0.7, pointerEvents: 'none' }}
      />
      <Heart
        size={14}
        color={BB.primary}
        style={{ position: 'absolute', top: 30, right: 70, transform: 'rotate(-12deg)', opacity: 0.5, pointerEvents: 'none' }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 0 16px',
        }}
      >
        <BubbleIconBtn color={BB.surface} ink={BB.ink} size={40} onClick={goBack} ariaLabel="Back">
          <IconBack size={18} />
        </BubbleIconBtn>
        <div
          style={{
            fontFamily: 'var(--bb-font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: BB.ink,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkle size={12} color={BB.primary} /> now singing
        </div>
        <BubbleIconBtn
          color={song.isFavorite ? BB.primary : BB.surface}
          ink={song.isFavorite ? '#fff' : BB.ink}
          size={40}
          onClick={toggleFav}
          ariaLabel={song.isFavorite ? 'Unfavorite' : 'Favorite'}
        >
          {song.isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
        </BubbleIconBtn>
      </div>

      <div
        style={{
          position: 'relative',
          width: showVideo ? 'clamp(240px, 70%, 320px)' : 'clamp(180px, 45%, 240px)',
          aspectRatio: showVideo ? '16 / 9' : '1 / 1',
          margin: '0 auto',
          borderRadius: showVideo ? 18 : 28,
          background: showVideo
            ? '#000'
            : song.coverArt
              ? `url(${song.coverArt}) center/cover`
              : `linear-gradient(165deg, ${g1}, ${g2} 55%, ${g3})`,
          boxShadow: showVideo
            ? '0 8px 22px rgba(0,0,0,0.25)'
            : `0 10px 0 ${darken(g2, 0.2)}, 0 16px 38px ${g2}55`,
          overflow: 'hidden',
        }}
      >
        <div
          className="yt-frame"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: showVideo && mode === 'youtube' ? 1 : 0,
            pointerEvents: showVideo && mode === 'youtube' ? 'auto' : 'none',
          }}
        >
          <div id={ytId} style={{ width: '100%', height: '100%' }} />
        </div>
        <div
          className="sp-frame"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: showVideo && mode === 'spotify' ? 1 : 0,
            pointerEvents: showVideo && mode === 'spotify' ? 'auto' : 'none',
          }}
        >
          <div id={spotifyId} style={{ width: '100%', height: '100%' }} />
        </div>
        {!showVideo && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(60% 60% at 25% 18%, rgba(255,255,255,0.45), transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <div style={{ marginTop: 18, textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--bb-font-display)',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: -0.5,
            color: BB.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {song.title}
        </div>
        <div style={{ fontSize: 13, color: BB.ink2, fontWeight: 500, marginTop: 2 }}>
          {song.artist}
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          minHeight: 220,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 10,
          padding: '0 4px',
          textAlign: 'center',
        }}
      >
        {visible.length === 0 ? (
          <div style={{ color: BB.ink3, fontSize: 13 }}>
            {lines.length === 0 ? 'no lyrics yet' : 'lyrics start soon…'}
          </div>
        ) : (
          visible.map((v) => {
            const sizeCur = lyricSettings.fontSize
            const sizeOther = Math.max(13, sizeCur - 10)
            return (
              <div
                key={v.realIdx}
                style={{
                  opacity: v.isCurrent ? 1 : v.isPast ? 0.3 : 0.55,
                  transition: 'opacity 0.35s ease',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--bb-font-display)',
                    fontWeight: v.isCurrent ? 700 : 600,
                    fontSize: v.isCurrent ? sizeCur : sizeOther,
                    lineHeight: 1.25,
                    letterSpacing: -0.3,
                    color: v.isCurrent ? BB.primary : BB.ink,
                    transition: 'font-size 0.35s ease, color 0.3s ease, text-shadow 0.3s ease',
                    textShadow:
                      v.isCurrent && lyricSettings.glow
                        ? `0 0 20px ${lyricSettings.hlColor}`
                        : '0 0 0px transparent',
                    wordBreak: 'break-word',
                  }}
                >
                  {v.text}
                </div>
                {v.isCurrent && secondaryLine && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: BB.ink2,
                      marginTop: 4,
                    }}
                  >
                    {secondaryLine}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <ScrubBar current={displayTime} duration={duration} onSeek={seek} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 11.5,
            color: BB.ink2,
          }}
        >
          <span>{formatSeconds(Math.max(0, displayTime))}</span>
          <span>{formatSeconds(Math.max(0, duration))}</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 26,
        }}
      >
        {nextView ? (
          <BubbleIconBtn
            color={BB.surface}
            ink={BB.ink}
            size={48}
            onClick={() => {
              if (nextView !== 'art') setLastMode(nextView)
              setView(nextView)
            }}
            ariaLabel={nextLabel}
          >
            {nextIcon}
          </BubbleIconBtn>
        ) : (
          <BubbleIconBtn color={BB.surface} ink={BB.ink2} size={48} ariaLabel="Shuffle (coming soon)">
            <IconShuffle size={18} />
          </BubbleIconBtn>
        )}
        <BubbleIconBtn
          color={BB.primary}
          size={72}
          onClick={togglePlay}
          ariaLabel={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <IconPause size={26} /> : <IconPlay size={26} />}
        </BubbleIconBtn>
        <BubbleIconBtn
          color={BB.surface}
          ink={BB.ink}
          size={48}
          onClick={cycleTab}
          ariaLabel="Cycle lyric version"
        >
          <span
            style={{
              fontFamily: 'var(--bb-font-display)',
              fontWeight: 700,
              fontSize: 9.5,
              letterSpacing: 0.4,
            }}
          >
            {tab === 'original' ? 'ORG' : tab === 'romanized' ? 'ROM' : 'TR'}
          </span>
          <IconChevR size={12} />
        </BubbleIconBtn>
      </div>
    </div>
  )
}

function ScrubBar({
  current,
  duration,
  onSeek,
}: {
  current: number
  duration: number
  onSeek: (s: number) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const pct = duration > 0 ? Math.max(0, Math.min(1, current / duration)) : 0

  function pointerToSeconds(clientX: number): number {
    const el = ref.current
    if (!el || duration <= 0) return 0
    const rect = el.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    return Math.max(0, Math.min(1, ratio)) * duration
  }

  function onClick(e: React.PointerEvent<HTMLDivElement>) {
    onSeek(pointerToSeconds(e.clientX))
  }

  return (
    <div
      ref={ref}
      onPointerDown={onClick}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={current}
      aria-label="Playback position"
      style={{
        position: 'relative',
        height: 14,
        cursor: duration > 0 ? 'pointer' : 'default',
        padding: '3px 0',
      }}
    >
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: BB.bg2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${BB.primary}, ${BB.lilac})`,
            transition: 'width 0.15s linear',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `calc(${pct * 100}% - 7px)`,
          width: 14,
          height: 14,
          borderRadius: 999,
          background: '#fff',
          boxShadow: `0 2px 6px ${BB.primary}88`,
        }}
      />
    </div>
  )
}
