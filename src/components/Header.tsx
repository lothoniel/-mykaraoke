import type { ReactNode } from 'react'
import type { Screen } from '../types'
import { getStoredOAuthToken } from '../lib/spotify'
import { getProfile } from '../lib/settings'

type Props = {
  navigate: (s: Screen) => void
  currentScreen: Screen
}

type NavKey = Screen['name']

type NavItem = {
  key: NavKey
  label: string
  to: Screen
  icon: ReactNode
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const navItems: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    to: { name: 'home' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: 'library',
    label: 'Your Library',
    to: { name: 'library' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: 'add',
    label: 'Add Song',
    to: { name: 'add' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
]

const screenToNavKey: Partial<Record<Screen['name'], NavKey>> = {
  home: 'home',
  library: 'library',
  playback: 'library',
  edit: 'library',
  add: 'add',
  timing: 'add',
  import: 'library',
  settings: 'settings',
}

export default function Header({ navigate, currentScreen }: Props) {
  const activeKey = screenToNavKey[currentScreen.name] ?? currentScreen.name
  const spotifyConnected = getStoredOAuthToken() != null
  const profile = getProfile()
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'M'

  return (
    <header className="flex-none h-14 bg-sidebar border-b border-border flex items-center px-3 md:px-5 gap-2 md:gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-none">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C0840" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <span className="hidden sm:inline text-[15px] font-extrabold text-text">MyKaraoke</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex items-center gap-1 md:gap-1.5 justify-center md:justify-start md:ml-2">
        {navItems.map((item) => {
          const active = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              title={item.label}
              aria-label={item.label}
              className="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-[10px] transition-colors"
              style={{
                backgroundColor: active ? 'rgba(200, 241, 53, 0.18)' : 'transparent',
                color: active ? '#1C0840' : '#7060A0',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'rgba(100, 60, 180, 0.05)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span className="flex-none">{item.icon}</span>
              <span
                className="hidden md:inline text-[13px] whitespace-nowrap"
                style={{
                  fontWeight: active ? 600 : 500,
                  color: active ? '#1C0840' : '#7060A0',
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* User → Settings */}
      <button
        onClick={() => navigate({ name: 'settings' })}
        title="Settings"
        aria-label="Settings"
        className="flex-none flex items-center gap-2.5 rounded-[10px] p-1 pr-1.5 md:pr-2 transition-colors"
        style={{
          backgroundColor: activeKey === 'settings' ? 'rgba(200, 241, 53, 0.18)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (activeKey !== 'settings') e.currentTarget.style.backgroundColor = 'rgba(100, 60, 180, 0.05)'
        }}
        onMouseLeave={(e) => {
          if (activeKey !== 'settings') e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <div className="hidden md:block text-right leading-tight min-w-0">
          <div className="text-[13px] font-semibold text-text truncate max-w-[140px]">{profile.name}</div>
          <div className="text-[11px] flex items-center gap-1 justify-end" style={{ color: spotifyConnected ? '#16A34A' : '#7060A0' }}>
            <span aria-hidden>●</span>
            <span>{spotifyConnected ? 'Spotify connected' : 'Not connected'}</span>
          </div>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[14px] font-bold flex-none relative"
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, var(--accent) 100%)' }}
        >
          {initial}
          <span
            className="md:hidden absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar"
            style={{ backgroundColor: spotifyConnected ? '#16A34A' : '#9CA3AF' }}
            aria-hidden
          />
        </div>
      </button>
    </header>
  )
}
