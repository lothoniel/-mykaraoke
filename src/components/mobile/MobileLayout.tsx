import { useEffect, type ReactNode } from 'react'
import type { Screen } from '../../types'
import MobileTabBar, { type MobileTab } from './MobileTabBar'

function screenToTab(screen: Screen): MobileTab {
  switch (screen.name) {
    case 'home':
      return 'home'
    case 'library':
      return 'library'
    case 'search':
      return 'search'
    case 'settings':
      return 'settings'
    default:
      return 'home'
  }
}

type Props = {
  screen: Screen
  navigate: (s: Screen) => void
  children: ReactNode
  // Hide tab bar for overlay screens (e.g. Now Playing).
  hideTabBar?: boolean
}

export default function MobileLayout({ screen, navigate, children, hideTabBar }: Props) {
  useEffect(() => {
    document.body.classList.add('mobile-mode')
    return () => {
      document.body.classList.remove('mobile-mode')
    }
  }, [])

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--bb-font)',
        color: '#3A1740',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 28px' }}>
          {children}
        </div>
      </div>
      {!hideTabBar && <MobileTabBar active={screenToTab(screen)} onChange={navigate} />}
    </div>
  )
}
