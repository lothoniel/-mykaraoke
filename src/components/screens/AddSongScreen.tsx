import { useState } from 'react'
import * as db from '../../hooks/useDB'
import { useSpotify } from '../../hooks/useSpotify'
import { fetchLyrics, type LrclibResult } from '../../lib/lrclib'
import { extractVideoId } from '../../lib/youtube'
import { generateId } from '../../lib/id'
import type { Screen } from '../../types'

type Props = { navigate: (s: Screen) => void }

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
  const [lyricsTab, setLyricsTab] = useState<'original' | 'romaji' | 'translation'>('original')
  const [error, setError] = useState('')
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'notfound' | 'confirm'>('idle')
  const [pendingResult, setPendingResult] = useState<LrclibResult | null>(null)

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
      setFetchStatus('idle')
    }
  }

  function applyResult(result: LrclibResult) {
    setLyricsText(result.lyrics.join('\n'))
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

    const lyrics = lyricsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

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
      timings: [],
      isFavorite: false,
      createdAt: new Date(),
      duration,
      releaseDate,
      popularity,
      genres,
    })

    navigate({ name: 'timing', songId: song.id })
  }

  const isSyncReady = lyricsText.trim().length > 0

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-12">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-coral text-white text-xs font-bold px-2.5 py-1 rounded-full">
          Step 1 of 2
        </span>
        <span className="text-xs text-muted">Song Import &amp; Lyrics</span>
      </div>
      <h1 className="text-2xl font-bold text-ink mb-1">Add to Library</h1>
      <p className="text-sm text-muted mb-6">
        Import tracks from your favorite platforms. We&apos;ll handle the sync; you bring the voice.
      </p>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Source Details */}
        <div className="border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-coral">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <h2 className="font-semibold text-ink">Source Details</h2>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Spotify Link <span className="font-normal text-muted">(optional — fills title, artist &amp; cover)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-coral"
                placeholder="https://open.spotify.com/track/..."
                value={spotifyLink}
                onChange={(e) => setSpotifyLink(e.target.value)}
                onBlur={handleSpotifyAutoFill}
              />
              <button
                className="flex-none flex items-center gap-1 px-3 py-2.5 border border-border rounded-lg text-xs font-semibold text-ink hover:bg-coral-soft transition-colors disabled:opacity-40"
                onClick={handleSpotifyAutoFill}
                disabled={spotifyLoading || !spotifyLink.trim()}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Auto-fill
              </button>
            </div>
            {spotifyLoading && <p className="text-xs text-muted mt-1">Fetching from Spotify…</p>}
            {spotifyError && <p className="text-xs text-red-500 mt-1">{spotifyError}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink mb-1.5">
              YouTube Link <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-coral"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeLink}
              onChange={(e) => setYoutubeLink(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Song Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-coral"
              placeholder="e.g. Midnight City"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink mb-1.5">Artist Name</label>
            <input
              type="text"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-coral"
              placeholder="e.g. M83"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
          </div>

          {coverArt && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-ink mb-1.5">Cover Art</label>
              <div className="flex items-center gap-3">
                <img
                  src={coverArt}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <input
                  type="url"
                  className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-coral"
                  value={coverArt}
                  onChange={(e) => setCoverArt(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Smart Import callout */}
          <div className="flex gap-2 bg-coral-soft border border-coral-light rounded-xl p-3 mt-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-coral flex-shrink-0 mt-0.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-ink">Smart Import Enabled</p>
              <p className="text-xs text-muted">
                Paste a Spotify link to automatically fetch artist, title, cover art, and genres.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Lyrics Editor */}
        <div className="border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-coral">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <h2 className="font-semibold text-ink">Lyrics Editor</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-2.5 py-1 border border-border rounded-lg font-semibold hover:bg-coral-soft transition-colors disabled:opacity-40"
                onClick={handleFetchLyrics}
                disabled={fetchStatus === 'loading' || (!title.trim() && !artist.trim()) || lyricsTab !== 'original'}
              >
                {fetchStatus === 'loading' ? 'Searching…' : 'Fetch from LRCLIB'}
              </button>
            </div>
          </div>

          <div className="flex gap-1 mb-3 bg-coral-soft rounded-xl p-1 w-fit">
            {(['original', 'romaji', 'translation'] as const).map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  lyricsTab === tab ? 'bg-coral text-white' : 'text-muted hover:text-ink'
                }`}
                onClick={() => setLyricsTab(tab)}
              >
                {tab === 'original' ? 'Original' : tab === 'romaji' ? 'Romaji' : 'Translation'}
              </button>
            ))}
          </div>

          <label className="text-xs font-semibold text-muted mb-2">Full Lyrics Body (Edit for clarity)</label>

          {fetchStatus === 'notfound' && (
            <p className="text-xs text-muted mb-2">No lyrics found for this song.</p>
          )}
          {fetchStatus === 'confirm' && pendingResult && (
            <div className="bg-coral-soft rounded-xl p-3 mb-3 text-xs">
              <p className="font-semibold text-ink mb-1">
                {pendingResult.timings
                  ? 'Synced lyrics found — timing data will be imported too.'
                  : 'Plain lyrics found (no timing data).'}
              </p>
              <p className="text-muted mb-2">Replace your current lyrics?</p>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 bg-coral text-white rounded-lg font-semibold"
                  onClick={() => applyResult(pendingResult)}
                >
                  Yes, replace
                </button>
                <button
                  className="px-3 py-1 border border-border rounded-lg font-semibold"
                  onClick={() => { setFetchStatus('idle'); setPendingResult(null) }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="relative flex-1">
            <textarea
              className="w-full h-full min-h-56 px-3 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-coral resize-none font-mono leading-relaxed"
              placeholder={
                lyricsTab === 'original'
                  ? 'Paste lyrics here, one line per lyric line…'
                  : lyricsTab === 'romaji'
                  ? 'Paste romanized lyrics here, one line per lyric line…'
                  : 'Paste translated lyrics here, one line per lyric line…'
              }
              value={
                lyricsTab === 'romaji' ? lyricsRomajiText
                : lyricsTab === 'translation' ? lyricsTranslationText
                : lyricsText
              }
              onChange={(e) => {
                if (lyricsTab === 'romaji') setLyricsRomajiText(e.target.value)
                else if (lyricsTab === 'translation') setLyricsTranslationText(e.target.value)
                else { setLyricsText(e.target.value); setFetchStatus('idle') }
              }}
            />
            <div className="absolute bottom-2 right-3 flex items-center gap-2 text-xs text-muted">
              <span>{lyricsText.length} characters</span>
              {isSyncReady && (
                <span className="bg-coral text-white font-semibold px-2 py-0.5 rounded-full">
                  Sync-Ready
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted mt-2">
            Tip: Add [Chorus] or [Verse] tags to help with timing synchronization later.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Footer bar */}
      <div className="flex items-center justify-between py-4 border-t border-border">
        <p className="text-xs text-muted hidden sm:block">Changes are saved locally as you type.</p>
        <div className="flex gap-3 ml-auto">
          <button
            className="px-4 py-2.5 border border-border text-ink font-semibold text-sm rounded-xl hover:bg-coral-soft transition-colors"
            onClick={() => navigate({ name: 'home' })}
          >
            Discard
          </button>
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-coral text-white font-semibold text-sm rounded-xl hover:bg-coral-dark transition-colors"
            onClick={handleSave}
          >
            Next: Set Timings
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tips row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          {
            icon: '🎵',
            title: 'Clear Audio',
            desc: 'We recommend using official instrumentals for the best vocal isolation.',
          },
          {
            icon: 'T',
            title: 'Line Breaks',
            desc: 'Keep lyrics to 1–2 lines per block to ensure they fit the karaoke screen.',
          },
          {
            icon: '✦',
            title: 'Auto-Fill',
            desc: 'Always check the auto-filled lyrics against the audio for subtle variations.',
          },
        ].map((tip) => (
          <div key={tip.title} className="flex gap-3 bg-coral-soft rounded-xl p-3">
            <span className="text-lg leading-none flex-shrink-0">{tip.icon}</span>
            <div>
              <div className="text-xs font-semibold text-ink mb-0.5">{tip.title}</div>
              <div className="text-xs text-muted">{tip.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
