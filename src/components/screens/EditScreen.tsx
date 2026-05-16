import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { fetchLyrics, type LrclibResult } from '../../lib/lrclib'
import { extractVideoId } from '../../lib/youtube'
import type { Screen, Song, Timing } from '../../types'

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

  useEffect(() => {
    db.getSong(songId).then((s) => {
      if (!s) return
      setSong(s)
      setTitle(s.title)
      setArtist(s.artist)
      setSpotifyLink(s.spotifyLink ?? '')
      setYoutubeLink(s.youtubeLink ?? '')
      setCoverArt(s.coverArt ?? '')
      setLyricsText(s.lyrics.join('\n'))
      setLyricsRomajiText(s.lyricsRomaji?.join('\n') ?? '')
      setLyricsTranslationText(s.lyricsTranslation?.join('\n') ?? '')
    })
  }, [songId])

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

  async function handleSave() {
    setError('')
    if (!title.trim()) return setError('Title is required')
    if (!youtubeLink.trim()) return setError('YouTube link is required')
    const videoId = extractVideoId(youtubeLink)
    if (!videoId) return setError('Invalid YouTube link')

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
    navigate({ name: 'playback', songId })
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

          <FormField label="YouTube Link" required>
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
              onClick={() => navigate({ name: 'timing', songId, version: lyricsTab })}
              className="w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold text-text-2"
              style={{
                padding: '10px',
                borderRadius: 10,
                background: '#FAFAFE',
                border: '1px solid rgba(100, 60, 180, 0.13)',
              }}
            >
              <ClockIcon size={14} color="currentColor" />
              Edit timings ({lyricsTab})
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
            <button
              onClick={handleFetchLyrics}
              disabled={fetchStatus === 'loading' || lyricsTab !== 'original'}
              className="text-[13px] font-semibold underline disabled:opacity-40"
              style={{ color: 'var(--accent-strong)', textUnderlineOffset: 3 }}
            >
              {fetchStatus === 'loading' ? 'Searching…' : 'Fetch from LRCLIB'}
            </button>
          </div>

          <div className="flex gap-1.5 mb-3 flex-none">
            {(['original', 'romaji', 'translation'] as const).map((tab) => {
              const active = lyricsTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setLyricsTab(tab)}
                  className="text-[13px] capitalize"
                  style={{
                    padding: '5px 15px',
                    borderRadius: 20,
                    background: active ? 'var(--accent)' : '#EBE4FF',
                    color: active ? '#1C0840' : '#7060A0',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {tab}
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
                if (lyricsTab === 'romaji') setLyricsRomajiText(e.target.value)
                else if (lyricsTab === 'translation') setLyricsTranslationText(e.target.value)
                else {
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

          <div className="text-[12px] text-text-2 mt-2 flex-none flex items-center gap-2" style={{ lineHeight: 1.5 }}>
            {fetchedTimings && fetchedTimings.length > 0 ? (
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
            )}
          </div>
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
    </div>
  )
}
