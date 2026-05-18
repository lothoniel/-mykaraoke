import { useEffect, useRef, useState } from 'react'

interface SpotifyEmbedController {
  loadUri(uri: string): void
  play(): void
  pause(): void
  togglePlay(): void
  resume(): void
  seek(seconds: number): void
  destroy(): void
  addListener(
    event: 'ready' | 'playback_update',
    cb: (e: { data: SpotifyPlaybackData }) => void,
  ): void
}

interface SpotifyPlaybackData {
  isPaused: boolean
  isBuffering: boolean
  duration: number // ms
  position: number // ms
}

interface SpotifyIFrameAPI {
  createController(
    el: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    cb: (controller: SpotifyEmbedController) => void,
  ): void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void
  }
}

let apiPromise: Promise<SpotifyIFrameAPI> | null = null

function loadSpotifyAPI(): Promise<SpotifyIFrameAPI> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api)
    const script = document.createElement('script')
    script.src = 'https://open.spotify.com/embed/iframe-api/v1'
    script.async = true
    document.head.appendChild(script)
  })
  return apiPromise
}

export type SpotifyEmbedState = {
  isPaused: boolean
  position: number // seconds
  duration: number // seconds
  ready: boolean
}

export function useSpotifyEmbed(containerId: string, trackId: string | null) {
  const controllerRef = useRef<SpotifyEmbedController | null>(null)
  const [state, setState] = useState<SpotifyEmbedState>({
    isPaused: true,
    position: 0,
    duration: 0,
    ready: false,
  })

  useEffect(() => {
    if (!trackId) return
    let destroyed = false

    loadSpotifyAPI().then((api) => {
      if (destroyed) return
      const el = document.getElementById(containerId)
      if (!el) return

      api.createController(
        el,
        { uri: `spotify:track:${trackId}`, width: '100%', height: '152' },
        (controller) => {
          if (destroyed) {
            controller.destroy()
            return
          }
          controllerRef.current = controller
          controller.addListener('ready', () => {
            if (!destroyed) setState((s) => ({ ...s, ready: true }))
          })
          controller.addListener('playback_update', (e) => {
            if (destroyed) return
            setState({
              isPaused: e.data.isPaused,
              position: e.data.position / 1000,
              duration: e.data.duration / 1000,
              ready: true,
            })
          })
        },
      )
    })

    return () => {
      destroyed = true
      controllerRef.current?.destroy()
      controllerRef.current = null
      setState({ isPaused: true, position: 0, duration: 0, ready: false })
    }
  }, [containerId, trackId])

  function seek(seconds: number) {
    controllerRef.current?.seek(Math.max(0, seconds))
  }

  function togglePlay() {
    controllerRef.current?.togglePlay()
  }

  function pause() {
    controllerRef.current?.pause()
  }

  return { ...state, seek, togglePlay, pause }
}
