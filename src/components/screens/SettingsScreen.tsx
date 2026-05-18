import { useEffect, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import {
  applyAccent,
  getLyricSettings,
  getProfile,
  getTheme,
  saveLyricSettings,
  saveProfile,
  saveTheme,
  type LyricSettings,
} from '../../lib/settings'
import { clearOAuthToken, getStoredOAuthToken, startOAuthFlow } from '../../lib/spotify'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }

const strokeAttrs = {
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ACCENT_SWATCHES: { id: string; bg: string; strong: string; label: string }[] = [
  { id: 'lime', bg: '#C8F135', strong: '#5A7A0F', label: 'Lime' },
  { id: 'magenta', bg: '#EC4899', strong: '#9F2566', label: 'Magenta' },
  { id: 'sky', bg: '#38BDF8', strong: '#0369A1', label: 'Sky' },
  { id: 'mint', bg: '#34D399', strong: '#047857', label: 'Mint' },
  { id: 'amber', bg: '#FBBF24', strong: '#92400E', label: 'Amber' },
]

const HIGHLIGHT_SWATCHES = ['#C8F135', '#A78BFA', '#34D399', '#F472B6']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="relative flex-none"
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? 'var(--accent)' : '#EBE4FF',
        transition: 'background-color 120ms',
      }}
    >
      <span
        className="absolute bg-white shadow-sm"
        style={{
          top: 2,
          left: value ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          transition: 'left 120ms',
        }}
      />
    </button>
  )
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="relative" style={{ height: 20 }}>
      <div
        className="absolute left-0 right-0 top-1/2"
        style={{
          height: 4,
          borderRadius: 4,
          background: '#EBE4FF',
          transform: 'translateY(-50%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            borderRadius: 4,
            background: 'var(--accent)',
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
      />
      <div
        style={{
          position: 'absolute',
          left: `calc(${pct}% - 7px)`,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 0 3px #fff, 0 0 0 5px rgba(200, 241, 53, 0.33)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-text-2 font-bold uppercase"
      style={{ fontSize: 11, letterSpacing: 1.5, paddingTop: 20, paddingBottom: 10 }}
    >
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid rgba(100, 60, 180, 0.09)',
        padding: '16px 20px',
        boxShadow: '0 2px 10px rgba(100, 60, 180, 0.05)',
      }}
    >
      {children}
    </div>
  )
}

function SpotifyIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 11.5c2.5-1 5.5-1 8 0M7 15c3-1.5 7-1.5 10 0M9 8.5c2-0.5 5-0.5 7 0" />
    </svg>
  )
}

function TrashIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function LibraryIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function MusicIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

function PaletteIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...strokeAttrs} fill="none" stroke={color}>
      <circle cx="13.5" cy="6.5" r="0.5" fill={color} />
      <circle cx="17.5" cy="10.5" r="0.5" fill={color} />
      <circle cx="8.5" cy="7.5" r="0.5" fill={color} />
      <circle cx="6.5" cy="12.5" r="0.5" fill={color} />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  )
}

export default function SettingsScreen({ navigate }: Props) {
  const [profile, setProfile] = useState(() => getProfile())
  const [theme, setThemeState] = useState(() => getTheme())
  const [lyricSettings, setLyricSettings] = useState<LyricSettings>(() => getLyricSettings())
  const [spotifyToken, setSpotifyToken] = useState(() => getStoredOAuthToken())
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    applyAccent(theme)
  }, [theme])

  function updateLyrics(patch: Partial<LyricSettings>) {
    const next = { ...lyricSettings, ...patch }
    setLyricSettings(next)
    saveLyricSettings(next)
  }

  function updateProfile(patch: Partial<typeof profile>) {
    const next = { ...profile, ...patch }
    setProfile(next)
    saveProfile(next)
  }

  function pickAccent(swatch: typeof ACCENT_SWATCHES[number]) {
    const next = { accentColor: swatch.bg, accentStrongColor: swatch.strong }
    setThemeState(next)
    saveTheme(next)
    applyAccent(next)
  }

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
    setConfirmingClear(false)
    navigate({ name: 'home' })
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || 'M'
  const scrollSpeedLabel =
    lyricSettings.scrollSpeed < 33 ? 'Slow' : lyricSettings.scrollSpeed > 66 ? 'Fast' : 'Normal'

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="flex-none px-7 py-4 border-b border-border">
        <div
          className="text-[22px] font-extrabold text-text leading-tight"
          style={{ letterSpacing: '-0.4px' }}
        >
          Settings
        </div>
        <div className="text-[13px] text-text-2 mt-0.5">
          Manage your account preferences and customize your karaoke experience.
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '0 28px 28px' }}>
        {/* ACCOUNT IDENTITY */}
        <SectionLabel>Account Identity</SectionLabel>
        <Card>
          <div className="flex items-center gap-4">
            <div
              className="flex-none flex items-center justify-center text-[20px] font-extrabold"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#1C0840',
              }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0 grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <input
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="Name"
                className="text-[15px] font-bold text-text outline-none"
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: '#FAFAFE',
                  border: '1px solid rgba(100, 60, 180, 0.13)',
                }}
              />
              <input
                value={profile.email}
                onChange={(e) => updateProfile({ email: e.target.value })}
                placeholder="Email"
                type="email"
                className="text-[13px] text-text-2 outline-none"
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: '#FAFAFE',
                  border: '1px solid rgba(100, 60, 180, 0.13)',
                }}
              />
            </div>
          </div>
        </Card>

        {/* APPEARANCE */}
        <SectionLabel>Appearance</SectionLabel>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: 'var(--accent-strong)' }}>
              <PaletteIcon size={16} color="currentColor" />
            </span>
            <div>
              <div className="text-[15px] font-bold text-text">Accent Color</div>
              <div className="text-[12px] text-text-2">Pick the brand color used across the app.</div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {ACCENT_SWATCHES.map((s) => {
              const selected = theme.accentColor.toUpperCase() === s.bg.toUpperCase()
              return (
                <button
                  key={s.id}
                  onClick={() => pickAccent(s)}
                  aria-label={`Use ${s.label} accent`}
                  className="flex-none"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: s.bg,
                    boxShadow: selected
                      ? `0 0 0 2px #fff, 0 0 0 4px ${s.strong}`
                      : 'none',
                  }}
                />
              )
            })}
          </div>
        </Card>

        {/* LYRIC DISPLAY & IMMERSION */}
        <SectionLabel>Lyric Display &amp; Immersion</SectionLabel>
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(100, 60, 180, 0.09)' }}>
            <span
              className="flex items-center justify-center flex-none font-extrabold"
              style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200, 241, 53, 0.18)', color: 'var(--accent-strong)' }}
            >
              T
            </span>
            <div>
              <div className="text-[15px] font-bold text-text">Lyrics Preferences</div>
              <div className="text-[12px] text-text-2">Tailor how lyrics appear during your performance.</div>
            </div>
          </div>

          {/* Sliders */}
          <div className="grid gap-6 mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-text">Font Size</span>
                <span className="text-[12px] font-bold" style={{ color: 'var(--accent-strong)' }}>
                  {lyricSettings.fontSize}px
                </span>
              </div>
              <Slider
                value={lyricSettings.fontSize}
                min={14}
                max={40}
                onChange={(v) => updateLyrics({ fontSize: v })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-text">Auto-scroll Speed</span>
                <span className="text-[12px] text-text-2">{scrollSpeedLabel}</span>
              </div>
              <Slider
                value={lyricSettings.scrollSpeed}
                min={0}
                max={100}
                onChange={(v) => updateLyrics({ scrollSpeed: v })}
              />
            </div>
          </div>

          {/* Highlight color + toggles */}
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="text-[13px] font-semibold text-text mb-2">Highlight Color</div>
              <div className="flex gap-2.5">
                {HIGHLIGHT_SWATCHES.map((c) => {
                  const selected = lyricSettings.hlColor.toUpperCase() === c.toUpperCase()
                  return (
                    <button
                      key={c}
                      onClick={() => updateLyrics({ hlColor: c })}
                      aria-label={`Highlight ${c}`}
                      className="flex-none"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: c,
                        boxShadow: selected ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                      }}
                    />
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text">Enable Lyric Glow</span>
                <Toggle value={lyricSettings.glow} onChange={(v) => updateLyrics({ glow: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-text">Always Bold</span>
                <Toggle value={lyricSettings.bold} onChange={(v) => updateLyrics({ bold: v })} />
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Access (lyric version toggles — wired) */}
        <div style={{ height: 12 }} />
        <Card>
          <div className="flex items-center gap-1.5 mb-3">
            <span style={{ color: 'var(--accent-strong)' }}>⚡</span>
            <span
              className="text-[11px] font-extrabold uppercase"
              style={{ letterSpacing: 1.5, color: 'var(--accent-strong)' }}
            >
              Quick Access
            </span>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div className="flex items-center gap-3">
              <Toggle value={lyricSettings.origLang} onChange={(v) => updateLyrics({ origLang: v })} />
              <span className="text-[13px] font-semibold text-text">Original Language</span>
            </div>
            <div className="flex items-center gap-3">
              <Toggle value={lyricSettings.romaji} onChange={(v) => updateLyrics({ romaji: v })} />
              <span className="text-[13px] font-semibold text-text">Romanized Phonetic</span>
            </div>
            <div className="flex items-center gap-3">
              <Toggle value={lyricSettings.translations} onChange={(v) => updateLyrics({ translations: v })} />
              <span className="text-[13px] font-semibold text-text">Show Translations</span>
            </div>
          </div>
        </Card>

        {/* CONNECTED APPS */}
        <SectionLabel>Connected Apps</SectionLabel>
        <Card>
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(100, 60, 180, 0.09)' }}>
            <span
              className="flex items-center justify-center flex-none"
              style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200, 241, 53, 0.18)', color: 'var(--accent-strong)' }}
            >
              <MusicIcon size={16} color="currentColor" />
            </span>
            <div>
              <div className="text-[15px] font-bold text-text">Integrations</div>
              <div className="text-[12px] text-text-2">Connect streaming services to import songs.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex-none flex items-center justify-center"
              style={{ width: 36, height: 36, borderRadius: '50%', background: '#16A34A' }}
            >
              <SpotifyIcon size={18} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-text">Spotify</div>
              <div className="text-[12px] font-semibold" style={{ color: spotifyToken ? '#16A34A' : '#7060A0' }}>
                {spotifyToken ? 'Connected' : 'Not connected'}
              </div>
            </div>
            {spotifyToken ? (
              <div className="flex gap-2 flex-none">
                <button
                  onClick={() => navigate({ name: 'import' })}
                  className="text-[12px] font-semibold"
                  style={{ color: 'var(--accent-strong)', padding: '6px 10px' }}
                >
                  Browse Library
                </button>
                <button
                  onClick={() => { clearOAuthToken(); setSpotifyToken(null) }}
                  className="text-[12px] font-semibold text-text-2"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 9,
                    background: '#FFFFFF',
                    border: '1px solid rgba(100, 60, 180, 0.09)',
                  }}
                >
                  Unlink
                </button>
              </div>
            ) : (
              <button
                onClick={startOAuthFlow}
                className="flex-none text-[12px] font-bold text-white"
                style={{ padding: '7px 14px', borderRadius: 9, background: '#16A34A' }}
              >
                Connect
              </button>
            )}
          </div>
        </Card>

        {/* PLATFORM CONTROLS */}
        <SectionLabel>Platform Controls</SectionLabel>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: 'var(--accent-strong)' }}>
                <LibraryIcon size={16} color="currentColor" />
              </span>
              <div className="text-[15px] font-bold text-text">Storage &amp; Data</div>
            </div>
            <p className="text-[12px] text-text-2 mb-3">Back up your library to a JSON file or restore from one.</p>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex-1 text-[13px] font-bold"
                style={{ padding: '9px', borderRadius: 10, background: 'var(--accent)', color: '#1C0840' }}
              >
                Export Data
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 text-[13px] font-semibold text-text"
                style={{
                  padding: '9px',
                  borderRadius: 10,
                  background: '#FFFFFF',
                  border: '1px solid rgba(100, 60, 180, 0.09)',
                }}
              >
                Import
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            {importStatus && <p className="text-[12px] text-text-2 mt-2 text-center">{importStatus}</p>}
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: '#EF4444' }}>
                <TrashIcon size={16} color="currentColor" />
              </span>
              <div className="text-[15px] font-bold text-text">Danger Zone</div>
            </div>
            <p className="text-[12px] text-text-2 mb-3">Permanently delete every song, lyric, and timing.</p>
            {!confirmingClear ? (
              <button
                onClick={() => setConfirmingClear(true)}
                className="w-full flex items-center justify-between text-[13px] font-bold text-white"
                style={{ padding: '9px 14px', borderRadius: 10, background: '#EF4444' }}
              >
                Clear Entire Library
                <TrashIcon size={14} color="#fff" />
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[12px] text-danger">This cannot be undone. Are you sure?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearAll}
                    className="flex-1 text-[13px] font-bold text-white"
                    style={{ padding: '9px', borderRadius: 10, background: '#EF4444' }}
                  >
                    Yes, delete all
                  </button>
                  <button
                    onClick={() => setConfirmingClear(false)}
                    className="flex-1 text-[13px] font-semibold text-text"
                    style={{
                      padding: '9px',
                      borderRadius: 10,
                      background: '#FFFFFF',
                      border: '1px solid rgba(100, 60, 180, 0.09)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-text-2 mt-8">
          MyKaraoke v1.0.0 · Built with ♥ for anime fans
        </div>
      </div>
    </div>
  )
}
