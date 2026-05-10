import { useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import { clearOAuthToken, getStoredOAuthToken, startOAuthFlow } from '../../lib/spotify'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }

export default function SettingsScreen({ navigate }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [spotifyToken, setSpotifyToken] = useState(() => getStoredOAuthToken())

  async function handleExport() {
    const songs = await db.getAllSongs()
    const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), songs }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mykaraoke-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSpotifyLogin() {
    startOAuthFlow()
  }

  function handleSpotifyLogout() {
    clearOAuthToken()
    setSpotifyToken(null)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('Importing...')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as { songs?: Song[] } | Song[]
      const songs: Song[] = Array.isArray(parsed) ? parsed : (parsed.songs ?? [])
      const added = await db.importSongs(songs, 'merge')
      setImportStatus(`Imported ${added} new song${added !== 1 ? 's' : ''}`)
    } catch {
      setImportStatus('Import failed: invalid file')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleClearAll() {
    await db.clearAllSongs()
    navigate({ name: 'home' })
  }

  return (
    <div className="min-h-screen bg-canvas p-5 pb-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate({ name: 'home' })}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* App info */}
      <div className="bg-lavender-soft rounded-xl p-5 mb-8">
        <div className="text-lg font-bold mb-1">MyKaraoke</div>
        <div className="text-sm text-muted">Your personal anime karaoke library</div>
      </div>

      {/* Spotify */}
      <div className="bg-lavender-soft rounded-xl p-5 mb-8">
        <div className="text-xs font-bold text-muted uppercase tracking-wide mb-4">Spotify Account</div>
        {spotifyToken ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">Connected</span>
            </div>
            <button
              className="w-full py-3 bg-lavender text-ink font-semibold rounded-lg text-sm mb-2"
              onClick={() => navigate({ name: 'import' })}
            >
              Browse My Library
            </button>
            <button
              className="w-full py-2 text-sm text-muted underline"
              onClick={handleSpotifyLogout}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted mb-4">
              Connect your Spotify account to import songs from your playlists and liked songs.
            </p>
            <button
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg text-sm"
              onClick={handleSpotifyLogin}
            >
              Connect with Spotify
            </button>
          </div>
        )}
      </div>

      {/* Data & Backup */}
      <div className="bg-lavender-soft rounded-xl p-5 mb-8">
        <div className="text-xs font-bold text-muted uppercase tracking-wide mb-4">Data & Backup</div>
        <button
          className="w-full py-3 bg-lavender text-ink font-semibold rounded-lg text-sm mb-3"
          onClick={handleExport}
        >
          Export All Songs
        </button>
        <button
          className="w-full py-3 bg-lavender text-ink font-semibold rounded-lg text-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Import from File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        {importStatus && (
          <p className="text-sm text-muted mt-3 text-center">{importStatus}</p>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Danger Zone</div>
        {!confirming ? (
          <button
            className="w-full py-3 bg-red-500 text-white font-semibold rounded-lg text-sm"
            onClick={() => setConfirming(true)}
          >
            🗑 Clear All Songs
          </button>
        ) : (
          <div>
            <p className="text-sm text-red-700 mb-3">
              This will permanently delete all songs and timings. Are you sure?
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-lg text-sm"
                onClick={handleClearAll}
              >
                Yes, delete everything
              </button>
              <button
                className="flex-1 py-3 bg-lavender-light text-ink font-semibold rounded-lg text-sm"
                onClick={() => setConfirming(false)}
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
