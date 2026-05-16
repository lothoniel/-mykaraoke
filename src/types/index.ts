export type Timing = {
  lineIndex: number
  timestamp: number // seconds
}

export type Song = {
  id: string
  title: string
  artist: string
  spotifyLink?: string
  spotifyTrackId?: string
  youtubeLink?: string
  coverArt?: string
  lyrics: string[]
  lyricsRomaji?: string[]
  lyricsTranslation?: string[]
  timings: Timing[]
  timingsRomaji?: Timing[]
  timingsTranslation?: Timing[]
  isFavorite: boolean
  createdAt: Date
  // Spotify-fetched metadata (cached at add time)
  duration?: number // milliseconds
  releaseDate?: string
  popularity?: number // 0–100
  genres?: string[]
}

export type Screen =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'add' }
  | { name: 'timing'; songId: string; version?: 'original' | 'romaji' | 'translation' }
  | { name: 'playback'; songId: string }
  | { name: 'edit'; songId: string }
  | { name: 'search' }
  | { name: 'settings' }
  | { name: 'import' }

export type SpotifyToken = {
  accessToken: string
  expiresAt: number // Date.now() ms
  refreshToken?: string
  scope?: string // space-separated scopes granted by Spotify
}

export type SpotifyPlaylistSummary = {
  id: string
  name: string
  trackCount: number
  imageUrl?: string
}

export type SpotifyTrackSummary = {
  id: string
  title: string
  artist: string
  coverArt?: string
  duration?: number
  releaseDate?: string
  popularity?: number
  artistId: string
}
