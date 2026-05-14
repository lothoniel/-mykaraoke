import { useEffect, useRef, useState } from 'react'
import type { Screen } from './types'
import NavBar from './components/NavBar'
import HomeScreen from './components/screens/HomeScreen'
import LibraryScreen from './components/screens/LibraryScreen'
import AddSongScreen from './components/screens/AddSongScreen'
import TimingScreen from './components/screens/TimingScreen'
import PlaybackScreen from './components/screens/PlaybackScreen'
import DetailsScreen from './components/screens/DetailsScreen'
import EditScreen from './components/screens/EditScreen'
import SearchScreen from './components/screens/SearchScreen'
import SettingsScreen from './components/screens/SettingsScreen'
import ImportScreen from './components/screens/ImportScreen'
import { exchangeCodeForToken } from './lib/spotify'

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [lastSongId, setLastSongId] = useState<string | undefined>()
  const historyRef = useRef<Screen[]>([])

  useEffect(() => {
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
    if (s.name === 'playback') setLastSongId(s.songId)
    window.scrollTo(0, 0)
  }

  function goBack() {
    const h = historyRef.current
    const target = h[h.length - 1]
    historyRef.current = h.slice(0, -1)
    const dest = target ?? { name: 'home' as const }
    setScreen(dest)
    if (dest.name === 'playback') setLastSongId((dest as { name: 'playback'; songId: string }).songId)
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
      case 'details':
        return <DetailsScreen songId={screen.songId} navigate={navigate} goBack={goBack} />
      case 'edit':
        return <EditScreen songId={screen.songId} navigate={navigate} goBack={goBack} />
      case 'search':
        return <SearchScreen navigate={navigate} />
      case 'settings':
        return <SettingsScreen navigate={navigate} />
      case 'import':
        return <ImportScreen navigate={navigate} goBack={goBack} />
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <NavBar navigate={navigate} currentScreen={screen} lastSongId={lastSongId} />
      {renderScreen()}
    </div>
  )
}
