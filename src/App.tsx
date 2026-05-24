import { useEffect, useRef, useState } from 'react'
import type { Screen } from './types'
import Header from './components/Header'
import HomeScreen from './components/screens/HomeScreen'
import LibraryScreen from './components/screens/LibraryScreen'
import AddSongScreen from './components/screens/AddSongScreen'
import TimingScreen from './components/screens/TimingScreen'
import PlaybackScreen from './components/screens/PlaybackScreen'
import EditScreen from './components/screens/EditScreen'
import SettingsScreen from './components/screens/SettingsScreen'
import ImportScreen from './components/screens/ImportScreen'
import { exchangeCodeForToken } from './lib/spotify'
import { applyAccent } from './lib/settings'
import MobileLayout from './components/mobile/MobileLayout'
import MobileHome from './components/mobile/screens/MobileHome'
import MobileLibrary from './components/mobile/screens/MobileLibrary'
import MobileSearch from './components/mobile/screens/MobileSearch'
import MobileSettings from './components/mobile/screens/MobileSettings'
import MobileNowPlaying from './components/mobile/screens/MobileNowPlaying'
import MobileAddSong from './components/mobile/screens/MobileAddSong'
import type { Mood } from './lib/moods'

const MOBILE_MAX_WIDTH = 768
const MOBILE_PATH = '/m/'
const MOBILE_FLAG_KEY = 'bb-mobile-mode'

function detectInitialMobileMode(): boolean {
  if (window.location.pathname.startsWith('/m')) return true
  if (sessionStorage.getItem(MOBILE_FLAG_KEY) === '1') return true
  return window.innerWidth < MOBILE_MAX_WIDTH
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  // Mode is fixed for the session — DevTools viewport changes require a reload,
  // which is expected behavior for swapping desktop/mobile modes during dev.
  const [isMobile] = useState<boolean>(detectInitialMobileMode)
  const historyRef = useRef<Screen[]>([])
  const [pendingMood, setPendingMood] = useState<Mood | null>(null)

  useEffect(() => {
    applyAccent()
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (code && state) {
      const wasMobile = sessionStorage.getItem(MOBILE_FLAG_KEY) === '1'
      window.history.replaceState({}, '', wasMobile ? MOBILE_PATH : '/')
      exchangeCodeForToken(code, state).then(() => {
        setScreen(wasMobile ? { name: 'settings' } : { name: 'library' })
      })
      return
    }

    // Sync URL with mode: ensure /m/ when mobile, / when desktop.
    if (isMobile && !window.location.pathname.startsWith('/m')) {
      window.history.replaceState({}, '', MOBILE_PATH)
    }
    if (isMobile) {
      sessionStorage.setItem(MOBILE_FLAG_KEY, '1')
    } else {
      sessionStorage.removeItem(MOBILE_FLAG_KEY)
    }
  }, [isMobile])

  function navigate(s: Screen) {
    historyRef.current = [...historyRef.current.slice(-19), screen]
    setScreen(s)
    window.scrollTo(0, 0)
  }

  function goBack() {
    const h = historyRef.current
    const target = h[h.length - 1]
    historyRef.current = h.slice(0, -1)
    const dest = target ?? { name: 'home' as const }
    setScreen(dest)
    window.scrollTo(0, 0)
  }

  function renderDesktopScreen() {
    switch (screen.name) {
      case 'home':
        return <HomeScreen navigate={navigate} />
      case 'library':
        return <LibraryScreen navigate={navigate} />
      case 'search':
        return <LibraryScreen navigate={navigate} />
      case 'add':
        return <AddSongScreen navigate={navigate} />
      case 'timing':
        return <TimingScreen songId={screen.songId} version={screen.version} navigate={navigate} />
      case 'playback':
        return <PlaybackScreen songId={screen.songId} navigate={navigate} goBack={goBack} />
      case 'edit':
        return <EditScreen songId={screen.songId} navigate={navigate} goBack={goBack} />
      case 'settings':
        return <SettingsScreen navigate={navigate} />
      case 'import':
        return <ImportScreen navigate={navigate} goBack={goBack} />
    }
  }

  function renderMobileScreen() {
    // Mobile only handles a subset of Screen names; timing/edit/import are
    // desktop-only and unreachable from mobile UI. Playback overlays the tab
    // bar in a later phase; for now it falls through to the stub.
    switch (screen.name) {
      case 'home':
        return (
          <MobileHome
            navigate={navigate}
            onPickMood={(m) => {
              setPendingMood(m)
              navigate({ name: 'library' })
            }}
          />
        )
      case 'library':
        return (
          <MobileLibrary
            navigate={navigate}
            initialMood={pendingMood}
            onMoodConsumed={() => setPendingMood(null)}
          />
        )
      case 'search':
        return <MobileSearch navigate={navigate} />
      case 'add':
        return <MobileAddSong navigate={navigate} goBack={goBack} />
      case 'settings':
        return <MobileSettings navigate={navigate} />
      case 'playback':
        return <MobileNowPlaying songId={screen.songId} navigate={navigate} goBack={goBack} />
      default:
        return (
          <MobileHome
            navigate={navigate}
            onPickMood={(m) => {
              setPendingMood(m)
              navigate({ name: 'library' })
            }}
          />
        )
    }
  }

  if (isMobile) {
    return (
      <MobileLayout
        screen={screen}
        navigate={navigate}
        hideTabBar={screen.name === 'playback'}
      >
        {renderMobileScreen()}
      </MobileLayout>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <Header navigate={navigate} currentScreen={screen} />
      <main className="flex-1 overflow-auto">{renderDesktopScreen()}</main>
    </div>
  )
}
