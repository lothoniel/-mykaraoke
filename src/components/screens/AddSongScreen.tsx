import { useState } from 'react'
import * as db from '../../hooks/useDB'
import { useSpotify } from '../../hooks/useSpotify'
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
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Lyrics <span className="text-red-400">*</span>
        </label>
        <textarea
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender resize-y min-h-40 font-mono"
          placeholder="Paste lyrics here — one line per lyric…"
          value={lyricsText}
          onChange={(e) => setLyricsText(e.target.value)}
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
