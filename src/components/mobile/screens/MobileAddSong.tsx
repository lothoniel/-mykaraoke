import { useEffect, useMemo, useRef, useState } from 'react'
import type { Screen, Song, SpotifyTrackSummary } from '../../../types'
import * as db from '../../../hooks/useDB'
import {
  extractTrackId,
  getLikedSongs,
  getStoredOAuthToken,
  getTrackMetadata,
  type SpotifyTrackMeta,
} from '../../../lib/spotify'
import { extractVideoId } from '../../../lib/youtube'
import { fetchLyrics, type LrclibResult } from '../../../lib/lrclib'
import { generateId } from '../../../lib/id'
import { BB, darken } from '../../../lib/bubble'
import { BubbleButton, BubbleChip, BubbleEyebrow, BubbleIconBtn, BubbleSongRow } from '../atoms'
import { Sparkle, Heart, Star4 } from '../atoms/stickers'
import {
  IconBack,
  IconClose,
  IconLink,
  IconPlus,
  IconSpotify,
  IconCheck,
} from '../atoms/icons'

type Props = {
  navigate: (s: Screen) => void
  goBack: () => void
}

type Step = 'chooser' | 'paste' | 'fetching' | 'confirm' | 'added'

type SongDraft = {
  title: string
  artist: string
  spotifyTrackId?: string
  youtubeLink?: string
  spotifyLink?: string
  coverArt?: string
  duration?: number
  releaseDate?: string
  popularity?: number
  genres?: string[]
}

type FetchTask = { id: string; label: string; status: 'pending' | 'running' | 'done' | 'failed' }

export default function MobileAddSong({ navigate, goBack }: Props) {
  const [step, setStep] = useState<Step>('chooser')
  const [linkInput, setLinkInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [artistInput, setArtistInput] = useState('')
  const [spotifyMeta, setSpotifyMeta] = useState<SpotifyTrackMeta | null>(null)
  const [spotifyError, setSpotifyError] = useState<string | null>(null)
  const [draft, setDraft] = useState<SongDraft | null>(null)
  const [lrc, setLrc] = useState<LrclibResult | null>(null)
  const [tasks, setTasks] = useState<FetchTask[]>([])
  const [savedSongTitle, setSavedSongTitle] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [likedTracks, setLikedTracks] = useState<SpotifyTrackSummary[] | null>(null)
  const likesFetchedRef = useRef(false)
  const spotifyConnected = !!getStoredOAuthToken()

  const pasteTrackId = useMemo(() => extractTrackId(linkInput), [linkInput])
  const pasteYtId = useMemo(() => extractVideoId(linkInput), [linkInput])

  // Auto-fetch Spotify metadata when paste input contains a Spotify track URL.
  // Setters only fire inside async callbacks to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    if (step !== 'paste' || !pasteTrackId || !spotifyConnected) return
    let cancelled = false
    getTrackMetadata(pasteTrackId)
      .then((meta) => {
        if (cancelled) return
        setSpotifyMeta(meta)
        setSpotifyError(null)
        setTitleInput((t) => (t.trim() ? t : meta.title))
        setArtistInput((a) => (a.trim() ? a : meta.artist))
      })
      .catch((e) => {
        if (cancelled) return
        setSpotifyError((e as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [pasteTrackId, step, spotifyConnected])

  // Load liked songs once when entering the chooser (if connected).
  useEffect(() => {
    if (step !== 'chooser' || !spotifyConnected || likesFetchedRef.current) return
    likesFetchedRef.current = true
    getLikedSongs()
      .then((items) => setLikedTracks(items.slice(0, 6)))
      .catch(() => setLikedTracks([]))
  }, [step, spotifyConnected])

  async function runFetchPipeline(initialDraft: SongDraft) {
    setErrorMsg(null)
    const taskList: FetchTask[] = [
      { id: 'meta', label: 'preparing song info ♬', status: 'pending' },
      { id: 'lyrics', label: 'looking up lyrics on LRCLIB ✿', status: 'pending' },
      { id: 'align', label: 'aligning timestamps…', status: 'pending' },
    ]
    setTasks(taskList)

    let working: SongDraft = { ...initialDraft }

    // Step 1: metadata
    setTasks((t) => t.map((x) => (x.id === 'meta' ? { ...x, status: 'running' } : x)))
    if (working.spotifyTrackId && !working.coverArt && spotifyConnected) {
      try {
        const meta = await getTrackMetadata(working.spotifyTrackId)
        working = {
          ...working,
          title: working.title || meta.title,
          artist: working.artist || meta.artist,
          coverArt: meta.coverArt,
          duration: meta.duration,
          releaseDate: meta.releaseDate,
          popularity: meta.popularity,
        }
      } catch {
        // ignore — continue without enrichment
      }
    }
    setTasks((t) => t.map((x) => (x.id === 'meta' ? { ...x, status: 'done' } : x)))

    // Step 2: lyrics
    setTasks((t) => t.map((x) => (x.id === 'lyrics' ? { ...x, status: 'running' } : x)))
    let result: LrclibResult | null = null
    if (working.title && working.artist) {
      try {
        result = await fetchLyrics(
          working.title,
          working.artist,
          working.duration ? working.duration / 1000 : undefined,
        )
      } catch {
        result = null
      }
    }
    setLrc(result)
    setTasks((t) =>
      t.map((x) =>
        x.id === 'lyrics'
          ? { ...x, status: result ? 'done' : 'failed', label: result ? x.label : 'no lyrics found · save anyway' }
          : x,
      ),
    )

    // Step 3: alignment (purely cosmetic — LRCLIB gives timings or it doesn't)
    setTasks((t) => t.map((x) => (x.id === 'align' ? { ...x, status: 'running' } : x)))
    await new Promise((r) => setTimeout(r, 350))
    setTasks((t) =>
      t.map((x) =>
        x.id === 'align'
          ? {
              ...x,
              status: result?.timings ? 'done' : 'failed',
              label: result?.timings ? x.label : 'no synced timings · plain lyrics only',
            }
          : x,
      ),
    )

    setDraft(working)
    await new Promise((r) => setTimeout(r, 400))
    setStep('confirm')
  }

  function startFromPaste() {
    if (!pasteYtId && !pasteTrackId) {
      setErrorMsg('paste a YouTube or Spotify track link')
      return
    }
    if (!titleInput.trim() || !artistInput.trim()) {
      setErrorMsg('title and artist needed')
      return
    }
    const newDraft: SongDraft = {
      title: titleInput.trim(),
      artist: artistInput.trim(),
      youtubeLink: pasteYtId ? linkInput.trim() : undefined,
      spotifyLink: pasteTrackId ? linkInput.trim() : undefined,
      spotifyTrackId: pasteTrackId ?? undefined,
      coverArt: spotifyMeta?.coverArt,
      duration: spotifyMeta?.duration,
      releaseDate: spotifyMeta?.releaseDate,
      popularity: spotifyMeta?.popularity,
    }
    setErrorMsg(null)
    setStep('fetching')
    runFetchPipeline(newDraft)
  }

  function startFromLikedTrack(t: SpotifyTrackSummary) {
    const newDraft: SongDraft = {
      title: t.title,
      artist: t.artist,
      spotifyTrackId: t.id,
      spotifyLink: `https://open.spotify.com/track/${t.id}`,
      coverArt: t.coverArt,
      duration: t.duration,
      releaseDate: t.releaseDate,
      popularity: t.popularity,
    }
    setErrorMsg(null)
    setStep('fetching')
    runFetchPipeline(newDraft)
  }

  async function saveSong() {
    if (!draft) return
    const song: Song = {
      id: generateId(),
      title: draft.title,
      artist: draft.artist,
      spotifyLink: draft.spotifyLink,
      spotifyTrackId: draft.spotifyTrackId,
      youtubeLink: draft.youtubeLink,
      coverArt: draft.coverArt,
      lyrics: lrc?.lyrics ?? [],
      timings: lrc?.timings ?? [],
      isFavorite: false,
      createdAt: new Date(),
      duration: draft.duration,
      releaseDate: draft.releaseDate,
      popularity: draft.popularity,
    }
    await db.addSong(song)
    setSavedSongTitle(song.title)
    setStep('added')
  }

  // Auto-close after the "added" confirmation
  useEffect(() => {
    if (step !== 'added') return
    const t = setTimeout(() => navigate({ name: 'home' }), 1700)
    return () => clearTimeout(t)
  }, [step, navigate])

  function dismissOrBack() {
    if (step === 'chooser') goBack()
    else if (step === 'paste') setStep('chooser')
    else if (step === 'confirm') {
      setStep('paste')
    } else {
      // fetching/added: just go home
      navigate({ name: 'home' })
    }
  }

  const headerLabel =
    step === 'chooser'
      ? 'add a song'
      : step === 'paste'
        ? 'paste a link'
        : step === 'fetching'
          ? 'one sec ✿'
          : step === 'confirm'
            ? 'looks good?'
            : 'added ♡'

  return (
    <div style={{ position: 'relative' }}>
      <Sparkle
        size={18}
        color={BB.yellow}
        style={{ position: 'absolute', top: 6, right: 22, transform: 'rotate(8deg)', opacity: 0.7, pointerEvents: 'none' }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 0 18px',
        }}
      >
        <BubbleIconBtn color={BB.surface} ink={BB.ink} size={40} onClick={dismissOrBack} ariaLabel="Back">
          {step === 'chooser' ? <IconClose size={16} /> : <IconBack size={18} />}
        </BubbleIconBtn>
        <div
          style={{
            fontFamily: 'var(--bb-font-display)',
            fontWeight: 700,
            fontSize: 14,
            color: BB.ink,
          }}
        >
          {headerLabel}
        </div>
        <div style={{ width: 40 }} />
      </div>

      {step === 'chooser' && (
        <ChooserStep
          spotifyConnected={spotifyConnected}
          likedTracks={likedTracks}
          likedLoading={spotifyConnected && likedTracks === null}
          onPaste={() => setStep('paste')}
          onPickLiked={startFromLikedTrack}
        />
      )}

      {step === 'paste' && (
        <PasteStep
          link={linkInput}
          title={titleInput}
          artist={artistInput}
          onLink={setLinkInput}
          onTitle={setTitleInput}
          onArtist={setArtistInput}
          pasteTrackId={pasteTrackId}
          pasteYtId={pasteYtId}
          spotifyMeta={spotifyMeta}
          spotifyError={spotifyError}
          error={errorMsg}
          onContinue={startFromPaste}
        />
      )}

      {step === 'fetching' && <FetchingStep tasks={tasks} />}

      {step === 'confirm' && draft && (
        <ConfirmStep draft={draft} lrc={lrc} onSave={saveSong} onBack={() => setStep('paste')} />
      )}

      {step === 'added' && <AddedStep title={savedSongTitle} />}
    </div>
  )
}

// ── Chooser ───────────────────────────────────────────────────────────────────

function ChooserStep({
  spotifyConnected,
  likedTracks,
  likedLoading,
  onPaste,
  onPickLiked,
}: {
  spotifyConnected: boolean
  likedTracks: SpotifyTrackSummary[] | null
  likedLoading: boolean
  onPaste: () => void
  onPickLiked: (t: SpotifyTrackSummary) => void
}) {
  return (
    <>
      <button
        onClick={onPaste}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          width: '100%',
          background: BB.surface,
          padding: 18,
          borderRadius: 22,
          boxShadow: `0 4px 0 rgba(58,23,64,0.08)`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 999,
              background: BB.primary,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 0 ${darken(BB.primary, 0.18)}`,
            }}
          >
            <IconLink size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--bb-font-display)',
                fontWeight: 700,
                fontSize: 17,
                color: BB.ink,
              }}
            >
              paste a link
            </div>
            <div style={{ fontSize: 12.5, color: BB.ink2, marginTop: 2 }}>
              youtube or spotify — we figure out the rest
            </div>
          </div>
        </div>
      </button>

      {spotifyConnected ? (
        <>
          <BubbleEyebrow decoration={<Heart size={18} color={BB.primary} />}>
            from your likes
          </BubbleEyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {likedLoading && (
              <div style={{ color: BB.ink2, fontSize: 13, textAlign: 'center', padding: 12 }}>
                loading your likes…
              </div>
            )}
            {!likedLoading && (likedTracks?.length ?? 0) === 0 && (
              <div style={{ color: BB.ink2, fontSize: 13, textAlign: 'center', padding: 12 }}>
                no liked songs found
              </div>
            )}
            {likedTracks?.map((t) => (
              <LikedRow key={t.id} track={t} onAdd={() => onPickLiked(t)} />
            ))}
          </div>
        </>
      ) : (
        <>
          <BubbleEyebrow decoration={<Star4 size={18} color={BB.mint} />}>
            spotify
          </BubbleEyebrow>
          <div
            style={{
              background: BB.surface,
              borderRadius: 22,
              padding: 18,
              fontSize: 13,
              color: BB.ink2,
              textAlign: 'center',
              boxShadow: '0 2px 0 rgba(58,23,64,0.06)',
            }}
          >
            <IconSpotify size={18} />
            <div style={{ marginTop: 6 }}>
              connect Spotify in Settings to add from your likes
            </div>
          </div>
        </>
      )}
    </>
  )
}

function LikedRow({ track, onAdd }: { track: SpotifyTrackSummary; onAdd: () => void }) {
  // Adapt SpotifyTrackSummary into the Song shape BubbleSongRow needs
  const fakeSong = useMemo(
    () =>
      ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        coverArt: track.coverArt,
        lyrics: [],
        timings: [],
        isFavorite: false,
        createdAt: new Date(),
      }) as unknown as Song,
    [track],
  )
  return (
    <BubbleSongRow
      song={fakeSong}
      showFav={false}
      onClick={onAdd}
      trailing={
        <BubbleIconBtn color={BB.primary} size={34} ariaLabel="Add this song">
          <IconPlus size={16} />
        </BubbleIconBtn>
      }
    />
  )
}

// ── Paste step ────────────────────────────────────────────────────────────────

function PasteStep({
  link,
  title,
  artist,
  onLink,
  onTitle,
  onArtist,
  pasteTrackId,
  pasteYtId,
  spotifyMeta,
  spotifyError,
  error,
  onContinue,
}: {
  link: string
  title: string
  artist: string
  onLink: (v: string) => void
  onTitle: (v: string) => void
  onArtist: (v: string) => void
  pasteTrackId: string | null
  pasteYtId: string | null
  spotifyMeta: SpotifyTrackMeta | null
  spotifyError: string | null
  error: string | null
  onContinue: () => void
}) {
  const inputBase = {
    width: '100%',
    height: 48,
    background: BB.surface,
    border: 'none',
    outline: 'none',
    borderRadius: 14,
    padding: '0 14px',
    fontFamily: 'var(--bb-font)',
    fontSize: 14.5,
    color: BB.ink,
    boxShadow: '0 2px 0 rgba(58,23,64,0.06)',
    boxSizing: 'border-box' as const,
  }
  const hasYt = !!pasteYtId
  const hasSpotify = !!pasteTrackId
  return (
    <>
      <div style={{ position: 'relative' }}>
        <IconLink
          size={18}
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: BB.ink2,
            pointerEvents: 'none',
          }}
        />
        <input
          value={link}
          onChange={(e) => onLink(e.target.value)}
          placeholder="https://open.spotify.com/track/… or youtu.be/…"
          aria-label="Song link"
          style={{ ...inputBase, paddingLeft: 42 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {hasSpotify && (
          <BubbleChip active color={BB.mint} ink={BB.ink}>
            <IconSpotify size={12} /> spotify track
          </BubbleChip>
        )}
        {hasYt && (
          <BubbleChip active color={BB.primary}>
            youtube
          </BubbleChip>
        )}
      </div>

      {spotifyMeta && (
        <div
          style={{
            marginTop: 14,
            background: BB.surface,
            borderRadius: 18,
            padding: 12,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            boxShadow: '0 2px 0 rgba(58,23,64,0.06)',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: spotifyMeta.coverArt
                ? `url(${spotifyMeta.coverArt}) center/cover`
                : BB.bg2,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--bb-font-display)',
                fontWeight: 700,
                fontSize: 14,
                color: BB.ink,
              }}
            >
              {spotifyMeta.title}
            </div>
            <div style={{ fontSize: 11.5, color: BB.ink2, marginTop: 2 }}>
              {spotifyMeta.artist}
            </div>
          </div>
          <IconCheck size={16} style={{ color: BB.mint }} />
        </div>
      )}

      {spotifyError && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#D14B6A' }}>
          couldn't reach Spotify · enter title and artist by hand
        </div>
      )}

      <BubbleEyebrow decoration={<Sparkle size={18} color={BB.primary} />}>
        details
      </BubbleEyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="song title"
          aria-label="Title"
          style={inputBase}
        />
        <input
          value={artist}
          onChange={(e) => onArtist(e.target.value)}
          placeholder="artist"
          aria-label="Artist"
          style={inputBase}
        />
      </div>

      {error && (
        <div style={{ marginTop: 12, fontSize: 13, color: '#D14B6A', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <BubbleButton
          block
          color={BB.primary}
          onClick={onContinue}
          disabled={!link.trim() || !title.trim() || !artist.trim()}
        >
          keep going →
        </BubbleButton>
      </div>
    </>
  )
}

// ── Fetching ──────────────────────────────────────────────────────────────────

function FetchingStep({ tasks }: { tasks: FetchTask[] }) {
  return (
    <div
      style={{
        background: BB.surface,
        borderRadius: 22,
        padding: 18,
        boxShadow: '0 4px 0 rgba(58,23,64,0.06)',
        marginTop: 12,
      }}
    >
      <style>{`
        @keyframes bb-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tasks.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  t.status === 'done' ? BB.mint : t.status === 'failed' ? BB.bg2 : BB.bgSoft,
                color: t.status === 'done' ? BB.ink : t.status === 'failed' ? BB.ink2 : BB.ink2,
                flexShrink: 0,
              }}
            >
              {t.status === 'done' && <IconCheck size={14} />}
              {t.status === 'failed' && <IconClose size={12} />}
              {t.status === 'running' && (
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    border: `2.5px solid ${BB.primary}`,
                    borderTopColor: 'transparent',
                    animation: 'bb-spin 0.8s linear infinite',
                  }}
                />
              )}
              {t.status === 'pending' && (
                <span style={{ width: 6, height: 6, borderRadius: 999, background: BB.ink3 }} />
              )}
            </div>
            <div
              style={{
                fontFamily: 'var(--bb-font-display)',
                fontWeight: 600,
                fontSize: 14,
                color: t.status === 'failed' ? BB.ink2 : BB.ink,
              }}
            >
              {t.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Confirm ───────────────────────────────────────────────────────────────────

function ConfirmStep({
  draft,
  lrc,
  onSave,
  onBack,
}: {
  draft: SongDraft
  lrc: LrclibResult | null
  onSave: () => void
  onBack: () => void
}) {
  const lineCount = lrc?.lyrics.length ?? 0
  const timedCount = lrc?.timings?.length ?? 0
  return (
    <>
      <div
        style={{
          background: BB.surface,
          borderRadius: 22,
          padding: 14,
          boxShadow: '0 4px 0 rgba(58,23,64,0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: draft.coverArt
                ? `url(${draft.coverArt}) center/cover`
                : `linear-gradient(135deg, ${BB.primary}, ${BB.lilac})`,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--bb-font-display)',
                fontWeight: 700,
                fontSize: 16,
                color: BB.ink,
              }}
            >
              {draft.title}
            </div>
            <div style={{ fontSize: 12.5, color: BB.ink2, marginTop: 2 }}>{draft.artist}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {draft.spotifyTrackId && (
                <BubbleChip active color={BB.mint} ink={BB.ink}>
                  <IconSpotify size={11} /> spotify
                </BubbleChip>
              )}
              {draft.youtubeLink && (
                <BubbleChip active color={BB.primary}>
                  youtube
                </BubbleChip>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}
      >
        <StatTile color={BB.sky} label="lines" value={String(lineCount)} />
        <StatTile color={BB.mint} label="timed" value={`${timedCount}/${lineCount || 0}`} />
        <StatTile color={BB.cream} label="source" value={lrc ? 'LRCLIB' : 'none'} />
      </div>

      <BubbleEyebrow decoration={<Star4 size={18} color={BB.primary} />}>
        lyric preview
      </BubbleEyebrow>
      <div
        style={{
          background: BB.surface,
          borderRadius: 22,
          padding: 14,
          fontSize: 12.5,
          color: BB.ink2,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          lineHeight: 1.55,
          boxShadow: '0 2px 0 rgba(58,23,64,0.06)',
        }}
      >
        {lineCount === 0 ? (
          <span style={{ color: BB.ink3 }}>
            no lyrics yet — you can add them on desktop later
          </span>
        ) : (
          <>
            {lrc!.lyrics.slice(0, 5).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {lineCount > 5 && (
              <div style={{ marginTop: 6, color: BB.ink3 }}>+ {lineCount - 5} more lines</div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <BubbleButton block color={BB.surface} ink={BB.ink} onClick={onBack}>
          back
        </BubbleButton>
        <BubbleButton block color={BB.primary} onClick={onSave}>
          save & sing ✨
        </BubbleButton>
      </div>
    </>
  )
}

function StatTile({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div
      style={{
        background: color,
        borderRadius: 16,
        padding: '10px 8px',
        textAlign: 'center',
        boxShadow: `0 3px 0 ${darken(color, 0.18)}`,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--bb-font-display)',
          fontWeight: 700,
          fontSize: 16,
          color: BB.ink,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: BB.ink2, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Added ─────────────────────────────────────────────────────────────────────

function AddedStep({ title }: { title: string }) {
  const popRef = useRef<HTMLDivElement | null>(null)
  return (
    <div
      style={{
        marginTop: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes bb-pop {
          0% { transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
      <Sparkle
        size={20}
        color={BB.yellow}
        style={{ position: 'absolute', top: -10, left: '32%', transform: 'rotate(-10deg)', pointerEvents: 'none' }}
      />
      <Heart
        size={16}
        color={BB.primary}
        style={{ position: 'absolute', top: 8, right: '32%', transform: 'rotate(15deg)', pointerEvents: 'none' }}
      />
      <div
        ref={popRef}
        style={{
          width: 92,
          height: 92,
          borderRadius: 999,
          background: BB.primary,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 6px 0 ${darken(BB.primary, 0.2)}, 0 12px 28px ${BB.primary}66`,
          animation: 'bb-pop 0.4s cubic-bezier(.2,1.2,.4,1) both',
        }}
      >
        <IconCheck size={40} />
      </div>
      <div
        style={{
          fontFamily: 'var(--bb-font-display)',
          fontWeight: 700,
          fontSize: 22,
          color: BB.ink,
          letterSpacing: -0.4,
        }}
      >
        in your library ♡
      </div>
      <div
        style={{
          fontSize: 14,
          color: BB.ink2,
          fontFamily: 'var(--bb-font-script)',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        {title} is ready to sing ✿
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: BB.ink3 }}>
        going home in a moment…
      </div>
    </div>
  )
}

