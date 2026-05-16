// --- Lyric settings (display + version toggles) ----------------------------

export type LyricSettings = {
  // Quick Access (wired — read by PlaybackScreen / AddSongScreen)
  origLang: boolean
  romaji: boolean
  translations: boolean
  // Lyrics Preferences (persisted but not yet wired into playback rendering)
  fontSize: number      // px
  scrollSpeed: number   // 0..100
  hlColor: string       // hex
  glow: boolean
  bold: boolean
}

const LYRIC_KEY = 'mykaraoke-lyric-settings'
const LYRIC_DEFAULTS: LyricSettings = {
  origLang: true,
  romaji: true,
  translations: false,
  fontSize: 22,
  scrollSpeed: 50,
  hlColor: '#C8F135',
  glow: false,
  bold: false,
}

export function getLyricSettings(): LyricSettings {
  try {
    const raw = localStorage.getItem(LYRIC_KEY)
    return raw ? { ...LYRIC_DEFAULTS, ...JSON.parse(raw) } : LYRIC_DEFAULTS
  } catch { return LYRIC_DEFAULTS }
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
const THEME_DEFAULTS: ThemeSettings = {
  accentColor: '#C8F135',
  accentStrongColor: '#5A7A0F',
}

export function getTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw ? { ...THEME_DEFAULTS, ...JSON.parse(raw) } : THEME_DEFAULTS
  } catch { return THEME_DEFAULTS }
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
  email: string
}

const PROFILE_KEY = 'mykaraoke-profile'
const PROFILE_DEFAULTS: Profile = {
  name: 'Caro',
  email: 'lothoniel@gmail.com',
}

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? { ...PROFILE_DEFAULTS, ...JSON.parse(raw) } : PROFILE_DEFAULTS
  } catch { return PROFILE_DEFAULTS }
}

export function saveProfile(p: Profile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
}
