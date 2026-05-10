import { useEffect, useState } from 'react'
import type { Screen } from './types'
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (code && state) {
      window.history.replaceState({}, '', '/')
      exchangeCodeForToken(code, state).then(() => {
        setScreen({ name: 'settings' })
      })
    }
  }, [])

  function navigate(s: Screen) {
    setScreen(s)
    window.scrollTo(0, 0)
  }

  switch (screen.name) {
    case 'home':
      return <HomeScreen navigate={navigate} />
    case 'library':
      return <LibraryScreen navigate={navigate} />
    case 'add':
      return <AddSongScreen navigate={navigate} />
    case 'timing':
      return <TimingScreen songId={screen.songId} navigate={navigate} />
    case 'playback':
      return <PlaybackScreen songId={screen.songId} navigate={navigate} />
    case 'details':
      return <DetailsScreen songId={screen.songId} navigate={navigate} />
    case 'edit':
      return <EditScreen songId={screen.songId} navigate={navigate} />
    case 'search':
      return <SearchScreen navigate={navigate} />
    case 'settings':
      return <SettingsScreen navigate={navigate} />
    case 'import':
      return <ImportScreen navigate={navigate} />
  }
}
