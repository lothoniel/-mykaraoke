type LyricSettings = { origLang: boolean; romaji: boolean; translations: boolean }

const KEY = 'mykaraoke-lyric-settings'
const DEFAULTS: LyricSettings = { origLang: true, romaji: true, translations: false }

export function getLyricSettings(): LyricSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch { return DEFAULTS }
}

export function saveLyricSettings(s: LyricSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}
