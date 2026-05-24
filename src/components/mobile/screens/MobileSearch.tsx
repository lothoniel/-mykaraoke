import { useEffect, useMemo, useState } from 'react'
import type { Screen, Song } from '../../../types'
import * as db from '../../../hooks/useDB'
import { BB } from '../../../lib/bubble'
import { BubbleEyebrow, BubbleIconBtn, BubbleSongRow } from '../atoms'
import { Sparkle, Heart } from '../atoms/stickers'
import { IconSearch, IconClose, IconPlus } from '../atoms/icons'

type Props = {
  navigate: (s: Screen) => void
}

export default function MobileSearch({ navigate }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    db.getAllSongs().then(setSongs)
  }, [])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(term) || s.artist.toLowerCase().includes(term),
    )
  }, [songs, q])

  const showResults = q.trim().length > 0

  return (
    <div style={{ position: 'relative' }}>
      <Heart
        size={18}
        color={BB.primary}
        style={{ position: 'absolute', top: 12, right: 70, transform: 'rotate(-12deg)', opacity: 0.5, pointerEvents: 'none' }}
      />
      <Sparkle
        size={20}
        color={BB.yellow}
        style={{ position: 'absolute', top: 28, left: 8, transform: 'rotate(-10deg)', opacity: 0.7, pointerEvents: 'none' }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '6px 0 18px',
          position: 'relative',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: BB.ink2,
              fontFamily: 'var(--bb-font-script)',
            }}
          >
            what to sing? ✿
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -0.7,
              fontFamily: 'var(--bb-font-display)',
              color: BB.ink,
              marginTop: 2,
            }}
          >
            search<span style={{ color: BB.primary }}>!</span>
          </div>
        </div>
        <BubbleIconBtn color={BB.primary} size={46} onClick={() => navigate({ name: 'add' })}>
          <IconPlus size={20} />
        </BubbleIconBtn>
      </div>

      <div
        style={{
          position: 'relative',
          background: BB.surface,
          borderRadius: 999,
          boxShadow: '0 4px 0 rgba(58,23,64,0.08), inset 0 1px 2px rgba(58,23,64,0.04)',
        }}
      >
        <IconSearch
          size={18}
          style={{
            position: 'absolute',
            left: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            color: BB.ink2,
            pointerEvents: 'none',
          }}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="songs, artists…"
          aria-label="Search your library"
          style={{
            width: '100%',
            height: 50,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: q ? '0 46px 0 46px' : '0 16px 0 46px',
            fontFamily: 'var(--bb-font)',
            fontSize: 14.5,
            fontWeight: 500,
            color: BB.ink,
            boxSizing: 'border-box',
          }}
        />
        {q && (
          <button
            onClick={() => setQ('')}
            aria-label="Clear search"
            style={{
              all: 'unset',
              cursor: 'pointer',
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 26,
              height: 26,
              borderRadius: 999,
              background: BB.bg2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: BB.ink,
            }}
          >
            <IconClose size={12} />
          </button>
        )}
      </div>

      {!showResults && (
        <>
          <BubbleEyebrow decoration={<Sparkle size={18} color={BB.primary} />}>
            tip
          </BubbleEyebrow>
          <div
            style={{
              background: BB.surface,
              borderRadius: 22,
              padding: 18,
              color: BB.ink2,
              fontSize: 13.5,
              fontWeight: 500,
              lineHeight: 1.4,
              boxShadow: '0 2px 0 rgba(58,23,64,0.06)',
              textAlign: 'center',
            }}
          >
            start typing to search your library
            <div style={{ marginTop: 6, fontSize: 12, color: BB.ink3 }}>
              looking for something new? tap + to add a song
            </div>
          </div>
        </>
      )}

      {showResults && (
        <>
          <BubbleEyebrow
            decoration={<Heart size={18} color={BB.primary} />}
            right={results.length > 0 ? `${results.length}` : undefined}
          >
            results
          </BubbleEyebrow>
          {results.length === 0 ? (
            <div
              style={{
                background: BB.surface,
                borderRadius: 22,
                padding: '28px 18px',
                textAlign: 'center',
                boxShadow: '0 2px 0 rgba(58,23,64,0.06)',
              }}
            >
              <div style={{ fontSize: 32 }}>🥺</div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: 'var(--bb-font-display)',
                  fontWeight: 700,
                  fontSize: 16,
                  color: BB.ink,
                }}
              >
                nothing found
              </div>
              <div style={{ marginTop: 4, color: BB.ink2, fontSize: 13 }}>
                try a different word or tap + to add it
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map((s) => (
                <BubbleSongRow
                  key={s.id}
                  song={s}
                  onClick={() => navigate({ name: 'playback', songId: s.id })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
