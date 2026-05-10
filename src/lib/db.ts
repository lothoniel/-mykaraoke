import Dexie, { type Table } from 'dexie'
import type { Song } from '../types'

class MyKaraokeDB extends Dexie {
  songs!: Table<Song>

  constructor() {
    super('mykaraoke-db')
    this.version(1).stores({
      songs: 'id, title, artist, isFavorite, createdAt',
    })
  }
}

export const db = new MyKaraokeDB()
