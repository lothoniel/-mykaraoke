import { useEffect, useState } from 'react'
import * as db from '../../hooks/useDB'
import type { Screen, Song } from '../../types'

type Props = { navigate: (s: Screen) => void }
type Filter = 'all' | 'favorites' | 'recent' | 'popular'

export default function SearchScreen({ navigate }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [results, setResults] = useState<Song[]>([])
  const [allSongs, setAllSongs] = useState<Song[]>([])

  useEffect(() => {
    db.getAllSongs().then((songs) => {
      setAllSongs(songs)
      setResults(songs)
    })
  }, [])

  useEffect(() => {
    async function run() {
      let base: Song[]
      if (query.trim()) {
        base = await db.searchSongs(query)
      } else {
        base = allSongs
      }
      if (filter === 'favorites') base = base.filter((s) => s.isFavorite)
      if (filter === 'recent') base = base.slice(0, 10)
      if (filter === 'popular')
        base = [...base].sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1))
      setResults(base)
    }
    run()
  }, [query, filter, allSongs])

  const filters: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Favorites', value: 'favorites' },
    { label: 'Recently Added', value: 'recent' },
    { label: 'Popular', value: 'popular' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-12">
      <h1 className="text-2xl font-bold text-ink mb-4">Search Songs</h1>

      <div className="relative mb-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          className="w-full pl-9 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-coral"
          placeholder="Song title or artist…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {filters.map((f) => (
          <button
            key={f.value}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f.value ? 'bg-coral text-white' : 'bg-coral-light text-ink hover:bg-coral-soft'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm">No songs found</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {results.map((s) => (
            <button
              key={s.id}
              className="w-full flex gap-3 py-3 text-left hover:bg-coral-soft rounded-xl px-2 -mx-2 transition-colors"
              onClick={() => navigate({ name: 'playback', songId: s.id })}
            >
              <div className="w-12 h-12 bg-coral-light rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-xl">
                {s.coverArt ? (
                  <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
                ) : (
                  '🎵'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-ink truncate">{s.title}</div>
                <div className="text-xs text-muted truncate">{s.artist}</div>
                {s.genres?.[0] && (
                  <span className="text-xs text-coral-dark capitalize">{s.genres[0]}</span>
                )}
              </div>
              {s.isFavorite && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-coral self-center flex-shrink-0">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
