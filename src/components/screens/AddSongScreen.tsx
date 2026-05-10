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
  const [error, setError] = useState('')
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'notfound' | 'confirm'>('idle')
  const [pendingResult, setPendingResult] = useState<LrclibResult | null>(null)

  // Spotify-cached metadata
  const [spotifyTrackId, setSpotifyTrackId] = useState<string | undefined>()
  const [duration, setDuration] = useState<number | undefined>()
  const [releaseDate, setReleaseDate] = useState<string | undefined>()
  const [popularity, setPopularity] = useState<number | undefined>()
  const [genres, setGenres] = useState<string[] | undefined>()

  async function handleSpotifyBlur() {
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

  return (
    <div className="min-h-screen bg-canvas p-5 pb-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Song</h1>

      {/* Spotify link first — auto-fills the rest */}
      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Spotify Link
        </label>
        <input
          type="url"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          placeholder="https://open.spotify.com/track/..."
          value={spotifyLink}
          onChange={(e) => setSpotifyLink(e.target.value)}
          onBlur={handleSpotifyBlur}
        />
        {spotifyLoading && (
          <p className="text-xs text-muted mt-1">Fetching from Spotify…</p>
        )}
        {spotifyError && (
          <p className="text-xs text-red-500 mt-1">{spotifyError}</p>
        )}
        <p className="text-xs text-muted mt-1">Auto-fills title, artist, and cover art</p>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          placeholder="Song name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Artist / Anime
        </label>
        <input
          type="text"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          placeholder="Artist or anime name"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          YouTube Link <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          placeholder="https://www.youtube.com/watch?v=..."
          value={youtubeLink}
          onChange={(e) => setYoutubeLink(e.target.value)}
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Cover Art
        </label>
        {coverArt && (
          <img
            src={coverArt}
            alt=""
            className="w-24 h-24 rounded-lg object-cover mb-2"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <input
          type="url"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          placeholder="Image URL (auto-filled from Spotify)"
          value={coverArt}
          onChange={(e) => setCoverArt(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold uppercase text-muted tracking-wide">
            Lyrics <span className="text-red-400">*</span>
          </label>
          <button
            className="text-xs px-2 py-1 bg-lavender-light rounded-lg font-semibold disabled:opacity-40"
            onClick={handleFetchLyrics}
            disabled={fetchStatus === 'loading' || (!title.trim() && !artist.trim())}
          >
            {fetchStatus === 'loading' ? 'Searching…' : 'Fetch from LRCLIB'}
          </button>
        </div>

        {fetchStatus === 'notfound' && (
          <p className="text-xs text-muted mb-2">No lyrics found for this song.</p>
        )}
        {fetchStatus === 'confirm' && pendingResult && (
          <div className="bg-lavender-soft rounded-lg p-3 mb-2 text-xs">
            <p className="font-semibold mb-1">
              {pendingResult.timings ? 'Synced lyrics found — timing data will be imported too.' : 'Plain lyrics found (no timing data).'}
            </p>
            <p className="text-muted mb-2">Replace your current lyrics?</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-lavender rounded font-semibold" onClick={() => applyResult(pendingResult)}>
                Yes, replace
              </button>
              <button className="px-3 py-1 bg-white rounded font-semibold" onClick={() => { setFetchStatus('idle'); setPendingResult(null) }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <textarea
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender resize-y min-h-40 font-mono"
          placeholder="Paste lyrics here, or use Fetch from LRCLIB…"
          value={lyricsText}
          onChange={(e) => { setLyricsText(e.target.value); setFetchStatus('idle') }}
        />
        <p className="text-xs text-muted mt-1">
          {lyricsText.split('\n').filter(Boolean).length} lines
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      <button
        className="w-full bg-lavender text-ink font-semibold py-3.5 rounded-lg mb-3 active:bg-lavender-dark"
        onClick={handleSave}
      >
        Next: Set Timings →
      </button>
      <button
        className="w-full bg-lavender-light text-ink font-semibold py-3.5 rounded-lg"
        onClick={() => navigate({ name: 'home' })}
      >
        Cancel
      </button>
    </div>
  )
}
