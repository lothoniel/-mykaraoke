import type { SpotifyPlaylistSummary, SpotifyToken, SpotifyTrackSummary } from '../types'

let cachedToken: SpotifyToken | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 10_000) {
    return cachedToken.accessToken
  }

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string | undefined

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured. Copy .env.local.example to .env.local and fill in your credentials.')
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('Failed to get Spotify token')

  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.accessToken
}

export function extractTrackId(spotifyUrl: string): string | null {
  try {
    const u = new URL(spotifyUrl)
    const match = u.pathname.match(/\/track\/([a-zA-Z0-9]+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export type SpotifyTrackMeta = {
  title: string
  artist: string
  coverArt: string
  duration: number // ms
  releaseDate: string
  popularity: number
  artistId: string
}

export async function getTrackMetadata(trackId: string): Promise<SpotifyTrackMeta> {
  const token = await getToken()
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch Spotify track')

  const data = await res.json() as {
    name: string
    artists: Array<{ name: string; id: string }>
    album: { images: Array<{ url: string }>; release_date: string }
    duration_ms: number
    popularity: number
  }

  return {
    title: data.name,
    artist: data.artists.map((a) => a.name).join(', '),
    coverArt: data.album.images[0]?.url ?? '',
    duration: data.duration_ms,
    releaseDate: data.album.release_date,
    popularity: data.popularity,
    artistId: data.artists[0]?.id ?? '',
  }
}

export async function getArtistGenres(artistId: string): Promise<string[]> {
  const token = await getToken()
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []

  const data = await res.json() as { genres: string[] }
  return data.genres.slice(0, 5)
}

// ---- PKCE OAuth (user auth for liked songs / playlists) ----

const PKCE_TOKEN_KEY = 'spotify_oauth_token'
const PKCE_VERIFIER_KEY = 'spotify_pkce_verifier'
const PKCE_STATE_KEY = 'spotify_pkce_state'
const REDIRECT_URI = 'http://127.0.0.1:5174/'
const OAUTH_SCOPES = 'user-library-read playlist-read-private playlist-read-collaborative'

function generateVerifier(length = 64): string {
  const arr = crypto.getRandomValues(new Uint8Array(length))
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    .slice(0, length)
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function startOAuthFlow(): Promise<void> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
  if (!clientId) throw new Error('VITE_SPOTIFY_CLIENT_ID not set')
  const verifier = generateVerifier()
  const challenge = await generateChallenge(verifier)
  const state = crypto.randomUUID()
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_KEY, state)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: OAUTH_SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })
  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCodeForToken(code: string, state: string): Promise<boolean> {
  const storedState = sessionStorage.getItem(PKCE_STATE_KEY)
  if (state !== storedState) return false
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  if (!verifier) return false
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) return false
  const data = await res.json() as { access_token: string; expires_in: number; refresh_token: string }
  const token: SpotifyToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    refreshToken: data.refresh_token,
  }
  localStorage.setItem(PKCE_TOKEN_KEY, JSON.stringify(token))
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_STATE_KEY)
  return true
}

export function getStoredOAuthToken(): SpotifyToken | null {
  const raw = localStorage.getItem(PKCE_TOKEN_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as SpotifyToken } catch { return null }
}

export function clearOAuthToken(): void {
  localStorage.removeItem(PKCE_TOKEN_KEY)
}

async function getOAuthAccessToken(): Promise<string> {
  let token = getStoredOAuthToken()
  if (!token) throw new Error('Not logged in to Spotify')
  if (Date.now() >= token.expiresAt - 10_000) {
    if (!token.refreshToken) throw new Error('Session expired — please reconnect')
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        client_id: clientId,
      }),
    })
    if (!res.ok) throw new Error('Token refresh failed — please reconnect')
    const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string }
    token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
    }
    localStorage.setItem(PKCE_TOKEN_KEY, JSON.stringify(token))
  }
  return token.accessToken
}

type SpotifyRawTrack = {
  id: string
  name: string
  artists: Array<{ name: string; id: string }>
  album: { images: Array<{ url: string }>; release_date: string }
  duration_ms: number
  popularity: number
}

function rawTrackToSummary(t: SpotifyRawTrack): SpotifyTrackSummary {
  return {
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    coverArt: t.album.images[0]?.url,
    duration: t.duration_ms,
    releaseDate: t.album.release_date,
    popularity: t.popularity,
    artistId: t.artists[0]?.id ?? '',
  }
}

export async function getUserPlaylists(): Promise<SpotifyPlaylistSummary[]> {
  const token = await getOAuthAccessToken()
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch playlists')
  const data = await res.json() as {
    items: Array<{ id: string; name: string; tracks: { total: number }; images: Array<{ url: string }> }>
  }
  return data.items.map((p) => ({
    id: p.id,
    name: p.name,
    trackCount: p.tracks.total,
    imageUrl: p.images[0]?.url,
  }))
}

export async function getLikedSongs(): Promise<SpotifyTrackSummary[]> {
  const token = await getOAuthAccessToken()
  const res = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch liked songs')
  const data = await res.json() as { items: Array<{ track: SpotifyRawTrack }> }
  return data.items.map((i) => rawTrackToSummary(i.track))
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrackSummary[]> {
  const token = await getOAuthAccessToken()
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch playlist tracks')
  const data = await res.json() as { items: Array<{ track: SpotifyRawTrack | null }> }
  return data.items.flatMap((i) => (i.track ? [rawTrackToSummary(i.track)] : []))
}
