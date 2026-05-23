import { useEffect, useRef, useState } from 'react'
import type { Screen } from './types'
import Sidebar from './components/Sidebar'
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

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const historyRef = useRef<Screen[]>([])

  useEffect(() => {
    applyAccent()
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (code && state) {
      window.history.replaceState({}, '', '/')
      exchangeCodeForToken(code, state).then(() => {
        setScreen({ name: 'library' })
      })
    }
  }, [])

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

  function renderScreen() {
    switch (screen.name) {
      case 'home':
        return <HomeScreen navigate={navigate} />
      case 'library':
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

  return (
    <div className="h-screen flex flex-row bg-bg overflow-hidden">
      <Sidebar navigate={navigate} currentScreen={screen} />
      <main className="flex-1 overflow-auto pt-12 md:pt-0">{renderScreen()}</main>
    </div>
  )
}
