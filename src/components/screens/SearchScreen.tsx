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
      if (filter === 'popular') base = [...base].sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1))

      setResults(base)
    }
    run()
  }, [query, filter, allSongs])

  const filters: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: '⭐ Favorites', value: 'favorites' },
    { label: '📅 Recent', value: 'recent' },
    { label: '🔥 Popular', value: 'popular' },
  ]

  return (
    <div className="min-h-screen bg-canvas p-5 pb-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Search Songs</h1>

      <input
        type="search"
        className="w-full px-3 py-3 bg-white border border-lavender-light rounded-lg text-sm focus:outline-none focus:border-lavender mb-4"
        placeholder="Song title or artist…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="flex gap-2 flex-wrap mb-5">
        {filters.map((f) => (
          <button
            key={f.value}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              filter === f.value ? 'bg-lavender text-ink' : 'bg-lavender-light text-ink'
            }`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm">No songs found</p>
        </div>
      ) : (
        <div>
          {results.map((s) => (
            <button
              key={s.id}
              className="w-full flex gap-3 py-3 border-b border-lavender-soft last:border-0 text-left"
              onClick={() => navigate({ name: 'playback', songId: s.id })}
            >
              <div className="w-14 h-14 bg-lavender rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
                {s.coverArt ? (
                  <img src={s.coverArt} alt={s.title} className="w-full h-full object-cover" />
                ) : (
                  '🎵'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.title}</div>
                <div className="text-xs text-muted truncate">{s.artist}</div>
              </div>
              {s.isFavorite && <span className="text-sm self-center">⭐</span>}
            </button>
          ))}
        </div>
      )}

      <button
        className="mt-8 w-full bg-lavender-light text-ink font-semibold py-3.5 rounded-lg"
        onClick={() => navigate({ name: 'home' })}
      >
        ← Back
      </button>
    </div>
  )
}
