import { useState } from 'react'
import { extractTrackId, getTrackMetadata, getArtistGenres } from '../lib/spotify'
import type { Song } from '../types'

type FetchResult = Pick<
  Song,
  'title' | 'artist' | 'coverArt' | 'duration' | 'releaseDate' | 'popularity' | 'genres' | 'spotifyTrackId'
>

export function useSpotify() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchFromSpotifyLink(spotifyUrl: string): Promise<FetchResult | null> {
    const trackId = extractTrackId(spotifyUrl)
    if (!trackId) {
      setError('Invalid Spotify link')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const meta = await getTrackMetadata(trackId)
      const genres = await getArtistGenres(meta.artistId).catch(() => [])

      return {
        spotifyTrackId: trackId,
        title: meta.title,
        artist: meta.artist,
        coverArt: meta.coverArt,
        duration: meta.duration,
        releaseDate: meta.releaseDate,
        popularity: meta.popularity,
        genres,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch Spotify data'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { fetchFromSpotifyLink, loading, error }
}
