import Dexie, { type Table } from 'dexie'
import type { Song } from '../types'

class MyKaraokeDB extends Dexie {
  songs!: Table<Song>

  constructor() {
    super('mykaraoke-db')
    this.version(1).stores({
      songs: 'id, title, artist, isFavorite, createdAt',
    })
    this.version(2).stores({
      songs: 'id, title, artist, isFavorite, createdAt',
    }).upgrade((tx) =>
      tx.table('songs').toCollection().modify((s: Record<string, unknown>) => {
        if ('lyricsRomaji' in s) {
          s.lyricsRomanized = s.lyricsRomaji
          delete s.lyricsRomaji
        }
        if ('timingsRomaji' in s) {
          s.timingsRomanized = s.timingsRomaji
          delete s.timingsRomaji
        }
      }),
    )
    this.version(3).stores({
      songs: 'id, title, artist, isFavorite, createdAt',
    })
  }
}

export const db = new MyKaraokeDB()
