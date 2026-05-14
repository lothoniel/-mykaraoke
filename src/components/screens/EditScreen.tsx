import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import { fetchLyrics, type LrclibResult } from '../../lib/lrclib'
import { extractVideoId } from '../../lib/youtube'
import type { Screen, Song } from '../../types'

type Props = { songId: string; navigate: (s: Screen) => void; goBack: () => void }

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
  const [lyricsTab, setLyricsTab] = useState<'original' | 'romaji' | 'translation'>('original')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'notfound' | 'confirm'>('idle')
  const [pendingResult, setPendingResult] = useState<LrclibResult | null>(null)

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
    const result = await fetchLyrics(song.title, song.artist)
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
    if (result.timings) {
      db.updateSong(songId, { timings: result.timings })
      setSong((s) => (s ? { ...s, timings: result.timings! } : s))
    }
    setFetchStatus('idle')
    setPendingResult(null)
  }

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
      lyricsRomaji: lyricsRomajiText.trim()
        ? lyricsRomajiText.split('\n').map((l) => l.trim()).filter(Boolean)
        : undefined,
      lyricsTranslation: lyricsTranslationText.trim()
        ? lyricsTranslationText.split('\n').map((l) => l.trim()).filter(Boolean)
        : undefined,
    })

    navigate({ name: 'playback', songId })
  }

  async function handleDelete() {
    await db.deleteSong(songId)
    navigate({ name: 'home' })
  }

  if (!song) return null

  const inputCls =
    'w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-coral'
  const labelCls = 'block text-xs font-semibold text-ink mb-1.5'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <button
          className="p-1.5 text-muted hover:text-ink rounded-lg hover:bg-coral-soft transition-colors"
          onClick={goBack}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-ink">Edit Song</h1>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Title <span className="text-red-400">*</span></label>
        <input type="text" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Artist / Anime</label>
        <input type="text" className={inputCls} value={artist} onChange={(e) => setArtist(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Cover Art URL</label>
        {coverArt && (
          <img
            src={coverArt}
            alt=""
            className="w-16 h-16 rounded-xl object-cover mb-2"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <input type="url" className={inputCls} value={coverArt} onChange={(e) => setCoverArt(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Spotify Link</label>
        <input type="url" className={inputCls} value={spotifyLink} onChange={(e) => setSpotifyLink(e.target.value)} />
      </div>

      <div className="mb-4">
        <label className={labelCls}>YouTube Link <span className="text-red-400">*</span></label>
        <input type="url" className={inputCls} value={youtubeLink} onChange={(e) => setYoutubeLink(e.target.value)} />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls.replace('mb-1.5', '')}>Lyrics</label>
          <button
            className="text-xs px-2.5 py-1 border border-border rounded-lg font-semibold hover:bg-coral-soft transition-colors disabled:opacity-40"
            onClick={handleFetchLyrics}
            disabled={fetchStatus === 'loading' || lyricsTab !== 'original'}
          >
            {fetchStatus === 'loading' ? 'Searching…' : 'Fetch from LRCLIB'}
          </button>
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

        {fetchStatus === 'notfound' && lyricsTab === 'original' && (
          <p className="text-xs text-muted mb-2">No lyrics found for this song.</p>
        )}
        {fetchStatus === 'confirm' && pendingResult && lyricsTab === 'original' && (
          <div className="bg-coral-soft rounded-xl p-3 mb-3 text-xs">
            <p className="font-semibold text-ink mb-1">
              {pendingResult.timings
                ? 'Synced lyrics found — will also import timing data.'
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

        <textarea
          className="w-full px-3 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-coral resize-y min-h-40 font-mono"
          placeholder={
            lyricsTab === 'original'
              ? 'Paste lyrics here, one line per lyric line…'
              : lyricsTab === 'romaji'
              ? 'Paste romanized lyrics here…'
              : 'Paste translated lyrics here…'
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
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <button
        className="w-full border border-border text-ink font-semibold py-3 rounded-xl mb-3 hover:bg-coral-soft transition-colors"
        onClick={() => navigate({ name: 'timing', songId })}
      >
        Edit Timings
      </button>

      <button
        className="w-full bg-coral text-white font-semibold py-3 rounded-xl mb-6 hover:bg-coral-dark transition-colors"
        onClick={handleSave}
      >
        Save Changes
      </button>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Danger Zone</p>
        {!confirmDelete ? (
          <button
            className="w-full bg-red-500 text-white font-semibold py-3 rounded-xl"
            onClick={() => setConfirmDelete(true)}
          >
            Delete Song
          </button>
        ) : (
          <div>
            <p className="text-sm text-red-700 mb-3">This cannot be undone. Are you sure?</p>
            <div className="flex gap-3">
              <button
                className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-xl"
                onClick={handleDelete}
              >
                Yes, delete
              </button>
              <button
                className="flex-1 border border-border text-ink font-semibold py-3 rounded-xl"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
