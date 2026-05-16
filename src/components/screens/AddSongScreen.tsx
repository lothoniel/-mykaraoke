import { useState } from 'react'
import * as db from '../../hooks/useDB'
import { useSpotify } from '../../hooks/useSpotify'
import { fetchLyrics, type LrclibResult } from '../../lib/lrclib'
import { extractVideoId } from '../../lib/youtube'
import { generateId } from '../../lib/id'
import type { Screen, Timing } from '../../types'

type Props = { navigate: (s: Screen) => void }
type LyricsTab = 'original' | 'romaji' | 'translation'

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const inputCls =
  'w-full text-[13px] text-text outline-none'
const inputStyle = {
  padding: '10px 14px',
  borderRadius: 10,
  background: '#FAFAFE',
  border: '1px solid rgba(100, 60, 180, 0.13)',
}

function LinkIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function EditIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function StarIcon({ size = 13, color = 'currentColor', filled = false }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill={filled ? color : 'none'} stroke={color}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function ArrowRightIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
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

export default function AddSongScreen({ navigate }: Props) {
  const { fetchFromSpotifyLink, loading: spotifyLoading, error: spotifyError } = useSpotify()

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
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'notfound' | 'confirm'>('idle')
  const [pendingResult, setPendingResult] = useState<LrclibResult | null>(null)
  const [fetchedTimings, setFetchedTimings] = useState<Timing[] | null>(null)

  const [spotifyTrackId, setSpotifyTrackId] = useState<string | undefined>()
  const [duration, setDuration] = useState<number | undefined>()
  const [releaseDate, setReleaseDate] = useState<string | undefined>()
  const [popularity, setPopularity] = useState<number | undefined>()
  const [genres, setGenres] = useState<string[] | undefined>()

  async function handleSpotifyAutoFill() {
    if (!spotifyLink.trim()) return
    const result = await fetchFromSpotifyLink(spotifyLink)
    if (!result) return
    if (!title) setTitle(result.title ?? '')
    if (!artist) setArtist(result.artist ?? '')
    if (!coverArt && result.coverArt) setCoverArt(result.coverArt)
    setSpotifyTrackId(result.spotifyTrackId)
    setDuration(result.duration)
    setReleaseDate(result.releaseDate)
    setPopularity(result.popularity)
    setGenres(result.genres)
  }

  async function handleFetchLyrics() {
    if (!title.trim() && !artist.trim()) return
    setFetchStatus('loading')
    const result = await fetchLyrics(title, artist, duration ? duration / 1000 : undefined)
    if (!result) { setFetchStatus('notfound'); return }
    if (lyricsText.trim()) {
      setPendingResult(result)
      setFetchStatus('confirm')
    } else {
      setLyricsText(result.lyrics.join('\n'))
      setFetchedTimings(result.timings)
      setFetchStatus('idle')
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
    if (!lyricsText.trim()) return setError('Lyrics are required')
    const videoId = extractVideoId(youtubeLink)
    if (!videoId) return setError('Invalid YouTube link')

    const lyrics = lyricsText.split('\n').map((l) => l.trim()).filter(Boolean)
    // Only carry over fetched timings if the user hasn't edited the lyrics text
    // after the fetch (we clear fetchedTimings on Original-tab onChange below).
    // Also bound lineIndex to the final lyrics length in case of edge mismatches.
    const timings: Timing[] = fetchedTimings
      ? fetchedTimings.filter((t) => t.lineIndex < lyrics.length)
      : []

    const song = await db.addSong({
      id: generateId(),
      title: title.trim(),
      artist: artist.trim(),
      spotifyLink: spotifyLink.trim() || undefined,
      spotifyTrackId,
      youtubeLink: youtubeLink.trim(),
      coverArt: coverArt.trim() || undefined,
      lyrics,
      lyricsRomaji: lyricsRomajiText.trim()
        ? lyricsRomajiText.split('\n').map((l) => l.trim()).filter(Boolean)
        : undefined,
      lyricsTranslation: lyricsTranslationText.trim()
        ? lyricsTranslationText.split('\n').map((l) => l.trim()).filter(Boolean)
        : undefined,
      timings,
      isFavorite: false,
      createdAt: new Date(),
      duration,
      releaseDate,
      popularity,
      genres,
    })

    navigate({ name: 'timing', songId: song.id })
  }

  const activeLyricsValue =
    lyricsTab === 'romaji' ? lyricsRomajiText
    : lyricsTab === 'translation' ? lyricsTranslationText
    : lyricsText

  const charCount = activeLyricsValue.length

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Step header */}
      <div className="flex-none border-b border-border" style={{ padding: '15px 28px 13px' }}>
        <div className="flex items-center gap-2.5 mb-2">
          <span
            className="text-[12px] font-extrabold"
            style={{ padding: '4px 13px', borderRadius: 20, background: 'var(--accent)', color: '#1C0840' }}
          >
            Step 1 of 2
          </span>
          <span className="text-[13px] text-text-2">Song Import &amp; Lyrics</span>
        </div>
        <div
          className="text-[22px] font-extrabold text-text"
          style={{ letterSpacing: '-0.4px' }}
        >
          Add to Library
        </div>
        <div className="text-[13px] text-text-2 mt-0.5">
          Import tracks from your favorite platforms. We&apos;ll handle the sync; you bring the voice.
        </div>
      </div>

      {/* 2-col body */}
      <div
        className="flex-1 grid overflow-hidden min-h-0"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 14, padding: '14px 22px' }}
      >
        {/* Left card: Source Details */}
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

          <FormField
            label="Spotify Link"
            optional="(optional — fills title, artist & cover)"
            rightSlot={
              <button
                onClick={handleSpotifyAutoFill}
                disabled={spotifyLoading || !spotifyLink.trim()}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-text-2 disabled:opacity-40 flex-none"
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(100, 60, 180, 0.09)',
                }}
              >
                <StarIcon size={13} color="currentColor" />
                Auto-fill
              </button>
            }
          >
            <input
              type="url"
              value={spotifyLink}
              onChange={(e) => setSpotifyLink(e.target.value)}
              onBlur={handleSpotifyAutoFill}
              placeholder="https://open.spotify.com/track/..."
              className={inputCls}
              style={inputStyle}
            />
          </FormField>
          {spotifyLoading && <p className="text-[11px] text-text-2 -mt-2 mb-2">Fetching from Spotify…</p>}
          {spotifyError && <p className="text-[11px] text-danger -mt-2 mb-2">{spotifyError}</p>}

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
              placeholder="e.g. Midnight City"
              className={inputCls}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Artist Name">
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. M83"
              className={inputCls}
              style={inputStyle}
            />
          </FormField>

          {coverArt && (
            <div className="mb-3.5 flex items-center gap-3">
              <img
                src={coverArt}
                alt=""
                className="w-12 h-12 object-cover"
                style={{ borderRadius: 8 }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className="text-[12px] text-text-2 truncate">{coverArt}</span>
            </div>
          )}

          {/* Smart Import banner */}
          <div
            className="flex gap-2.5 items-start mt-auto flex-none"
            style={{
              padding: '12px 14px',
              borderRadius: 11,
              background: 'rgba(200, 241, 53, 0.10)',
              border: '1px solid rgba(200, 241, 53, 0.40)',
            }}
          >
            <span style={{ color: 'var(--accent-strong)' }} className="flex-none mt-0.5">
              <StarIcon size={16} color="currentColor" filled />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-text">Smart Import Enabled</div>
              <div className="text-[12px] text-text-2 mt-0.5" style={{ lineHeight: 1.5 }}>
                Paste a Spotify link to automatically fetch artist, title, cover art, and genres.
              </div>
            </div>
          </div>
        </div>

        {/* Right card: Lyrics Editor */}
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
                <EditIcon size={15} color="currentColor" />
              </span>
              <span className="text-[15px] font-bold text-text">Lyrics Editor</span>
            </div>
            <button
              onClick={handleFetchLyrics}
              disabled={fetchStatus === 'loading' || (!title.trim() && !artist.trim()) || lyricsTab !== 'original'}
              className="text-[13px] font-semibold underline disabled:opacity-40"
              style={{ color: 'var(--accent-strong)', textUnderlineOffset: 3 }}
            >
              {fetchStatus === 'loading' ? 'Searching…' : 'Fetch from LRCLIB'}
            </button>
          </div>

          {/* Tabs */}
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

          <div className="text-[13px] font-bold text-text mb-2 flex-none">
            Full Lyrics Body <span className="font-normal text-text-2">(Edit for clarity)</span>
          </div>

          {fetchStatus === 'notfound' && (
            <p className="text-[12px] text-text-2 mb-2 flex-none">No lyrics found for this song.</p>
          )}
          {fetchStatus === 'confirm' && pendingResult && (
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

          {/* Textarea */}
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
                  // Manual edits invalidate fetched timings — line indices would drift.
                  if (fetchedTimings) setFetchedTimings(null)
                }
              }}
              placeholder={
                lyricsTab === 'original'
                  ? 'Paste lyrics here, one line per lyric line…'
                  : lyricsTab === 'romaji'
                    ? 'Paste romanized lyrics here, one line per lyric line…'
                    : 'Paste translated lyrics here, one line per lyric line…'
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
                ✓ {fetchedTimings.length} synced timings — saved with the song
              </span>
            ) : (
              <span>Tip: Add [Chorus] or [Verse] tags to help with timing synchronization later.</span>
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
          <span className="text-[12px] text-text-2 hidden sm:block">Changes are saved locally as you type.</span>
          {error && <span className="text-[12px] text-danger mt-0.5">{error}</span>}
        </div>
        <div className="flex gap-2.5 ml-auto">
          <button
            onClick={() => navigate({ name: 'home' })}
            className="text-[14px] font-semibold text-text"
            style={{
              padding: '9px 20px',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid rgba(100, 60, 180, 0.09)',
            }}
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 text-[14px] font-bold"
            style={{
              padding: '9px 22px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#1C0840',
            }}
          >
            Next: Set Timings
            <ArrowRightIcon size={14} color="#1C0840" />
          </button>
        </div>
      </div>
    </div>
  )
}
