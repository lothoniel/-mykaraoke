import type { Song } from '../types'
import { BB } from './bubble'

export type Mood = 'cute-pop' | 'cry-sing' | 'fight-ed' | 'chill'

export type MoodDef = {
  id: Mood
  label: string
  emoji: string
  bg: string
  ink: string
  genres: string[]
}

export const MOODS: MoodDef[] = [
  {
    id: 'cute-pop',
    label: 'cute pop',
    emoji: '🎀',
    bg: BB.primary,
    ink: '#fff',
    genres: ['pop', 'idol', 'j-pop', 'k-pop', 'kawaii'],
  },
  {
    id: 'cry-sing',
    label: 'cry sing',
    emoji: '🥺',
    bg: BB.sky,
    ink: BB.ink,
    genres: ['ballad', 'r&b', 'soul', 'indie', 'singer-songwriter'],
  },
  {
    id: 'fight-ed',
    label: 'fight ed',
    emoji: '⚔️',
    bg: BB.yellow,
    ink: BB.ink,
    genres: ['rock', 'metal', 'anime', 'opening', 'shounen', 'punk'],
  },
  {
    id: 'chill',
    label: 'chill',
    emoji: '🌸',
    bg: BB.mint,
    ink: BB.ink,
    genres: ['lo-fi', 'jazz', 'ambient', 'chill', 'bossa', 'acoustic'],
  },
]

export function getMood(id: Mood): MoodDef | undefined {
  return MOODS.find((m) => m.id === id)
}

export function songMatchesMood(song: Song, mood: Mood): boolean {
  const def = getMood(mood)
  if (!def) return false
  const genres = (song.genres ?? []).map((g) => g.toLowerCase())
  if (genres.length === 0) return false
  return def.genres.some((key) => genres.some((g) => g.includes(key)))
}
