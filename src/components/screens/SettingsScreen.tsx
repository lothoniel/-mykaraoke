import { useEffect, useRef, useState } from 'react'
import * as db from '../../hooks/useDB'
import {
  addCustomSwatch,
  applyAccent,
  DEFAULT_LYRIC_SETTINGS,
  DEFAULT_THEME,
  getCustomSwatches,
  getLyricSettings,
  getProfile,
  getTheme,
  removeCustomSwatch,
  saveLyricSettings,
  saveProfile,
  saveTheme,
  type CustomSwatches,
  type LyricSettings,
  type LyricVersion,
  type SwatchPurpose,
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

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m) return [0, 0, 0]
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0').toUpperCase()
  return `#${to(r)}${to(g)}${to(b)}`
}

function deriveStrong(hex: string): string {
  const [h, s] = hexToHsl(hex)
  return hslToHex(h, Math.min(1, s + 0.1), 0.25)
}

const VERSION_LABEL: Record<LyricVersion, string> = {
  original: 'Original',
  romanized: 'Romanized',
  translation: 'Translation',
}

function VersionPicker({
  value,
  onChange,
  disabledValue,
}: {
  value: LyricVersion
  onChange: (v: LyricVersion) => void
  disabledValue?: LyricVersion
}) {
  const versions: LyricVersion[] = ['original', 'romanized', 'translation']
  return (
    <div className="flex gap-0.5" style={{ background: '#EBE4FF', borderRadius: 9, padding: 2 }}>
      {versions.map((v) => {
        const active = value === v
        const disabled = disabledValue === v
        return (
          <button
            key={v}
            onClick={() => !disabled && onChange(v)}
            disabled={disabled}
            className="text-[12px]"
            style={{
              padding: '4px 12px',
              borderRadius: 7,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#1C0840' : disabled ? '#B5A8D9' : '#7060A0',
              fontWeight: active ? 700 : 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {VERSION_LABEL[v]}
          </button>
        )
      })}
    </div>
  )
}

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

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div
      className="text-text-2 font-bold uppercase flex items-center justify-between gap-2"
      style={{ fontSize: 11, letterSpacing: 1.5, paddingTop: 20, paddingBottom: 10 }}
    >
      <span>{children}</span>
      {action}
    </div>
  )
}

function ResetLink({ onClick, label = 'Reset section' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="font-semibold normal-case"
      style={{ fontSize: 11, letterSpacing: 0, color: '#7060A0' }}
    >
      {label}
    </button>
  )
}

function isValidHex(s: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(s)
}

function ColorPopover({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (hex: string) => void
  onCancel: () => void
}) {
  const [hex, setHex] = useState(initial.toUpperCase())
  const [hexInput, setHexInput] = useState(initial.toUpperCase())
  const [h, s, l] = hexToHsl(hex)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onCancel])

  function updateHSL(next: { h?: number; s?: number; l?: number }) {
    const newHex = hslToHex(next.h ?? h, next.s ?? s, next.l ?? l)
    setHex(newHex)
    setHexInput(newHex)
  }

  return (
    <div
      ref={ref}
      className="absolute z-10"
      style={{
        top: '100%',
        left: 0,
        marginTop: 8,
        width: 260,
        padding: 14,
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 8px 24px rgba(20, 10, 50, 0.18)',
        border: '1px solid rgba(100, 60, 180, 0.13)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: hex, border: '1px solid rgba(100, 60, 180, 0.13)' }} />
        <div className="flex-1">
          <input
            value={hexInput}
            onChange={(e) => {
              const v = e.target.value
              setHexInput(v)
              if (isValidHex(v)) setHex(v.toUpperCase())
            }}
            className="text-[13px] font-mono outline-none w-full"
            style={{ padding: '6px 10px', borderRadius: 8, background: '#FAFAFE', border: '1px solid rgba(100, 60, 180, 0.13)' }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-3">
        <div>
          <div className="text-[11px] font-semibold text-text-2 mb-1">Hue</div>
          <input
            type="range" min={0} max={360} value={Math.round(h)}
            onChange={(e) => updateHSL({ h: Number(e.target.value) })}
            className="w-full"
            style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)', borderRadius: 4, height: 8, appearance: 'none' }}
          />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-text-2 mb-1">Saturation</div>
          <input
            type="range" min={0} max={100} value={Math.round(s * 100)}
            onChange={(e) => updateHSL({ s: Number(e.target.value) / 100 })}
            className="w-full"
          />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-text-2 mb-1">Lightness</div>
          <input
            type="range" min={0} max={100} value={Math.round(l * 100)}
            onChange={(e) => updateHSL({ l: Number(e.target.value) / 100 })}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-[12px] font-semibold"
          style={{ padding: '6px 12px', borderRadius: 8, background: '#FAFAFE', color: '#7060A0', border: '1px solid rgba(100, 60, 180, 0.13)' }}
        >
          Cancel
        </button>
        <button
          onClick={() => isValidHex(hex) && onSave(hex)}
          className="text-[12px] font-semibold"
          style={{ padding: '6px 14px', borderRadius: 8, background: 'var(--accent)', color: '#1C0840' }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

function ColorRow({
  value,
  presets,
  purpose,
  swatches,
  onChange,
  onSwatchesChange,
  size = 32,
}: {
  value: string
  presets: string[]
  purpose: SwatchPurpose
  swatches: CustomSwatches
  onChange: (hex: string) => void
  onSwatchesChange: (s: CustomSwatches) => void
  size?: number
}) {
  const [open, setOpen] = useState(false)
  const [hoveredCustom, setHoveredCustom] = useState<string | null>(null)
  const norm = value.toUpperCase()
  const customs = swatches[purpose]

  function isSelected(c: string) {
    return c.toUpperCase() === norm
  }

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      {presets.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c.toUpperCase())}
          aria-label={`Color ${c}`}
          className="flex-none"
          style={{
            width: size, height: size, borderRadius: '50%',
            background: c,
            boxShadow: isSelected(c) ? `0 0 0 2px #fff, 0 0 0 3px ${c}` : 'none',
          }}
        />
      ))}
      {customs.length > 0 && (
        <span style={{ width: 1, height: size * 0.7, background: 'rgba(100, 60, 180, 0.13)', margin: '0 2px' }} />
      )}
      {customs.map((c) => (
        <div key={c} className="relative" onMouseEnter={() => setHoveredCustom(c)} onMouseLeave={() => setHoveredCustom(null)}>
          <button
            onClick={() => onChange(c)}
            aria-label={`Saved color ${c}`}
            className="flex-none"
            style={{
              width: size, height: size, borderRadius: '50%',
              background: c,
              boxShadow: isSelected(c) ? `0 0 0 2px #fff, 0 0 0 3px ${c}` : 'none',
            }}
          />
          {hoveredCustom === c && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSwatchesChange(removeCustomSwatch(purpose, c))
                setHoveredCustom(null)
              }}
              aria-label="Remove swatch"
              className="absolute flex items-center justify-center"
              style={{
                top: -4, right: -4, width: 14, height: 14, borderRadius: '50%',
                background: '#1C0840', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1,
                border: '1px solid #fff',
              }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Custom color"
        className="flex-none flex items-center justify-center"
        style={{
          width: size, height: size, borderRadius: '50%',
          background: '#FAFAFE',
          color: '#7060A0',
          fontSize: size * 0.55,
          fontWeight: 700,
          border: '1.5px dashed rgba(100, 60, 180, 0.35)',
          lineHeight: 1,
        }}
      >
        +
      </button>
      {open && (
        <ColorPopover
          initial={value}
          onCancel={() => setOpen(false)}
          onSave={(hex) => {
            onChange(hex)
            onSwatchesChange(addCustomSwatch(purpose, hex))
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function SubCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: '#FAFAFE',
        border: '1px solid rgba(100, 60, 180, 0.09)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-extrabold uppercase"
          style={{ letterSpacing: 1.2, color: 'var(--accent-strong)' }}
        >
          {title}
        </span>
        {action}
      </div>
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
  const [customSwatches, setCustomSwatches] = useState<CustomSwatches>(() => getCustomSwatches())
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

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

  function resetAppearance() {
    if (!window.confirm('Reset Appearance to defaults?')) return
    setThemeState(DEFAULT_THEME)
    saveTheme(DEFAULT_THEME)
    applyAccent(DEFAULT_THEME)
  }
  function resetTextStyle() {
    if (!window.confirm('Reset text style to defaults?')) return
    updateLyrics({
      fontSize: DEFAULT_LYRIC_SETTINGS.fontSize,
      fontColor: DEFAULT_LYRIC_SETTINGS.fontColor,
      hlColor: DEFAULT_LYRIC_SETTINGS.hlColor,
      glow: DEFAULT_LYRIC_SETTINGS.glow,
      bold: DEFAULT_LYRIC_SETTINGS.bold,
    })
  }
  function resetBehavior() {
    if (!window.confirm('Reset behavior to defaults?')) return
    updateLyrics({ scrollSpeed: DEFAULT_LYRIC_SETTINGS.scrollSpeed })
  }
  function resetVersions() {
    if (!window.confirm('Reset lyric versions to defaults?')) return
    updateLyrics({
      primary: DEFAULT_LYRIC_SETTINGS.primary,
      paired: DEFAULT_LYRIC_SETTINGS.paired,
      secondary: DEFAULT_LYRIC_SETTINGS.secondary,
    })
  }
  function resetAll() {
    if (!window.confirm('Reset all settings (Appearance, Lyric Display, Quick Access) to defaults? Profile and Spotify connection are unaffected.')) return
    setThemeState(DEFAULT_THEME)
    saveTheme(DEFAULT_THEME)
    applyAccent(DEFAULT_THEME)
    setLyricSettings(DEFAULT_LYRIC_SETTINGS)
    saveLyricSettings(DEFAULT_LYRIC_SETTINGS)
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('bad image'))
        i.src = dataUrl
      })
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      updateProfile({ image: canvas.toDataURL('image/jpeg', 0.85) })
    } catch {
      // ignore — leave existing image
    }
    if (avatarInputRef.current) avatarInputRef.current.value = ''
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
              className="flex-none flex items-center justify-center text-[20px] font-extrabold overflow-hidden"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: profile.image ? 'transparent' : 'var(--accent)',
                color: '#1C0840',
              }}
            >
              {profile.image ? (
                <img src={profile.image} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <input
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="Name"
                className="flex-1 min-w-0 text-[15px] font-bold text-text outline-none"
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: '#FAFAFE',
                  border: '1px solid rgba(100, 60, 180, 0.13)',
                }}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="text-[12px] font-semibold flex-none"
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: '#1C0840',
                }}
              >
                {profile.image ? 'Change' : 'Upload'}
              </button>
              {profile.image && (
                <button
                  onClick={() => updateProfile({ image: undefined })}
                  className="text-[12px] font-semibold flex-none"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: '#FAFAFE',
                    color: '#7060A0',
                    border: '1px solid rgba(100, 60, 180, 0.13)',
                  }}
                >
                  Remove
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>
          </div>
        </Card>

        {/* APPEARANCE */}
        <SectionLabel>Appearance</SectionLabel>
        <Card>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--accent-strong)' }}>
                <PaletteIcon size={16} color="currentColor" />
              </span>
              <div>
                <div className="text-[15px] font-bold text-text">Accent Color</div>
                <div className="text-[12px] text-text-2">Pick the brand color used across the app.</div>
              </div>
            </div>
            <ResetLink onClick={resetAppearance} />
          </div>
          <ColorRow
            value={theme.accentColor}
            presets={ACCENT_SWATCHES.map((s) => s.bg)}
            purpose="accent"
            swatches={customSwatches}
            onSwatchesChange={setCustomSwatches}
            onChange={(hex) => {
              const preset = ACCENT_SWATCHES.find((s) => s.bg.toUpperCase() === hex.toUpperCase())
              const next = preset
                ? { accentColor: preset.bg, accentStrongColor: preset.strong }
                : { accentColor: hex, accentStrongColor: deriveStrong(hex) }
              setThemeState(next)
              saveTheme(next)
              applyAccent(next)
            }}
            size={36}
          />
        </Card>

        {/* LYRIC DISPLAY & IMMERSION */}
        <SectionLabel>Lyric Display &amp; Immersion</SectionLabel>
        <Card>
          <div className="flex flex-col gap-3">
            <SubCard
              title="Text style"
              action={<ResetLink onClick={resetTextStyle} label="Reset" />}
            >
              <div className="flex flex-col gap-4">
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
                  <div className="text-[13px] font-semibold text-text mb-2">Font Color</div>
                  <ColorRow
                    value={lyricSettings.fontColor}
                    presets={HIGHLIGHT_SWATCHES}
                    purpose="font"
                    swatches={customSwatches}
                    onSwatchesChange={setCustomSwatches}
                    onChange={(hex) => updateLyrics({ fontColor: hex })}
                    size={28}
                  />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-text mb-2">Highlight</div>
                  <ColorRow
                    value={lyricSettings.hlColor}
                    presets={HIGHLIGHT_SWATCHES}
                    purpose="hl"
                    swatches={customSwatches}
                    onSwatchesChange={setCustomSwatches}
                    onChange={(hex) => updateLyrics({ hlColor: hex })}
                    size={28}
                  />
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
            </SubCard>

            <SubCard
              title="Behavior"
              action={<ResetLink onClick={resetBehavior} label="Reset" />}
            >
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
            </SubCard>

            <SubCard
              title="Lyric versions"
              action={<ResetLink onClick={resetVersions} label="Reset" />}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-text">Primary lyric</span>
                  <VersionPicker
                    value={lyricSettings.primary}
                    onChange={(v) => {
                      const patch: Partial<LyricSettings> = { primary: v }
                      if (lyricSettings.paired && lyricSettings.secondary === v) {
                        patch.secondary = (['original', 'romanized', 'translation'] as LyricVersion[]).find((x) => x !== v)!
                      }
                      updateLyrics(patch)
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-text">Paired display</span>
                  <Toggle value={lyricSettings.paired} onChange={(v) => updateLyrics({ paired: v })} />
                </div>
                {lyricSettings.paired && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-text">Secondary lyric</span>
                    <VersionPicker
                      value={lyricSettings.secondary}
                      onChange={(v) => updateLyrics({ secondary: v })}
                      disabledValue={lyricSettings.primary}
                    />
                  </div>
                )}
                <div className="text-[11px] text-text-2" style={{ lineHeight: 1.4 }}>
                  Primary is the default tab in Playback and the bigger line when paired.
                </div>
              </div>
            </SubCard>
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

        {/* GLOBAL RESET */}
        <div style={{ paddingTop: 16 }}>
          <button
            onClick={resetAll}
            className="text-[12px] font-semibold"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: '#FAFAFE',
              color: '#7060A0',
              border: '1px solid rgba(100, 60, 180, 0.13)',
            }}
          >
            Reset all settings to defaults
          </button>
        </div>

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
