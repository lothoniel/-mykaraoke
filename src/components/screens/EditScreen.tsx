import { useEffect, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import { fetchLyrics, type LrclibResult } from '../../lib/lrclib'
import { extractVideoId } from '../../lib/youtube'
import { copyTimings } from '../../lib/timing-copy'
import MarkerConfirmModal from './MarkerConfirmModal'
import LyricAlignModal from './LyricAlignModal'
import type { Screen, Song, Timing } from '../../types'

type CopyTarget = 'romaji' | 'translation'

type CopyDialog =
  | { kind: 'markers'; target: CopyTarget; markers: { index: number; text: string }[] }
  | { kind: 'mismatch'; target: CopyTarget; originalCount: number; versionCount: number; strip: boolean | number[] }
  | { kind: 'ok'; target: CopyTarget; count: number; partial?: { versionTotal: number; originalTotal: number } }

type AlignState = { target: CopyTarget; originalLines: string[]; originalTimings: Timing[]; versionLines: string[] }

type FormSnapshot = {
  title: string
  artist: string
  spotifyLink: string
  youtubeLink: string
  coverArt: string
  lyricsText: string
  lyricsRomajiText: string
  lyricsTranslationText: string
}

type Props = { songId: string; navigate: (s: Screen) => void; goBack: () => void }
type LyricsTab = 'original' | 'romaji' | 'translation'

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const inputCls = 'w-full text-[13px] text-text outline-none'
const inputStyle = {
  padding: '10px 14px',
  borderRadius: 10,
  background: '#FAFAFE',
  border: '1px solid rgba(100, 60, 180, 0.13)',
}

function BackIcon({ size = 19, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function LinkIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function EditPencilIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function ClockIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TrashIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function FormField({
  label,
  optional,
  required,
  children,
  rightSlot,
}: {
  label: string
  optional?: string
  required?: boolean
  children: React.ReactNode
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="mb-3.5">
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="text-[13px] font-bold text-text">{label}</span>
        {required && <span className="text-[13px] font-extrabold" style={{ color: 'var(--accent-strong)' }}>*</span>}
        {optional && <span className="text-[12px] text-text-2">{optional}</span>}
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex-1 min-w-0">{children}</div>
        {rightSlot}
      </div>
    </div>
  )
}

export default function EditScreen({ songId, navigate, goBack }: Props) {
  const [song, setSong] = useState<Song | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [spotifyLink, setSpotifyLink] = useState('')
  const [youtubeLink, setYoutubeLink] = useState('')
  const [coverArt, setCoverArt] = useState('')
  const [lyricsText, setLyricsText] = useState('')
  const [lyricsRomajiText, setLyricsRomajiText] = useState('')
  const [lyricsTranslationText, setLyricsTranslationText] = useState('')
  const [lyricsTab, setLyricsTab] = useState<LyricsTab>('original')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'notfound' | 'confirm'>('idle')
  const [pendingResult, setPendingResult] = useState<LrclibResult | null>(null)
  const [fetchedTimings, setFetchedTimings] = useState<Timing[] | null>(null)
  const [pendingTimingsVersion, setPendingTimingsVersion] = useState<LyricsTab | null>(null)
  const [copyDialog, setCopyDialog] = useState<CopyDialog | null>(null)
  const [alignState, setAlignState] = useState<AlignState | null>(null)

  const initialFormRef = useRef<FormSnapshot | null>(null)

  useEffect(() => {
    db.getSong(songId).then((s) => {
      if (!s) return
      setSong(s)
      setTitle(s.title)
      setArtist(s.artist)
      setSpotifyLink(s.spotifyLink ?? '')
      setYoutubeLink(s.youtubeLink ?? '')
      setCoverArt(s.coverArt ?? '')
      const lyricsJoined = s.lyrics.join('\n')
      const romajiJoined = s.lyricsRomaji?.join('\n') ?? ''
      const translationJoined = s.lyricsTranslation?.join('\n') ?? ''
      setLyricsText(lyricsJoined)
      setLyricsRomajiText(romajiJoined)
      setLyricsTranslationText(translationJoined)
      initialFormRef.current = {
        title: s.title,
        artist: s.artist,
        spotifyLink: s.spotifyLink ?? '',
        youtubeLink: s.youtubeLink ?? '',
        coverArt: s.coverArt ?? '',
        lyricsText: lyricsJoined,
        lyricsRomajiText: romajiJoined,
        lyricsTranslationText: translationJoined,
      }
    })
  }, [songId])

  const isDirty = (() => {
    const init = initialFormRef.current
    if (!init) return false
    return (
      title !== init.title ||
      artist !== init.artist ||
      spotifyLink !== init.spotifyLink ||
      youtubeLink !== init.youtubeLink ||
      coverArt !== init.coverArt ||
      lyricsText !== init.lyricsText ||
      lyricsRomajiText !== init.lyricsRomajiText ||
      lyricsTranslationText !== init.lyricsTranslationText
    )
  })()

  async function handleFetchLyrics() {
    if (!song) return
    setFetchStatus('loading')
    const result = await fetchLyrics(song.title, song.artist, song.duration ? song.duration / 1000 : undefined)
    if (!result) { setFetchStatus('notfound'); return }
    if (lyricsText.trim()) {
      setPendingResult(result)
      setFetchStatus('confirm')
    } else {
      applyResult(result)
    }
  }

  function applyResult(result: LrclibResult) {
    setLyricsText(result.lyrics.join('\n'))
    setFetchedTimings(result.timings)
    setFetchStatus('idle')
    setPendingResult(null)
  }

  async function persistChanges(): Promise<boolean> {
    setError('')
    if (!title.trim()) { setError('Title is required'); return false }
    if (!youtubeLink.trim()) { setError('YouTube link is required'); return false }
    const videoId = extractVideoId(youtubeLink)
    if (!videoId) { setError('Invalid YouTube link'); return false }

    const lyrics = lyricsText.split('\n').map((l) => l.trim()).filter(Boolean)
    const updates: Partial<Song> = {
      title: title.trim(),
      artist: artist.trim(),
      spotifyLink: spotifyLink.trim() || undefined,
      youtubeLink: youtubeLink.trim(),
      coverArt: coverArt.trim() || undefined,
      lyrics,
      lyricsRomaji: lyricsRomajiText.trim()
        ? lyricsRomajiText.split('\n').map((l) => l.trim()).filter(Boolean)
        : undefined,
      lyricsTranslation: lyricsTranslationText.trim()
        ? lyricsTranslationText.split('\n').map((l) => l.trim()).filter(Boolean)
        : undefined,
    }
    if (fetchedTimings) {
      updates.timings = fetchedTimings.filter((t) => t.lineIndex < lyrics.length)
    }
    await db.updateSong(songId, updates)
    return true
  }

  async function handleSave() {
    if (await persistChanges()) navigate({ name: 'playback', songId })
  }

  function handleEditTimingsClick() {
    if (isDirty) {
      setPendingTimingsVersion(lyricsTab)
    } else {
      navigate({ name: 'timing', songId, version: lyricsTab })
    }
  }

  async function handleSaveAndGoToTimings() {
    const version = pendingTimingsVersion ?? lyricsTab
    setPendingTimingsVersion(null)
    if (await persistChanges()) navigate({ name: 'timing', songId, version })
  }

  function handleDiscardAndGoToTimings() {
    const version = pendingTimingsVersion ?? lyricsTab
    setPendingTimingsVersion(null)
    navigate({ name: 'timing', songId, version })
  }

  async function runCopyTimings(
    target: CopyTarget,
    strip: boolean | number[] | null,
    partial = false,
    overrideVersionLines?: string[],
  ) {
    if (!song) return
    const originalTimings = fetchedTimings ?? song.timings ?? []
    if (originalTimings.length === 0) return
    const originalLines = lyricsText.split('\n').map((l) => l.trim()).filter(Boolean)
    const versionText = target === 'romaji' ? lyricsRomajiText : lyricsTranslationText
    const versionLines =
      overrideVersionLines ?? versionText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (versionLines.length === 0 || originalLines.length === 0) return

    const result = copyTimings(originalLines, originalTimings, versionLines, strip, partial ? 'partial' : 'strict')
    if (result.kind === 'ok') {
      const finalVersionLines = result.strippedLyrics ?? versionLines
      const lyricsField = target === 'romaji' ? 'lyricsRomaji' : 'lyricsTranslation'
      const timingsField = target === 'romaji' ? 'timingsRomaji' : 'timingsTranslation'
      await db.updateSong(songId, { [lyricsField]: finalVersionLines, [timingsField]: result.timings })
      setSong((s) => (s ? { ...s, [lyricsField]: finalVersionLines, [timingsField]: result.timings } : s))
      const finalChangedLyrics = result.strippedLyrics != null || overrideVersionLines != null
      if (finalChangedLyrics) {
        const joined = finalVersionLines.join('\n')
        if (target === 'romaji') setLyricsRomajiText(joined)
        else setLyricsTranslationText(joined)
      }
      setAlignState(null)
      setCopyDialog({
        kind: 'ok',
        target,
        count: result.timings.length,
        ...(result.partial && {
          partial: { versionTotal: result.partial.versionTotal, originalTotal: result.partial.originalTotal },
        }),
      })
      return
    }
    if (result.markers.length > 0 && strip === null) {
      setCopyDialog({ kind: 'markers', target, markers: result.markers })
      return
    }
    setCopyDialog({
      kind: 'mismatch',
      target,
      originalCount: result.originalCount,
      versionCount: result.versionCount,
      strip: Array.isArray(strip) ? strip : strip === true,
    })
  }

  function openAlignModal(target: CopyTarget) {
    if (!song) return
    const originalTimings = fetchedTimings ?? song.timings ?? []
    const originalLines = lyricsText.split('\n').map((l) => l.trim()).filter(Boolean)
    const versionText = target === 'romaji' ? lyricsRomajiText : lyricsTranslationText
    const versionLines = versionText.split('\n').map((l) => l.trim()).filter(Boolean)
    setAlignState({ target, originalLines, originalTimings, versionLines })
  }

  async function handleDelete() {
    await db.deleteSong(songId)
    navigate({ name: 'home' })
  }

  if (!song) return null

  const activeLyricsValue =
    lyricsTab === 'romaji' ? lyricsRomajiText
    : lyricsTab === 'translation' ? lyricsTranslationText
    : lyricsText

  const charCount = activeLyricsValue.length

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="flex-none flex items-center justify-between border-b border-border" style={{ padding: '14px 28px' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            aria-label="Back"
            className="text-text-2 hover:text-text"
            style={{ padding: 2 }}
          >
            <BackIcon size={19} color="currentColor" />
          </button>
          <div>
            <div className="text-[22px] font-extrabold text-text leading-tight" style={{ letterSpacing: '-0.4px' }}>
              Edit Song
            </div>
            <div className="text-[13px] text-text-2 mt-0.5">Update details, lyrics, or links.</div>
          </div>
        </div>
        <span className="text-[13px] font-bold text-text truncate max-w-[260px]">{song.title}</span>
      </div>

      {/* 2-col body */}
      <div
        className="flex-1 grid overflow-hidden min-h-0"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px 22px' }}
      >
        {/* Left: Source Details */}
        <div
          className="flex flex-col overflow-auto"
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid rgba(100, 60, 180, 0.09)',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(100, 60, 180, 0.05)',
          }}
        >
          <div className="flex items-center gap-2 mb-4 flex-none">
            <span style={{ color: 'var(--accent-strong)' }}>
              <LinkIcon size={16} color="currentColor" />
            </span>
            <span className="text-[15px] font-bold text-text">Source Details</span>
          </div>

          <FormField label="Spotify Link" optional="(optional)">
            <input
              type="url"
              value={spotifyLink}
              onChange={(e) => setSpotifyLink(e.target.value)}
              placeholder="https://open.spotify.com/track/..."
              className={inputCls}
              style={inputStyle}
            />
          </FormField>

          <FormField
            label="YouTube Link"
            required
            rightSlot={
              <button
                onClick={() => {
                  const q = `${title} ${artist}`.trim()
                  if (!q) return
                  window.open(
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }}
                disabled={!title.trim() && !artist.trim()}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-text-2 disabled:opacity-40 flex-none"
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(100, 60, 180, 0.09)',
                }}
              >
                Search YouTube
              </button>
            }
          >
            <input
              type="url"
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputCls}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Song Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Artist Name">
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Cover Art URL" optional="(optional)">
            <input
              type="url"
              value={coverArt}
              onChange={(e) => setCoverArt(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </FormField>

          {coverArt && (
            <div className="mb-3.5">
              <img
                src={coverArt}
                alt=""
                style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          )}

          {/* Quick action: Edit timings */}
          <div className="mt-auto flex-none">
            <button
              onClick={handleEditTimingsClick}
              className="w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold text-text-2"
              style={{
                padding: '10px',
                borderRadius: 10,
                background: '#FAFAFE',
                border: '1px solid rgba(100, 60, 180, 0.13)',
              }}
            >
              <ClockIcon size={14} color="currentColor" />
              Edit timings ({lyricsTab === 'romaji' ? 'romanized' : lyricsTab})
            </button>
          </div>
        </div>

        {/* Right: Lyrics Editor */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid rgba(100, 60, 180, 0.09)',
            padding: '18px 20px',
            boxShadow: '0 2px 10px rgba(100, 60, 180, 0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-3 flex-none">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--accent-strong)' }}>
                <EditPencilIcon size={15} color="currentColor" />
              </span>
              <span className="text-[15px] font-bold text-text">Lyrics Editor</span>
            </div>
            {lyricsTab === 'original' ? (
              <button
                onClick={handleFetchLyrics}
                disabled={fetchStatus === 'loading'}
                className="text-[13px] font-semibold underline disabled:opacity-40"
                style={{ color: 'var(--accent-strong)', textUnderlineOffset: 3 }}
              >
                {fetchStatus === 'loading' ? 'Searching…' : 'Fetch from LRCLIB'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const q = `${title} ${artist}`.trim()
                  if (!q) return
                  window.open(
                    `https://genius.com/search?q=${encodeURIComponent(q)}`,
                    '_blank',
                    'noopener,noreferrer',
                  )
                }}
                disabled={!title.trim() && !artist.trim()}
                className="text-[13px] font-semibold underline disabled:opacity-40"
                style={{ color: 'var(--accent-strong)', textUnderlineOffset: 3 }}
              >
                Search on Genius
              </button>
            )}
          </div>

          <div className="flex gap-1.5 mb-3 flex-none">
            {(['original', 'romaji', 'translation'] as const).map((tab) => {
              const active = lyricsTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setLyricsTab(tab)}
                  className="text-[13px]"
                  style={{
                    padding: '5px 15px',
                    borderRadius: 20,
                    background: active ? 'var(--accent)' : '#EBE4FF',
                    color: active ? '#1C0840' : '#7060A0',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {tab === 'romaji' ? 'Romanized' : tab === 'translation' ? 'Translation' : 'Original'}
                </button>
              )
            })}
          </div>

          {fetchStatus === 'notfound' && lyricsTab === 'original' && (
            <p className="text-[12px] text-text-2 mb-2 flex-none">No lyrics found for this song.</p>
          )}
          {fetchStatus === 'confirm' && pendingResult && lyricsTab === 'original' && (
            <div
              className="mb-2 flex-none"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(200, 241, 53, 0.10)',
                border: '1px solid rgba(200, 241, 53, 0.40)',
              }}
            >
              <p className="text-[12px] font-bold text-text mb-0.5">
                {pendingResult.timings
                  ? 'Synced lyrics found — timing data will be imported too.'
                  : 'Plain lyrics found (no timing data).'}
              </p>
              <p className="text-[12px] text-text-2 mb-2">Replace your current lyrics?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => applyResult(pendingResult)}
                  className="text-[12px] font-bold"
                  style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--accent)', color: '#1C0840' }}
                >
                  Yes, replace
                </button>
                <button
                  onClick={() => { setFetchStatus('idle'); setPendingResult(null) }}
                  className="text-[12px] font-semibold text-text-2"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#FFFFFF',
                    border: '1px solid rgba(100, 60, 180, 0.09)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div
            className="flex-1 flex flex-col min-h-0"
            style={{
              borderRadius: 11,
              border: '1px solid rgba(100, 60, 180, 0.13)',
              background: '#FAFAFE',
              padding: '12px 14px',
            }}
          >
            <textarea
              value={activeLyricsValue}
              onChange={(e) => {
                if (lyricsTab === 'romaji') {
                  setLyricsRomajiText(e.target.value)
                  if (copyDialog?.target === 'romaji') setCopyDialog(null)
                } else if (lyricsTab === 'translation') {
                  setLyricsTranslationText(e.target.value)
                  if (copyDialog?.target === 'translation') setCopyDialog(null)
                } else {
                  setLyricsText(e.target.value)
                  setFetchStatus('idle')
                  if (fetchedTimings) setFetchedTimings(null)
                }
              }}
              placeholder={
                lyricsTab === 'original'
                  ? 'Paste lyrics here, one line per lyric line…'
                  : lyricsTab === 'romaji'
                    ? 'Paste romanized lyrics here…'
                    : 'Paste translated lyrics here…'
              }
              className="flex-1 w-full bg-transparent outline-none resize-none text-[13px] text-text"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                lineHeight: 1.7,
              }}
            />
            <div className="text-right text-[11px] text-text-2 mt-1.5 flex-none">{charCount} characters</div>
          </div>

          <div className="text-[12px] text-text-2 mt-2 flex-none flex items-center gap-2 flex-wrap" style={{ lineHeight: 1.5 }}>
            {lyricsTab === 'original' ? (
              fetchedTimings && fetchedTimings.length > 0 ? (
                <span
                  className="text-[11px] font-bold inline-flex items-center gap-1"
                  style={{
                    padding: '3px 9px',
                    borderRadius: 16,
                    background: 'rgba(200, 241, 53, 0.18)',
                    color: 'var(--accent-strong)',
                    border: '1px solid rgba(200, 241, 53, 0.45)',
                  }}
                >
                  ✓ {fetchedTimings.length} synced timings will replace existing ones on save
                </span>
              ) : (
                <span>Tip: existing timings are preserved unless you re-fetch synced lyrics.</span>
              )
            ) : (
              <>
                {(() => {
                  const target = lyricsTab as 'romaji' | 'translation'
                  const versionLabel = target === 'romaji' ? 'Romanized' : 'Translation'
                  const versionTimings = target === 'romaji' ? song.timingsRomaji : song.timingsTranslation
                  const versionTextNonEmpty =
                    target === 'romaji' ? lyricsRomajiText.trim().length > 0 : lyricsTranslationText.trim().length > 0
                  const sourceTimings = fetchedTimings ?? song.timings ?? []
                  const canCopy = sourceTimings.length > 0 && versionTextNonEmpty
                  return (
                    <>
                      {versionTimings && versionTimings.length > 0 && (
                        <span
                          className="text-[11px] font-bold inline-flex items-center gap-1"
                          style={{
                            padding: '3px 9px',
                            borderRadius: 16,
                            background: 'rgba(200, 241, 53, 0.18)',
                            color: 'var(--accent-strong)',
                            border: '1px solid rgba(200, 241, 53, 0.45)',
                          }}
                        >
                          ✓ {versionTimings.length} timings saved for {versionLabel}
                        </span>
                      )}
                      {canCopy ? (
                        <button
                          onClick={() => runCopyTimings(target, null)}
                          className="text-[11px] font-bold"
                          style={{
                            padding: '4px 10px',
                            borderRadius: 16,
                            background: '#EBE4FF',
                            color: '#7060A0',
                            border: '1px solid rgba(100, 60, 180, 0.13)',
                          }}
                          title="Copies current original timings — re-click after edits."
                        >
                          Copy timings from original
                        </button>
                      ) : (
                        !versionTimings?.length && (
                          <span>
                            {sourceTimings.length === 0
                              ? 'No original timings yet. Set them on the Original tab first.'
                              : `Paste ${versionLabel.toLowerCase()} lyrics to copy timings.`}
                          </span>
                        )
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>

          {copyDialog && (lyricsTab === 'romaji' || lyricsTab === 'translation') && copyDialog.target === lyricsTab && (
            <div
              className="mt-2 flex-none"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: copyDialog.kind === 'mismatch' ? 'rgba(239, 68, 68, 0.06)' : '#FAFAFE',
                border: `1px solid ${copyDialog.kind === 'mismatch' ? 'rgba(239, 68, 68, 0.30)' : 'rgba(100, 60, 180, 0.13)'}`,
              }}
            >
              {copyDialog.kind === 'mismatch' && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[12px] text-danger">
                    Line counts don't match — Original: {copyDialog.originalCount}, {copyDialog.target === 'romaji' ? 'Romanized' : 'Translation'}: {copyDialog.versionCount}.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAlignModal(copyDialog.target)}
                      className="text-[12px] font-bold"
                      style={{ padding: '4px 12px', borderRadius: 7, background: 'var(--accent)', color: '#1C0840' }}
                    >
                      Align side-by-side
                    </button>
                    <button
                      onClick={() => runCopyTimings(copyDialog.target, copyDialog.strip, true)}
                      className="text-[12px] font-semibold text-text-2 underline"
                      style={{ textUnderlineOffset: 3 }}
                    >
                      Copy what fits ({Math.min(copyDialog.originalCount, copyDialog.versionCount)})
                    </button>
                    <button
                      onClick={() => setCopyDialog(null)}
                      className="text-[12px] font-semibold text-text-2 underline"
                      style={{ textUnderlineOffset: 3 }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {copyDialog.kind === 'ok' && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[12px]" style={{ color: 'var(--accent-strong)' }}>
                    ✓ Copied {copyDialog.count} timings to {copyDialog.target === 'romaji' ? 'Romanized' : 'Translation'}.
                    {copyDialog.partial && (
                      <>
                        {' '}
                        <span className="text-text-2">
                          Original had {copyDialog.partial.originalTotal} lines, {copyDialog.target === 'romaji' ? 'Romanized' : 'Translation'} has {copyDialog.partial.versionTotal} — adjust drift in Edit timings.
                        </span>
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => setCopyDialog(null)}
                    className="text-[12px] font-semibold text-text-2 underline"
                    style={{ textUnderlineOffset: 3 }}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between flex-none"
        style={{
          padding: '11px 22px',
          borderTop: '1px solid rgba(100, 60, 180, 0.09)',
          background: '#FFFFFF',
        }}
      >
        <div className="flex flex-col">
          {error && <span className="text-[12px] text-danger">{error}</span>}
        </div>
        <div className="flex gap-2.5 ml-auto items-center">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-danger"
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.30)',
              }}
            >
              <TrashIcon size={14} color="currentColor" />
              Delete
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="text-[12px] text-danger">Delete this song?</span>
              <button
                onClick={handleDelete}
                className="text-[13px] font-bold text-white"
                style={{ padding: '9px 14px', borderRadius: 10, background: '#EF4444' }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[13px] font-semibold text-text-2"
                style={{
                  padding: '9px 14px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(100, 60, 180, 0.09)',
                }}
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={goBack}
            className="text-[14px] font-semibold text-text"
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid rgba(100, 60, 180, 0.09)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-[14px] font-bold"
            style={{
              padding: '9px 22px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#1C0840',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>

      {pendingTimingsVersion !== null && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'rgba(28, 8, 64, 0.45)', zIndex: 50 }}
          onClick={() => setPendingTimingsVersion(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid rgba(100, 60, 180, 0.09)',
              boxShadow: '0 10px 40px rgba(28, 8, 64, 0.25)',
              padding: '22px 24px',
              width: 'min(420px, calc(100vw - 32px))',
            }}
          >
            <div
              className="text-[17px] font-extrabold text-text"
              style={{ letterSpacing: '-0.3px' }}
            >
              You have unsaved changes
            </div>
            <p className="text-[13px] text-text-2 mt-1.5" style={{ lineHeight: 1.5 }}>
              Save your edits before opening the timing editor, or discard them and continue.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-end">
              <button
                onClick={() => setPendingTimingsVersion(null)}
                className="text-[13px] font-semibold text-text-2"
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: 'transparent',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDiscardAndGoToTimings}
                className="text-[13px] font-semibold text-text"
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: '#FFFFFF',
                  border: '1px solid rgba(100, 60, 180, 0.13)',
                }}
              >
                Discard &amp; continue
              </button>
              <button
                onClick={handleSaveAndGoToTimings}
                className="text-[13px] font-bold"
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: '#1C0840',
                }}
              >
                Save &amp; continue
              </button>
            </div>
          </div>
        </div>
      )}

      {copyDialog?.kind === 'markers' && (
        <MarkerConfirmModal
          markers={copyDialog.markers}
          versionLabel={copyDialog.target === 'romaji' ? 'Romanized' : 'Translation'}
          onCancel={() => setCopyDialog(null)}
          onConfirm={(indices) => runCopyTimings(copyDialog.target, indices)}
        />
      )}

      {alignState && (
        <LyricAlignModal
          originalLines={alignState.originalLines}
          originalTimings={alignState.originalTimings}
          versionLines={alignState.versionLines}
          versionLabel={alignState.target === 'romaji' ? 'Romanized' : 'Translation'}
          onCancel={() => setAlignState(null)}
          onApply={(aligned) => runCopyTimings(alignState.target, false, false, aligned)}
        />
      )}
    </div>
  )
}
