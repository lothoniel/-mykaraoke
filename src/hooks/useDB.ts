import { db } from '../lib/db'
import type { Song, Timing } from '../types'

export async function addSong(song: Song): Promise<Song> {
  await db.songs.add(song)
  return song
}

export async function getSong(id: string): Promise<Song | undefined> {
  return db.songs.get(id)
}

export async function getAllSongs(): Promise<Song[]> {
  return db.songs.orderBy('createdAt').reverse().toArray()
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<void> {
  await db.songs.update(id, updates)
}

export async function updateTimings(id: string, timings: Timing[]): Promise<void> {
  await db.songs.update(id, { timings })
}

export async function deleteSong(id: string): Promise<void> {
  await db.songs.delete(id)
}

export async function toggleFavorite(id: string): Promise<void> {
  const song = await db.songs.get(id)
  if (song) {
    await db.songs.update(id, { isFavorite: !song.isFavorite })
  }
}

export async function searchSongs(query: string): Promise<Song[]> {
  const lower = query.toLowerCase()
  return db.songs
    .filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower),
    )
    .toArray()
}

export async function getFavorites(): Promise<Song[]> {
  const all = await db.songs.toArray()
  return all
    .filter((s) => s.isFavorite)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function clearAllSongs(): Promise<void> {
  await db.songs.clear()
}

export async function importSongs(songs: Song[], mode: 'merge' | 'replace'): Promise<number> {
  const normalized = songs.map((s) => ({ ...s, createdAt: new Date(s.createdAt) }))
  if (mode === 'replace') {
    await db.songs.clear()
    await db.songs.bulkAdd(normalized)
    return normalized.length
  }
  const existing = await db.songs.toArray()
  const existingIds = new Set(existing.map((s) => s.id))
  const toAdd = normalized.filter((s) => !existingIds.has(s.id))
  if (toAdd.length > 0) await db.songs.bulkAdd(toAdd)
  return toAdd.length
}
