import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { extractVideoId } from '../../lib/youtube'
import type { Screen, Song } from '../../types'

type Props = { songId: string; navigate: (s: Screen) => void }

export default function EditScreen({ songId, navigate }: Props) {
  const [song, setSong] = useState<Song | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [spotifyLink, setSpotifyLink] = useState('')
  const [youtubeLink, setYoutubeLink] = useState('')
  const [coverArt, setCoverArt] = useState('')
  const [lyricsText, setLyricsText] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

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
    })
  }, [songId])

  async function handleSave() {
    setError('')
    if (!title.trim()) return setError('Title is required')
    if (!youtubeLink.trim()) return setError('YouTube link is required')
    const videoId = extractVideoId(youtubeLink)
    if (!videoId) return setError('Invalid YouTube link')

    const lyrics = lyricsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    await db.updateSong(songId, {
      title: title.trim(),
      artist: artist.trim(),
      spotifyLink: spotifyLink.trim() || undefined,
      youtubeLink: youtubeLink.trim(),
      coverArt: coverArt.trim() || undefined,
      lyrics,
    })

    navigate({ name: 'playback', songId })
  }

  async function handleDelete() {
    await db.deleteSong(songId)
    navigate({ name: 'home' })
  }

  if (!song) return null

  return (
    <div className="min-h-screen bg-canvas p-5 pb-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Song</h1>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
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
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Cover Art URL
        </label>
        {coverArt && (
          <img
            src={coverArt}
            alt=""
            className="w-20 h-20 rounded-lg object-cover mb-2"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <input
          type="url"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          value={coverArt}
          onChange={(e) => setCoverArt(e.target.value)}
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Spotify Link
        </label>
        <input
          type="url"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          value={spotifyLink}
          onChange={(e) => setSpotifyLink(e.target.value)}
        />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          YouTube Link <span className="text-red-400">*</span>
        </label>
        <input
          type="url"
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender"
          value={youtubeLink}
          onChange={(e) => setYoutubeLink(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase text-muted mb-2 tracking-wide">
          Lyrics
        </label>
        <textarea
          className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender resize-y min-h-40 font-mono"
          value={lyricsText}
          onChange={(e) => setLyricsText(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        className="w-full bg-lavender-light text-ink font-semibold py-3.5 rounded-lg mb-3"
        onClick={() => navigate({ name: 'timing', songId })}
      >
        🎵 Edit Timings
      </button>

      <button
        className="w-full bg-lavender text-ink font-semibold py-3.5 rounded-lg mb-3 active:bg-lavender-dark"
        onClick={handleSave}
      >
        Save Changes
      </button>

      {/* Danger zone */}
      <div className="bg-red-50 border border-red-100 p-5 rounded-xl mt-6">
        <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Danger Zone</p>
        {!confirmDelete ? (
          <button
            className="w-full bg-red-500 text-white font-semibold py-3 rounded-lg"
            onClick={() => setConfirmDelete(true)}
          >
            🗑 Delete Song
          </button>
        ) : (
          <div>
            <p className="text-sm text-red-700 mb-3">Are you sure? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg"
                onClick={handleDelete}
              >
                Yes, delete
              </button>
              <button
                className="flex-1 bg-gray-200 text-ink font-semibold py-3 rounded-lg"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        className="w-full bg-lavender-light text-ink font-semibold py-3.5 rounded-lg mt-4"
        onClick={() => navigate({ name: 'playback', songId: song.id })}
      >
        ← Cancel
      </button>
    </div>
  )
}
