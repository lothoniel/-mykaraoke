import { useState, type ReactNode } from 'react'
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
  icon: (active: boolean) => ReactNode
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const navItems: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    to: { name: 'home' },
    icon: () => (
      <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: 'library',
    label: 'Your Songs',
    to: { name: 'library' },
    icon: () => (
      <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: 'search',
    label: 'Search',
    to: { name: 'search' },
    icon: () => (
      <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    key: 'add',
    label: 'Add Song',
    to: { name: 'add' },
    icon: () => (
      <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    to: { name: 'settings' },
    icon: () => (
      <svg width="19" height="19" viewBox="0 0 24 24" {...stroke}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
]

const screenToNavKey: Partial<Record<Screen['name'], NavKey>> = {
  home: 'home',
  library: 'library',
  playback: 'library',
  edit: 'library',
  search: 'search',
  add: 'add',
  timing: 'add',
  import: 'library',
  settings: 'settings',
}

function SidebarContent({
  navigate,
  currentScreen,
  onNavigate,
}: Props & { onNavigate?: () => void }) {
  const activeKey = screenToNavKey[currentScreen.name] ?? currentScreen.name
  const spotifyConnected = getStoredOAuthToken() != null
  const profile = getProfile()
  const initial = profile.name.trim().charAt(0).toUpperCase() || 'M'

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border w-[228px]">
      {/* Logo block */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-5">
        <div
          className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1C0840" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[16px] font-extrabold text-text">MyKaraoke</div>
          <div className="text-[11px] text-text-2">Anime Library</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => {
                navigate(item.to)
                onNavigate?.()
              }}
              className="relative flex items-center gap-2.5 px-3 py-[9px] rounded-[10px] text-left transition-colors"
              style={{
                backgroundColor: active ? 'rgba(200, 241, 53, 0.18)' : 'transparent',
                color: active ? 'var(--accent)' : '#7060A0',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'rgba(100, 60, 180, 0.05)'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
              <span className="flex-none">{item.icon(active)}</span>
              <span
                className="text-[13px]"
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

      {/* User footer */}
      <div className="px-4 py-4 border-t border-border flex items-center gap-2.5">
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-[14px] font-bold"
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, var(--accent) 100%)' }}
        >
          {initial}
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[13px] font-semibold text-text truncate">{profile.name}</div>
          <div className="text-[11px] flex items-center gap-1 truncate" style={{ color: spotifyConnected ? '#16A34A' : '#7060A0' }}>
            <span aria-hidden>●</span>
            <span>{spotifyConnected ? 'Spotify connected' : 'Not connected'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Sidebar(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar (≥768px) */}
      <aside className="hidden md:flex flex-none">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-sidebar border-b border-border flex items-center justify-between px-3">
        <button
          aria-label="Open menu"
          className="p-2 rounded-md text-text-2"
          onClick={() => setMobileOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1C0840" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
          </div>
          <span className="text-[14px] font-extrabold text-text">MyKaraoke</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 h-full">
            <SidebarContent {...props} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
