import type { Screen } from '../../types'
import { BB, darken } from '../../lib/bubble'
import { IconHome, IconLibrary, IconSearch, IconSettings } from './atoms/icons'

export type MobileTab = 'home' | 'library' | 'search' | 'settings'

const TABS: Array<{ id: MobileTab; Icon: typeof IconHome; label: string }> = [
  { id: 'home', Icon: IconHome, label: 'Home' },
  { id: 'library', Icon: IconLibrary, label: 'Library' },
  { id: 'search', Icon: IconSearch, label: 'Search' },
  { id: 'settings', Icon: IconSettings, label: 'Settings' },
]

function tabToScreen(tab: MobileTab): Screen {
  switch (tab) {
    case 'home':
      return { name: 'home' }
    case 'library':
      return { name: 'library' }
    case 'search':
      return { name: 'search' }
    case 'settings':
      return { name: 'settings' }
  }
}

type Props = {
  active: MobileTab
  onChange: (screen: Screen) => void
}

export default function MobileTabBar({ active, onChange }: Props) {
  return (
    <nav
      style={{
        flexShrink: 0,
        background: 'rgba(255, 241, 244, 0.92)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderTop: '1px solid rgba(58,23,64,0.06)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 4px 30px',
      }}
    >
      {TABS.map(t => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            onClick={() => onChange(tabToScreen(t.id))}
            aria-label={t.label}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: isActive ? BB.ink : BB.ink2,
              padding: '4px 12px',
            }}
          >
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                background: isActive ? BB.primary : 'transparent',
                color: isActive ? '#fff' : BB.ink2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? `0 4px 0 ${darken(BB.primary, 0.18)}` : 'none',
                transition: 'all 0.15s',
              }}
            >
              <t.Icon size={18} />
            </span>
          </button>
        )
      })}
    </nav>
  )
}
