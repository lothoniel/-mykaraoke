import type { Screen } from '../types'

type Props = {
  navigate: (s: Screen) => void
  currentScreen: Screen
  lastSongId?: string
}

export default function NavBar({ navigate, currentScreen, lastSongId }: Props) {
  const cur = currentScreen.name

  const linkCls = (active: boolean) =>
    `flex items-center gap-1.5 text-sm font-medium transition-colors ${
      active ? 'text-coral' : 'text-muted hover:text-ink'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left nav */}
        <div className="flex items-center gap-5">
          <button className={linkCls(cur === 'home')} onClick={() => navigate({ name: 'home' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="hidden sm:inline">Home</span>
          </button>
          <button className={linkCls(cur === 'library')} onClick={() => navigate({ name: 'library' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="hidden sm:inline">Library</span>
          </button>
          {lastSongId && (
            <button
              className={linkCls(cur === 'playback')}
              onClick={() => navigate({ name: 'playback', songId: lastSongId })}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={cur === 'playback' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span className="hidden sm:inline">Now Playing</span>
            </button>
          )}
        </div>

        {/* Center logo */}
        <button
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-coral font-bold text-base"
          onClick={() => navigate({ name: 'home' })}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span className="hidden sm:inline">MyKaraoke</span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              cur === 'add' ? 'text-coral' : 'text-muted hover:text-ink'
            }`}
            onClick={() => navigate({ name: 'add' })}
            aria-label="Add song"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              cur === 'search' ? 'text-coral' : 'text-muted hover:text-ink'
            }`}
            onClick={() => navigate({ name: 'search' })}
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors ${
              cur === 'settings' ? 'text-coral' : 'text-muted hover:text-ink'
            }`}
            onClick={() => navigate({ name: 'settings' })}
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}
