import { useRef, useState } from 'react'
import type { Screen, Song } from '../../../types'
import * as db from '../../../hooks/useDB'
import { BB, darken } from '../../../lib/bubble'
import {
  getLyricSettings,
  saveLyricSettings,
  getProfile,
  saveProfile,
  getTheme,
  saveTheme,
  applyAccent,
  type LyricVersion,
  type LyricSettings,
  type Profile,
  type ThemeSettings,
} from '../../../lib/settings'
import { clearOAuthToken, getStoredOAuthToken, startOAuthFlow } from '../../../lib/spotify'
import { BubbleButton, BubbleChip, BubbleEyebrow } from '../atoms'
import { Sparkle, Heart, Star4, Flower } from '../atoms/stickers'
import { IconSpotify, IconTrash } from '../atoms/icons'

type Props = {
  navigate: (s: Screen) => void
}

const ACCENT_SWATCHES: { id: string; bg: string; strong: string; label: string }[] = [
  { id: 'lime', bg: '#C8F135', strong: '#5A7A0F', label: 'Lime' },
  { id: 'magenta', bg: '#EC4899', strong: '#9F2566', label: 'Magenta' },
  { id: 'sky', bg: '#38BDF8', strong: '#0369A1', label: 'Sky' },
  { id: 'mint', bg: '#34D399', strong: '#047857', label: 'Mint' },
  { id: 'amber', bg: '#FBBF24', strong: '#92400E', label: 'Amber' },
]

const LYRIC_OPTIONS: { id: LyricVersion; label: string }[] = [
  { id: 'original', label: 'original' },
  { id: 'romanized', label: 'romanized' },
  { id: 'translation', label: 'translation' },
]

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: BB.surface,
        borderRadius: 22,
        padding: 16,
        boxShadow: '0 4px 0 rgba(58,23,64,0.06)',
      }}
    >
      {children}
    </div>
  )
}

function Row({
  label,
  trailing,
  border = true,
}: {
  label: string
  trailing?: React.ReactNode
  border?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 4px',
        borderBottom: border ? '1px solid rgba(58,23,64,0.06)' : 'none',
      }}
    >
      <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: 'var(--bb-font-display)', color: BB.ink }}>
        {label}
      </div>
      {trailing}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        all: 'unset',
        cursor: 'pointer',
        width: 50,
        height: 30,
        borderRadius: 999,
        background: on ? BB.primary : BB.bg2,
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 2px 4px rgba(58,23,64,0.2)',
          transition: 'left 0.15s',
        }}
      />
    </button>
  )
}

async function fileToSquareDataUrl(file: File): Promise<string> {
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
  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function MobileSettings({ navigate }: Props) {
  const [profile, setProfileState] = useState<Profile>(getProfile())
  const [lyric, setLyricState] = useState<LyricSettings>(getLyricSettings())
  const [theme, setThemeState] = useState<ThemeSettings>(getTheme())
  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(!!getStoredOAuthToken())
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile.name)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function updateProfile(patch: Partial<Profile>) {
    const next = { ...profile, ...patch }
    setProfileState(next)
    saveProfile(next)
  }

  function updateLyric(patch: Partial<LyricSettings>) {
    const next = { ...lyric, ...patch }
    setLyricState(next)
    saveLyricSettings(next)
  }

  function pickAccent(s: typeof ACCENT_SWATCHES[number]) {
    const next: ThemeSettings = { accentColor: s.bg, accentStrongColor: s.strong }
    setThemeState(next)
    saveTheme(next)
    applyAccent(next)
  }

  function commitName() {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === profile.name) return
    updateProfile({ name: trimmed })
  }

  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await fileToSquareDataUrl(file)
      updateProfile({ image: url })
    } catch {
      // ignore
    }
    if (avatarInputRef.current) avatarInputRef.current.value = ''
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
    setImportStatus('importing…')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as { songs?: Song[] } | Song[]
      const songs: Song[] = Array.isArray(parsed) ? parsed : parsed.songs ?? []
      const added = await db.importSongs(songs, 'merge')
      setImportStatus(`imported ${added} new song${added !== 1 ? 's' : ''}`)
    } catch {
      setImportStatus('import failed: invalid file')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function doClear() {
    await db.clearAllSongs()
    setConfirmingClear(false)
    navigate({ name: 'home' })
  }

  async function toggleSpotify() {
    if (spotifyConnected) {
      clearOAuthToken()
      setSpotifyConnected(false)
    } else {
      try {
        await startOAuthFlow()
      } catch {
        // surfaced by redirect failure; nothing to set
      }
    }
  }

  const initial = profile.name.trim().charAt(0).toUpperCase() || 'M'

  return (
    <div style={{ position: 'relative' }}>
      <Sparkle
        size={18}
        color={BB.yellow}
        style={{ position: 'absolute', top: 8, right: 18, transform: 'rotate(8deg)', opacity: 0.7, pointerEvents: 'none' }}
      />

      <div style={{ padding: '6px 0 18px' }}>
        <div
          style={{
            fontSize: 16,
            color: BB.ink2,
            fontWeight: 600,
            fontFamily: 'var(--bb-font-script)',
          }}
        >
          tune it your way ✿
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -0.7,
            fontFamily: 'var(--bb-font-display)',
            color: BB.ink,
            marginTop: 2,
          }}
        >
          settings
        </div>
      </div>

      <BubbleEyebrow decoration={<Heart size={18} color={BB.primary} />}>
        profile
      </BubbleEyebrow>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Change profile image"
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 64,
              height: 64,
              borderRadius: 999,
              background: profile.image
                ? `url(${profile.image}) center/cover`
                : `linear-gradient(135deg, ${BB.primary}, ${BB.lilac})`,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--bb-font-display)',
              fontWeight: 700,
              fontSize: 26,
              boxShadow: `0 4px 0 ${darken(BB.primary, 0.18)}`,
              flexShrink: 0,
            }}
          >
            {!profile.image && initial}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              aria-label="Display name"
              placeholder="your name"
              style={{
                width: '100%',
                background: BB.bgSoft,
                border: 'none',
                outline: 'none',
                borderRadius: 12,
                padding: '10px 12px',
                fontFamily: 'var(--bb-font-display)',
                fontSize: 16,
                fontWeight: 600,
                color: BB.ink,
                boxSizing: 'border-box',
              }}
            />
            {profile.image && (
              <button
                onClick={() => updateProfile({ image: undefined })}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  marginTop: 8,
                  fontSize: 12,
                  color: BB.ink2,
                  fontWeight: 600,
                }}
              >
                remove photo
              </button>
            )}
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={onAvatarPick}
          style={{ display: 'none' }}
        />
      </Card>

      <BubbleEyebrow decoration={<Sparkle size={18} color={BB.primary} />}>
        lyric versions
      </BubbleEyebrow>
      <Card>
        <Row
          label="primary"
          trailing={
            <div style={{ display: 'flex', gap: 6 }}>
              {LYRIC_OPTIONS.map((o) => (
                <BubbleChip
                  key={o.id}
                  active={lyric.primary === o.id}
                  color={BB.primary}
                  onClick={() => updateLyric({ primary: o.id })}
                >
                  {o.label}
                </BubbleChip>
              ))}
            </div>
          }
        />
        <Row
          label="paired"
          trailing={<Toggle on={lyric.paired} onChange={(v) => updateLyric({ paired: v })} />}
        />
        {lyric.paired && (
          <Row
            label="secondary"
            border={false}
            trailing={
              <div style={{ display: 'flex', gap: 6 }}>
                {LYRIC_OPTIONS.filter((o) => o.id !== lyric.primary).map((o) => (
                  <BubbleChip
                    key={o.id}
                    active={lyric.secondary === o.id}
                    color={BB.mint}
                    ink={BB.ink}
                    onClick={() => updateLyric({ secondary: o.id })}
                  >
                    {o.label}
                  </BubbleChip>
                ))}
              </div>
            }
          />
        )}
        {!lyric.paired && (
          <div style={{ padding: '4px 4px 0', fontSize: 12, color: BB.ink3 }}>
            turn on paired to show two versions at once
          </div>
        )}
      </Card>

      <BubbleEyebrow decoration={<Sparkle size={18} color={BB.yellow} />}>
        lyric glow
      </BubbleEyebrow>
      <Card>
        <Row
          label="glow active line"
          trailing={<Toggle on={lyric.glow} onChange={(v) => updateLyric({ glow: v })} />}
        />
        <Row
          label="glow color"
          border={false}
          trailing={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={lyric.hlColor}
                onChange={(e) => updateLyric({ hlColor: e.target.value })}
                aria-label="Glow color"
                style={{
                  width: 36,
                  height: 30,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11.5,
                  color: BB.ink2,
                }}
              >
                {lyric.hlColor.toUpperCase()}
              </span>
            </div>
          }
        />
      </Card>

      <BubbleEyebrow decoration={<Flower size={20} color={BB.primary} center={BB.yellow} />}>
        accent color
      </BubbleEyebrow>
      <Card>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'space-around', padding: '6px 0' }}>
          {ACCENT_SWATCHES.map((s) => {
            const active = theme.accentColor.toUpperCase() === s.bg.toUpperCase()
            return (
              <button
                key={s.id}
                onClick={() => pickAccent(s)}
                aria-label={s.label}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: s.bg,
                  boxShadow: active
                    ? `0 0 0 3px #fff, 0 0 0 6px ${s.bg}, 0 4px 12px ${s.bg}88`
                    : `0 3px 0 ${darken(s.bg, 0.2)}`,
                }}
              />
            )
          })}
        </div>
      </Card>

      <BubbleEyebrow decoration={<Star4 size={18} color={BB.mint} />}>
        connections
      </BubbleEyebrow>
      <Card>
        <Row
          label="Spotify"
          border={false}
          trailing={
            <BubbleChip
              active={spotifyConnected}
              color={spotifyConnected ? BB.mint : BB.primary}
              ink={spotifyConnected ? BB.ink : '#fff'}
              onClick={toggleSpotify}
            >
              <IconSpotify size={13} /> {spotifyConnected ? 'unlink' : 'connect'}
            </BubbleChip>
          }
        />
      </Card>

      <BubbleEyebrow decoration={<Sparkle size={18} color={BB.primary} />}>
        storage
      </BubbleEyebrow>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <BubbleButton block color={BB.primary} onClick={handleExport}>
            export library
          </BubbleButton>
          <BubbleButton
            block
            color={BB.sky}
            ink={BB.ink}
            onClick={() => fileInputRef.current?.click()}
          >
            import .json
          </BubbleButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          {importStatus && (
            <div style={{ fontSize: 12, color: BB.ink2, textAlign: 'center' }}>{importStatus}</div>
          )}
        </div>
      </Card>

      <BubbleEyebrow decoration={<Heart size={18} color={BB.primary} />}>
        danger zone
      </BubbleEyebrow>
      <Card>
        {!confirmingClear ? (
          <button
            onClick={() => setConfirmingClear(true)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '4px 0',
              color: '#D14B6A',
              fontFamily: 'var(--bb-font-display)',
              fontWeight: 700,
              fontSize: 14.5,
            }}
          >
            <span>clear all songs</span>
            <IconTrash size={16} />
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: BB.ink, fontWeight: 600 }}>
              this will delete every song. are you sure?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <BubbleButton block color="#D14B6A" onClick={doClear}>
                yes, clear
              </BubbleButton>
              <BubbleButton
                block
                color={BB.surface}
                ink={BB.ink}
                onClick={() => setConfirmingClear(false)}
              >
                cancel
              </BubbleButton>
            </div>
          </div>
        )}
      </Card>

      <div
        style={{
          marginTop: 32,
          textAlign: 'center',
          fontSize: 12,
          color: BB.ink3,
          fontFamily: 'var(--bb-font-script)',
        }}
      >
        mykaraoke · made with ♥
      </div>
    </div>
  )
}
