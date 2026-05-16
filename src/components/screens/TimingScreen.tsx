import { useEffect, useId, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import { useYouTube } from '../../hooks/useYouTube'
import { extractVideoId, formatSeconds } from '../../lib/youtube'
import type { Screen, Song, Timing } from '../../types'

type Props = {
  songId: string
  navigate: (s: Screen) => void
  version?: 'original' | 'romaji' | 'translation'
}

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function CheckIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function BackIcon({ size = 13, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function AlertIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export default function TimingScreen({ songId, navigate, version }: Props) {
  const activeVersion = version ?? 'original'
  const uid = useId().replace(/:/g, '')
  const playerId = `yt-player-timing-${uid}`

  const [song, setSong] = useState<Song | null>(null)
  const [timings, setTimings] = useState<Timing[]>([])
  const [confirmReset, setConfirmReset] = useState(false)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)
  const [editingLine, setEditingLine] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [currentTime, setCurrentTime] = useState(0)

  const currentRowRef = useRef<HTMLDivElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const videoId = song ? (extractVideoId(song.youtubeLink ?? '') ?? null) : null
  const { ready, playerState, playerError, getCurrentTime, seekTo, play } = useYouTube(playerId, videoId)

  useEffect(() => {
    db.getSong(songId).then((s) => {
      if (!s) return
      setSong(s)
      const t =
        activeVersion === 'romaji' ? (s.timingsRomaji ?? [])
        : activeVersion === 'translation' ? (s.timingsTranslation ?? [])
        : (s.timings ?? [])
      setTimings(t)
    })
  }, [songId, activeVersion])

  useEffect(() => {
    if (playerState === 'playing') {
      intervalRef.current = setInterval(() => {
        setCurrentTime(getCurrentTime())
      }, 150)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playerState, getCurrentTime])

  const activeLyrics = !song
    ? []
    : activeVersion === 'romaji'
      ? (song.lyricsRomaji ?? song.lyrics)
      : activeVersion === 'translation'
        ? (song.lyricsTranslation ?? song.lyrics)
        : song.lyrics

  const timedSet = new Set(timings.map((t) => t.lineIndex))
  const nextToMark = song ? activeLyrics.findIndex((_, i) => !timedSet.has(i)) : -1
  const allDone = nextToMark === -1 && song !== null && activeLyrics.length > 0

  const sortedTimings = [...timings].sort((a, b) => a.timestamp - b.timestamp)
  let activeLine = -1
  for (const t of sortedTimings) {
    if (t.timestamp <= currentTime) activeLine = t.lineIndex
    else break
  }

  useEffect(() => {
    if (playerState !== 'playing') {
      currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [nextToMark, playerState])

  function updateTimings(next: Timing[]) {
    setTimings(next)
    db.updateTimings(songId, next, activeVersion)
  }

  function handleAdjust(lineIndex: number, delta: number) {
    const next = timings.map((t) =>
      t.lineIndex === lineIndex
        ? { ...t, timestamp: Math.max(0, +(t.timestamp + delta).toFixed(1)) }
        : t,
    )
    updateTimings(next)
  }

  function handleRemark(lineIndex: number) {
    const ts = getCurrentTime()
    const next = timings.map((t) => (t.lineIndex === lineIndex ? { ...t, timestamp: ts } : t))
    updateTimings(next)
    setSelectedLine(null)
  }

  function handleEditStart(index: number, currentText: string) {
    setEditingLine(index)
    setEditingText(currentText)
    setSelectedLine(null)
  }

  function handleEditSave(index: number) {
    if (!song) return
    const lyricsField =
      activeVersion === 'romaji' ? 'lyricsRomaji'
      : activeVersion === 'translation' ? 'lyricsTranslation'
      : 'lyrics'
    const updated = [...activeLyrics]
    updated[index] = editingText
    db.updateSong(songId, { [lyricsField]: updated })
    setSong((s) => (s ? { ...s, [lyricsField]: updated } : s))
    setEditingLine(null)
  }

  function handleMarkTime() {
    if (!song || nextToMark === -1) return
    setSelectedLine(null)
    const ts = getCurrentTime()
    const existing = timings.findIndex((t) => t.lineIndex === nextToMark)
    const next: Timing[] =
      existing >= 0
        ? timings.map((t, i) => (i === existing ? { ...t, timestamp: ts } : t))
        : [...timings, { lineIndex: nextToMark, timestamp: ts }]
    updateTimings(next)
  }

  function handleUndo() {
    if (timings.length === 0) return
    updateTimings(timings.slice(0, -1))
  }

  function handleRemove(lineIndex: number) {
    updateTimings(timings.filter((t) => t.lineIndex !== lineIndex))
  }

  function handleReset() {
    updateTimings([])
    setConfirmReset(false)
  }

  if (!song) return null

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Step header */}
      <div
        className="flex items-center justify-between flex-none border-b border-border"
        style={{ padding: '14px 28px' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-[12px] font-extrabold"
            style={{ padding: '4px 13px', borderRadius: 20, background: 'var(--accent)', color: '#1C0840' }}
          >
            Step 2 of 2
          </span>
          <span className="text-[13px] text-text-2">Sync Lyrics with Audio</span>
          {activeVersion !== 'original' && (
            <span
              className="text-[12px] font-semibold capitalize"
              style={{ padding: '2px 10px', borderRadius: 16, background: '#EBE4FF', color: '#7060A0' }}
            >
              {activeVersion}
            </span>
          )}
        </div>
        <span className="text-[13px] font-bold text-text truncate max-w-[200px]">{song.title}</span>
      </div>

      {/* 2-col body */}
      <div className="flex-1 grid overflow-hidden min-h-0" style={{ gridTemplateColumns: '44% 1fr' }}>
        {/* Left column */}
        <div
          className="flex flex-col gap-2.5 overflow-auto"
          style={{ padding: '16px 20px', borderRight: '1px solid rgba(100, 60, 180, 0.09)' }}
        >
          {/* Video */}
          <div
            className="flex-none relative w-full overflow-hidden"
            style={{ aspectRatio: '16 / 9', maxHeight: 185, borderRadius: 12, background: '#0A0A14' }}
          >
            {videoId ? (
              <>
                <div className="absolute inset-0 yt-player">
                  <div id={playerId} className="w-full h-full" />
                </div>
                {playerError !== null && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center bg-black/85">
                    <span style={{ color: 'rgba(200, 241, 53, 0.6)' }}>
                      <AlertIcon size={24} color="currentColor" />
                    </span>
                    <p className="text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {playerError === 100 ? 'Video not found.' : 'Embedding disabled by video owner.'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Try a different YouTube link in the song editor.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                No YouTube link
              </div>
            )}
          </div>

          {/* Play bar */}
          <button
            onClick={() => play()}
            disabled={!ready || playerError !== null}
            className="flex items-center justify-center disabled:opacity-40"
            style={{
              padding: '11px 16px',
              borderRadius: 10,
              background: '#EBE4FF',
              fontSize: 13,
              color: '#7060A0',
              cursor: ready && playerError === null ? 'pointer' : 'default',
            }}
          >
            ▶ {playerState === 'playing' ? 'playing — keep an eye on the next line' : 'play to preview sync'}
          </button>

          {/* Instruction */}
          <div className="text-[13px] text-text-2 flex-none" style={{ lineHeight: 1.55 }}>
            Press <span className="font-bold text-text">Mark Time</span> when the highlighted line starts.
            Tap a timestamp to seek to it.
            {!ready && videoId && <span className="ml-1">(Loading…)</span>}
          </div>

          {/* Mark Time / All timed + Undo */}
          <div className="flex gap-2 flex-none">
            {allDone ? (
              <div
                className="flex-1 flex items-center justify-center gap-1.5"
                style={{
                  padding: 11,
                  borderRadius: 10,
                  background: 'rgba(200, 241, 53, 0.18)',
                  border: '1px solid rgba(200, 241, 53, 0.45)',
                }}
              >
                <span style={{ color: 'var(--accent-strong)' }}>
                  <CheckIcon size={14} color="currentColor" />
                </span>
                <span className="text-[13px] font-bold" style={{ color: 'var(--accent-strong)' }}>
                  All timed!
                </span>
              </div>
            ) : (
              <button
                onClick={handleMarkTime}
                disabled={!ready}
                className="flex-1 text-[13px] font-bold disabled:opacity-40"
                style={{
                  padding: 11,
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: '#1C0840',
                }}
              >
                ▶ Mark Time
              </button>
            )}
            <button
              onClick={handleUndo}
              disabled={timings.length === 0}
              className="text-[13px] font-semibold text-text disabled:opacity-40"
              style={{
                padding: '11px 18px',
                borderRadius: 10,
                background: '#FFFFFF',
                border: '1px solid rgba(100, 60, 180, 0.09)',
              }}
            >
              Undo
            </button>
          </div>

          {/* Done + Back */}
          <div className="flex gap-2 flex-none">
            <button
              onClick={() => navigate({ name: 'playback', songId })}
              className="flex-1 text-[14px] font-extrabold"
              style={{ padding: 12, borderRadius: 10, background: 'var(--accent)', color: '#1C0840' }}
            >
              Done: Play
            </button>
            <button
              onClick={() => navigate({ name: 'edit', songId })}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-text"
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: '#FFFFFF',
                border: '1px solid rgba(100, 60, 180, 0.09)',
              }}
            >
              <BackIcon size={13} color="currentColor" />
              Back
            </button>
          </div>

          {/* Reset */}
          <div className="text-center flex-none">
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-[12px] text-text-2 underline"
                style={{ textUnderlineOffset: 3 }}
              >
                Reset all timings
              </button>
            ) : (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleReset}
                  className="text-[12px] text-danger underline"
                  style={{ textUnderlineOffset: 3 }}
                >
                  Yes, reset all
                </button>
                <span className="text-[12px] text-text-2">·</span>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-[12px] text-text-2 underline"
                  style={{ textUnderlineOffset: 3 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column — timed lyrics list */}
        <div className="overflow-y-auto">
          {activeLyrics.map((line, i) => {
            const timing = timings.find((t) => t.lineIndex === i)
            const isDone = timing !== undefined
            const isNext = i === nextToMark
            const isActive = i === activeLine
            const isSelected = selectedLine === i
            const highlightBg = isActive ? 'rgba(200, 241, 53, 0.18)' : isNext ? 'rgba(200, 241, 53, 0.07)' : 'transparent'

            return (
              <div
                key={i}
                ref={isNext ? currentRowRef : null}
                style={{
                  borderBottom: '1px solid rgba(100, 60, 180, 0.09)',
                  background: highlightBg,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '54px 1fr 30px',
                    alignItems: 'center',
                    padding: '13px 20px',
                  }}
                >
                  {/* Timestamp */}
                  <button
                    onClick={
                      isDone
                        ? () => {
                            seekTo(Math.max(0, timing!.timestamp - 1.5))
                            setSelectedLine(isSelected ? null : i)
                          }
                        : undefined
                    }
                    disabled={!isDone}
                    className="text-left"
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDone ? 'var(--accent-strong)' : '#7060A0',
                      cursor: isDone ? 'pointer' : 'default',
                    }}
                  >
                    {isDone ? formatSeconds(timing!.timestamp) : isNext ? '· · ·' : ''}
                  </button>

                  {/* Lyric text */}
                  <div
                    className="text-[13px]"
                    style={{
                      color: '#1C0840',
                      fontWeight: isActive || isNext ? 700 : 400,
                      lineHeight: 1.4,
                    }}
                  >
                    {editingLine === i ? (
                      <input
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => handleEditSave(i)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave(i)}
                        className="w-full text-[13px] text-text outline-none"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: '#FFFFFF',
                          border: '1px solid rgba(100, 60, 180, 0.13)',
                        }}
                      />
                    ) : (
                      <span
                        className="cursor-text"
                        onClick={() => handleEditStart(i, line)}
                        title="Click to edit lyric text"
                      >
                        {line}
                      </span>
                    )}
                  </div>

                  {/* × button */}
                  <div className="flex justify-end">
                    {isDone && (
                      <button
                        onClick={() => handleRemove(i)}
                        aria-label="Remove timing"
                        className="text-text-2 hover:text-text"
                        style={{ padding: 2 }}
                      >
                        <XIcon size={14} color="currentColor" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Fine-tune bar (revealed on timestamp click) */}
                {isSelected && isDone && (
                  <div
                    className="flex items-center gap-1.5 flex-wrap"
                    style={{ padding: '0 20px 12px' }}
                  >
                    {([-0.5, -0.1, 0.1, 0.5] as const).map((delta) => (
                      <button
                        key={delta}
                        onClick={() => handleAdjust(i, delta)}
                        className="text-[11px]"
                        style={{
                          padding: '4px 9px',
                          borderRadius: 7,
                          background: '#EBE4FF',
                          color: '#7060A0',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontWeight: 600,
                        }}
                      >
                        {delta > 0 ? '+' : ''}{delta}s
                      </button>
                    ))}
                    <button
                      onClick={() => handleRemark(i)}
                      disabled={!ready}
                      className="text-[11px] font-bold disabled:opacity-40"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 7,
                        background: 'var(--accent)',
                        color: '#1C0840',
                      }}
                    >
                      Remark
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
