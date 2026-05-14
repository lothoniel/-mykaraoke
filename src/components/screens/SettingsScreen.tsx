import { useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import { getLyricSettings, saveLyricSettings } from '../../lib/settings'
import { clearOAuthToken, getStoredOAuthToken, startOAuthFlow } from '../../lib/spotify'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-coral' : 'bg-border'}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function SettingsScreen({ navigate }: Props) {
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [spotifyToken, setSpotifyToken] = useState(() => getStoredOAuthToken())

  // UI-only preferences
  const [fontSize, setFontSize] = useState(24)
  const [highlightColor, setHighlightColor] = useState('coral')
  const [scrollSpeed, setScrollSpeed] = useState(2)
  const [lyricGlow, setLyricGlow] = useState(true)
  const [alwaysBold, setAlwaysBold] = useState(false)
  const [lyricSettings, setLyricSettings] = useState(() => getLyricSettings())
  const origLang = lyricSettings.origLang
  const romaji = lyricSettings.romaji
  const translations = lyricSettings.translations
  const highlightColors = [
    { id: 'coral', cls: 'bg-coral' },
    { id: 'teal', cls: 'bg-teal-400' },
    { id: 'purple', cls: 'bg-purple-400' },
    { id: 'blue', cls: 'bg-blue-400' },
  ]

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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('Importing…')
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-12">
      <h1 className="text-2xl font-bold text-ink mb-1">Settings</h1>
      <p className="text-sm text-muted mb-8">
        Manage your account preferences and customize your karaoke experience.
      </p>

      {/* Account Identity */}
      <section className="mb-8">
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Account Identity</p>
        <div className="border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-coral flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            C
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink">MyKaraoke User</div>
            <div className="text-sm text-muted">lothoniel@gmail.com</div>
          </div>
        </div>
      </section>

      {/* Lyric Display & Immersion */}
      <section className="mb-8">
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">
          Lyric Display &amp; Immersion
        </p>

        <div className="border border-border rounded-2xl p-5 mb-3">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 bg-coral-light rounded-lg flex items-center justify-center text-coral font-bold text-sm flex-shrink-0">
              T
            </span>
            <div>
              <div className="font-semibold text-sm text-ink">Lyrics Preferences</div>
              <div className="text-xs text-muted">Tailor how lyrics appear during your performance.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink">Font Size</span>
                <span className="text-sm font-semibold text-coral">{fontSize}px</span>
              </div>
              <input
                type="range" min={12} max={48} value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-coral"
              />
            </div>

            <div className="border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink">Auto-scroll Speed</span>
                <span className="text-xs text-muted">{['Slow', 'Normal', 'Fast'][scrollSpeed - 1]}</span>
              </div>
              <input
                type="range" min={1} max={3} value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-full accent-coral"
              />
            </div>

            <div className="border border-border rounded-xl p-3">
              <div className="text-sm text-ink mb-2">Highlight Color</div>
              <div className="flex gap-2">
                {highlightColors.map((c) => (
                  <button
                    key={c.id}
                    className={`w-8 h-8 rounded-full ${c.cls} transition-all ${
                      highlightColor === c.id ? 'ring-2 ring-offset-2 ring-ink' : ''
                    }`}
                    onClick={() => setHighlightColor(c.id)}
                  />
                ))}
              </div>
            </div>

            <div className="border border-border rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink">Enable Lyric Glow</span>
                <Toggle value={lyricGlow} onChange={setLyricGlow} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink">Always Bold</span>
                <Toggle value={alwaysBold} onChange={setAlwaysBold} />
              </div>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-coral">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Quick Access</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink">Original Language</span>
              <Toggle value={origLang} onChange={(v) => { const s = { ...lyricSettings, origLang: v }; setLyricSettings(s); saveLyricSettings(s) }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink">Romaji / Phonetic</span>
              <Toggle value={romaji} onChange={(v) => { const s = { ...lyricSettings, romaji: v }; setLyricSettings(s); saveLyricSettings(s) }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink">Show Translations</span>
              <Toggle value={translations} onChange={(v) => { const s = { ...lyricSettings, translations: v }; setLyricSettings(s); saveLyricSettings(s) }} />
            </div>
          </div>
        </div>
      </section>

      {/* Connected Apps */}
      <section className="mb-8">
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Connected Apps</p>
        <div className="border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-coral">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <div>
              <div className="font-semibold text-sm text-ink">Integrations</div>
              <div className="text-xs text-muted">Connect your favorite streaming services to import songs.</div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 11.5c2.5-1 5.5-1 8 0M7 15c3-1.5 7-1.5 10 0M9 8.5c2-0.5 5-0.5 7 0" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink">Spotify</div>
              <div className="text-xs text-muted">
                {spotifyToken ? 'Connected' : 'Not connected'}
              </div>
            </div>
            {spotifyToken ? (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  className="text-xs font-semibold text-coral px-3 py-1.5 rounded-lg hover:bg-coral-soft transition-colors"
                  onClick={() => navigate({ name: 'import' })}
                >
                  Browse Library
                </button>
                <button
                  className="text-xs font-semibold text-muted px-3 py-1.5 border border-border rounded-lg hover:bg-coral-soft transition-colors"
                  onClick={() => { clearOAuthToken(); setSpotifyToken(null) }}
                >
                  Unlink
                </button>
              </div>
            ) : (
              <button
                className="flex-shrink-0 text-xs font-semibold text-white bg-green-600 px-3 py-1.5 rounded-lg"
                onClick={startOAuthFlow}
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Platform Controls */}
      <section className="mb-8">
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Platform Controls</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-coral">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div className="font-semibold text-sm text-ink">Storage &amp; Data</div>
            </div>
            <p className="text-xs text-muted mb-4">Back up your library or clear cached data.</p>
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 bg-coral text-white text-sm font-semibold rounded-xl"
                onClick={handleExport}
              >
                Export Data
              </button>
              <button
                className="flex-1 py-2.5 border border-border text-ink text-sm font-semibold rounded-xl hover:bg-coral-soft transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                Import
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            {importStatus && <p className="text-xs text-muted mt-2 text-center">{importStatus}</p>}
          </div>

          <div className="border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              <div className="font-semibold text-sm text-ink">Danger Zone</div>
            </div>
            <p className="text-xs text-muted mb-4">Irreversible actions for your account.</p>
            {!confirmingClear ? (
              <button
                className="w-full flex items-center justify-between py-2.5 px-4 bg-red-500 text-white text-sm font-semibold rounded-xl"
                onClick={() => setConfirmingClear(true)}
              >
                Clear Entire Library
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-700">Permanently deletes all songs and timings. Are you sure?</p>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-xl" onClick={handleClearAll}>
                    Yes, delete all
                  </button>
                  <button className="flex-1 py-2.5 border border-border text-ink text-sm font-semibold rounded-xl" onClick={() => setConfirmingClear(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
