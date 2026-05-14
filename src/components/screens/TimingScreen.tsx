import { useEffect, useId, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import { useYouTube } from '../../hooks/useYouTube'
import { extractVideoId, formatSeconds } from '../../lib/youtube'
import type { Screen, Song, Timing } from '../../types'

type Props = { songId: string; navigate: (s: Screen) => void; version?: 'original' | 'romaji' | 'translation' }

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
  const { ready, playerState, playerError, getCurrentTime, seekTo } = useYouTube(playerId, videoId)

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
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playerState, getCurrentTime])

  const activeLyrics = !song ? [] :
    activeVersion === 'romaji' ? (song.lyricsRomaji ?? song.lyrics)
    : activeVersion === 'translation' ? (song.lyricsTranslation ?? song.lyrics)
    : song.lyrics

  const timedSet = song ? new Set(timings.map((t) => t.lineIndex)) : new Set<number>()
  const nextToMark = song ? activeLyrics.findIndex((_, i) => !timedSet.has(i)) : -1
  const allDone = nextToMark === -1 && song !== null

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
        : t
    )
    updateTimings(next)
  }

  function handleRemark(lineIndex: number) {
    const ts = getCurrentTime()
    const next = timings.map((t) =>
      t.lineIndex === lineIndex ? { ...t, timestamp: ts } : t
    )
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
    setSong((s) => s ? { ...s, [lyricsField]: updated } : s)
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
    <div className="flex flex-col bg-canvas" style={{ height: 'calc(100dvh - 56px)' }}>
      {/* Step indicator */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border flex-shrink-0">
        <span className="bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full">
          Step 2 of 2
        </span>
        <span className="text-xs text-muted">Sync Lyrics with Audio</span>
        {activeVersion !== 'original' && (
          <span className="bg-coral-soft text-coral text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
            {activeVersion}
          </span>
        )}
        <span className="ml-auto text-xs text-muted truncate max-w-[200px]">{song.title}</span>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Left column: video + live preview + controls */}
      <div className="flex flex-col w-2/5 min-w-[280px] border-r border-border p-4 gap-3">
        {/* Video */}
        {videoId ? (
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden yt-player flex-shrink-0">
            <div id={playerId} className="w-full h-full" />
            {playerError !== null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/90 rounded-2xl gap-2 px-4 text-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8694A" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-white text-xs font-semibold">
                  {playerError === 100 ? 'Video not found.' : 'Embedding disabled by video owner.'}
                </p>
                <p className="text-muted text-xs">Try a different YouTube link in the song editor.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full aspect-video bg-coral-soft rounded-2xl flex items-center justify-center text-muted flex-shrink-0">
            No YouTube link
          </div>
        )}

        {/* Live lyric preview */}
        <div className="bg-ink rounded-2xl px-3 py-3 flex-shrink-0 min-h-[60px] flex items-center justify-center">
          {activeLine >= 0 && activeLyrics[activeLine] ? (
            <p className="text-white text-center text-sm font-semibold leading-snug">
              {activeLyrics[activeLine]}
            </p>
          ) : (
            <p className="text-muted text-center text-xs">
              {timings.length > 0 ? '▶ play to preview sync' : '▶ lyrics appear here as you play'}
            </p>
          )}
        </div>

        {/* Instruction */}
        <div className="bg-coral-soft px-3 py-2 rounded-xl text-xs text-ink flex-shrink-0">
          Press <strong>Mark Time</strong> when the highlighted line starts.
          Tap a timestamp to seek to it.
          {!ready && videoId && <span className="ml-1 text-muted">(Loading…)</span>}
        </div>

        {/* Controls */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            className="flex-1 py-3 bg-coral text-white font-bold text-sm rounded-xl hover:bg-coral-dark transition-colors disabled:opacity-40"
            onClick={handleMarkTime}
            disabled={!ready || allDone}
          >
            {allDone ? '✓ All timed!' : '▶ Mark Time'}
          </button>
          <button
            className="px-4 py-3 border border-border text-ink font-semibold text-sm rounded-xl hover:bg-coral-soft transition-colors disabled:opacity-40"
            onClick={handleUndo}
            disabled={timings.length === 0}
          >
            Undo
          </button>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            className="flex-1 py-2.5 bg-coral text-white font-semibold text-sm rounded-xl hover:bg-coral-dark transition-colors"
            onClick={() => navigate({ name: 'playback', songId })}
          >
            Done: Play
          </button>
          <button
            className="px-4 py-2.5 border border-border text-ink font-semibold text-sm rounded-xl hover:bg-coral-soft transition-colors"
            onClick={() => navigate({ name: 'edit', songId })}
          >
            ← Back
          </button>
        </div>

        {/* Reset */}
        <div className="text-center flex-shrink-0">
          {!confirmReset ? (
            <button className="text-xs text-muted underline" onClick={() => setConfirmReset(true)}>
              Reset all timings
            </button>
          ) : (
            <div className="flex gap-2 justify-center">
              <button className="text-xs text-red-500 underline" onClick={handleReset}>
                Yes, reset all
              </button>
              <span className="text-xs text-muted">·</span>
              <button className="text-xs text-muted underline" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right column: lyric list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        {activeLyrics.map((line, i) => {
          const timing = timings.find((t) => t.lineIndex === i)
          const isCurrent = i === nextToMark
          const isDone = timing !== undefined
          const isActive = i === activeLine
          const isSelected = selectedLine === i

          return (
            <div
              key={i}
              ref={isCurrent ? currentRowRef : null}
              className={`flex flex-col border-b border-border last:border-0 rounded-lg transition-colors ${
                isActive ? 'bg-coral-light' : isCurrent ? 'bg-coral-soft' : ''
              }`}
            >
              <div className="flex gap-3 py-3 items-center px-1">
                {/* Timestamp */}
                <div
                  className={`w-14 font-mono text-xs font-semibold flex-shrink-0 ${
                    isDone ? 'text-coral cursor-pointer hover:text-ink' : 'text-muted'
                  }`}
                  onClick={
                    isDone
                      ? () => {
                          seekTo(Math.max(0, timing!.timestamp - 1.5))
                          setSelectedLine(isSelected ? null : i)
                        }
                      : undefined
                  }
                >
                  {isDone ? formatSeconds(timing!.timestamp) : isCurrent ? '??:??' : ''}
                </div>

                {/* Lyric text */}
                <div
                  className={`flex-1 text-sm leading-snug ${
                    isActive ? 'font-bold text-ink' : isCurrent ? 'font-semibold text-ink' : 'text-ink'
                  }`}
                >
                  {editingLine === i ? (
                    <input
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => handleEditSave(i)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave(i)}
                      className="w-full bg-white border border-border rounded-lg px-1 text-sm focus:outline-none focus:ring-1 focus:ring-coral"
                    />
                  ) : (
                    <span className="cursor-text" onClick={() => handleEditStart(i, line)}>
                      {line}
                    </span>
                  )}
                </div>

                <div className="flex-shrink-0 w-10 text-right">
                  {isDone && !isSelected ? (
                    <button
                      className="text-muted hover:text-red-400 text-xs px-1 py-0.5"
                      onClick={() => handleRemove(i)}
                    >
                      ✕
                    </button>
                  ) : isCurrent && !isDone ? (
                    <span className="text-xs text-coral font-semibold">next</span>
                  ) : null}
                </div>
              </div>

              {/* Fine-tune bar */}
              {isSelected && isDone && (
                <div className="flex items-center gap-1 pb-2 px-1 flex-wrap">
                  {([-0.5, -0.1, 0.1, 0.5] as const).map((delta) => (
                    <button
                      key={delta}
                      className="px-2 py-1 text-xs bg-coral-light rounded-lg font-mono hover:bg-coral hover:text-white transition-colors"
                      onClick={() => handleAdjust(i, delta)}
                    >
                      {delta > 0 ? '+' : ''}{delta}s
                    </button>
                  ))}
                  <button
                    className="px-2 py-1 text-xs bg-coral text-white rounded-lg font-semibold disabled:opacity-40"
                    onClick={() => handleRemark(i)}
                    disabled={!ready}
                  >
                    Remark
                  </button>
                  <button
                    className="ml-auto px-2 py-1 text-xs text-red-400 hover:text-red-600"
                    onClick={() => { handleRemove(i); setSelectedLine(null) }}
                  >
                    ✕ Remove
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
