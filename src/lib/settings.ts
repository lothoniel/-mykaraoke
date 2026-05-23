// --- Lyric settings (display + version toggles) ----------------------------

export type LyricVersion = 'original' | 'romanized' | 'translation'

export type LyricSettings = {
  // Primary lyric = default tab opened in PlaybackScreen, and the bigger line in paired mode
  primary: LyricVersion
  // When true, PlaybackScreen renders the secondary version below each active primary line
  paired: boolean
  secondary: LyricVersion
  // Lyric rendering (wired into PlaybackScreen)
  fontSize: number      // px (active line size)
  scrollSpeed: number   // 0..1000ms — smoothness of state transitions
  fontColor: string     // hex — color of active line text
  hlColor: string       // hex — translucent pill background behind active line
  glow: boolean
  bold: boolean
}

const LYRIC_KEY = 'mykaraoke-lyric-settings'
export const DEFAULT_LYRIC_SETTINGS: LyricSettings = {
  primary: 'original',
  paired: false,
  secondary: 'romanized',
  fontSize: 22,
  scrollSpeed: 50,
  fontColor: '#7C3AED',
  hlColor: '#C8F135',
  glow: false,
  bold: false,
}

export function getLyricSettings(): LyricSettings {
  try {
    const raw = localStorage.getItem(LYRIC_KEY)
    if (!raw) return DEFAULT_LYRIC_SETTINGS
    const parsed = JSON.parse(raw) as Partial<LyricSettings> & { romaji?: boolean; origLang?: boolean; romanized?: boolean; translations?: boolean }
    delete parsed.romaji
    delete parsed.origLang
    delete parsed.romanized
    delete parsed.translations
    if (parsed.hlColor && parsed.fontColor === undefined) {
      parsed.fontColor = parsed.hlColor
      parsed.hlColor = DEFAULT_LYRIC_SETTINGS.hlColor
    }
    return { ...DEFAULT_LYRIC_SETTINGS, ...parsed }
  } catch { return DEFAULT_LYRIC_SETTINGS }
}

export function saveLyricSettings(s: LyricSettings): void {
  localStorage.setItem(LYRIC_KEY, JSON.stringify(s))
}

// --- Theme (accent color) --------------------------------------------------

export type ThemeSettings = {
  accentColor: string        // bg color (--accent)
  accentStrongColor: string  // foreground/text color (--accent-strong)
}

const THEME_KEY = 'mykaraoke-theme'
export const DEFAULT_THEME: ThemeSettings = {
  accentColor: '#C8F135',
  accentStrongColor: '#5A7A0F',
}

export function getTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw ? { ...DEFAULT_THEME, ...JSON.parse(raw) } : DEFAULT_THEME
  } catch { return DEFAULT_THEME }
}

export function saveTheme(t: ThemeSettings): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(t))
}

export function applyAccent(t: ThemeSettings = getTheme()): void {
  const root = document.documentElement
  root.style.setProperty('--accent', t.accentColor)
  root.style.setProperty('--accent-strong', t.accentStrongColor)
}

// --- Profile (sidebar avatar + Settings identity card) ---------------------

export type Profile = {
  name: string
  image?: string // base64 data URL (downscaled square)
}

const PROFILE_KEY = 'mykaraoke-profile'
const PROFILE_DEFAULTS: Profile = {
  name: 'Caro',
}

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return PROFILE_DEFAULTS
    const parsed = JSON.parse(raw) as Profile & { email?: string }
    delete parsed.email
    return { ...PROFILE_DEFAULTS, ...parsed }
  } catch { return PROFILE_DEFAULTS }
}

export function saveProfile(p: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
}

// --- Custom color swatches (user-built palette per purpose) ----------------

export type SwatchPurpose = 'accent' | 'font' | 'hl'
export type CustomSwatches = Record<SwatchPurpose, string[]>

const SWATCHES_KEY = 'mykaraoke-custom-swatches'
const SWATCHES_DEFAULTS: CustomSwatches = { accent: [], font: [], hl: [] }
const SWATCHES_MAX = 8

export function getCustomSwatches(): CustomSwatches {
  try {
    const raw = localStorage.getItem(SWATCHES_KEY)
    if (!raw) return SWATCHES_DEFAULTS
    const parsed = JSON.parse(raw) as Partial<CustomSwatches>
    return { ...SWATCHES_DEFAULTS, ...parsed }
  } catch { return SWATCHES_DEFAULTS }
}

export function addCustomSwatch(purpose: SwatchPurpose, hex: string): CustomSwatches {
  const norm = hex.toUpperCase()
  const all = getCustomSwatches()
  const without = all[purpose].filter((c) => c.toUpperCase() !== norm)
  const next = [...without, norm].slice(-SWATCHES_MAX)
  const updated = { ...all, [purpose]: next }
  localStorage.setItem(SWATCHES_KEY, JSON.stringify(updated))
  return updated
}

export function removeCustomSwatch(purpose: SwatchPurpose, hex: string): CustomSwatches {
  const norm = hex.toUpperCase()
  const all = getCustomSwatches()
  const updated = { ...all, [purpose]: all[purpose].filter((c) => c.toUpperCase() !== norm) }
  localStorage.setItem(SWATCHES_KEY, JSON.stringify(updated))
  return updated
}
