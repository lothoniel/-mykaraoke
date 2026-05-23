import { useEffect, useRef, useState } from 'react'

interface YTPlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  playVideo(): void
  pauseVideo(): void
  destroy(): void
}

interface YTPlayerOptions {
  videoId: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (e: { target: YTPlayer }) => void
    onStateChange?: (e: { data: number }) => void
    onError?: (e: { data: number }) => void
  }
}

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement | string, opts: YTPlayerOptions) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number; CUED: number }
    }
    onYouTubeIframeAPIReady: () => void
  }
}

let apiLoaded = false
let apiLoadingCallbacks: Array<() => void> = []

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (apiLoaded) {
      resolve()
      return
    }
    apiLoadingCallbacks.push(resolve)
    if (apiLoadingCallbacks.length > 1) return

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true
      apiLoadingCallbacks.forEach((cb) => cb())
      apiLoadingCallbacks = []
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
}

export type YTPlayerState = 'idle' | 'playing' | 'paused' | 'ended'

export function useYouTube(containerId: string, videoId: string | null) {
  const playerRef = useRef<YTPlayer | null>(null)
  const [playerState, setPlayerState] = useState<YTPlayerState>('idle')
  const [ready, setReady] = useState(false)
  const [playerError, setPlayerError] = useState<number | null>(null)

  useEffect(() => {
    if (!videoId) return

    let destroyed = false
    // playerError reset is handled by the previous effect's cleanup (or by useState's
    // null initial on first mount). Setting it synchronously in the effect body triggers
    // react-hooks/set-state-in-effect.

    loadYouTubeAPI().then(() => {
      if (destroyed) return

      const el = document.getElementById(containerId)
      if (!el) return

      playerRef.current = new window.YT.Player(el, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            if (!destroyed) setReady(true)
          },
          onStateChange: (e) => {
            if (destroyed) return
            const s = window.YT.PlayerState
            if (e.data === s.PLAYING) setPlayerState('playing')
            else if (e.data === s.PAUSED) setPlayerState('paused')
            else if (e.data === s.ENDED) setPlayerState('ended')
          },
          onError: (e) => {
            if (!destroyed) setPlayerError(e.data)
          },
        },
      })
    })

    return () => {
      destroyed = true
      playerRef.current?.destroy()
      playerRef.current = null
      setReady(false)
      setPlayerState('idle')
      setPlayerError(null)
    }
  }, [containerId, videoId])

  function getCurrentTime(): number {
    const p = playerRef.current
    return typeof p?.getCurrentTime === 'function' ? p.getCurrentTime() : 0
  }

  function getDuration(): number {
    const p = playerRef.current
    return typeof p?.getDuration === 'function' ? p.getDuration() : 0
  }

  function seekTo(seconds: number): void {
    const p = playerRef.current
    if (typeof p?.seekTo === 'function') p.seekTo(Math.max(0, seconds), true)
  }

  function pause(): void {
    const p = playerRef.current
    if (typeof p?.pauseVideo === 'function') p.pauseVideo()
  }

  function play(): void {
    const p = playerRef.current
    if (typeof p?.playVideo === 'function') p.playVideo()
  }

  return { ready, playerState, playerError, getCurrentTime, getDuration, seekTo, pause, play }
}
