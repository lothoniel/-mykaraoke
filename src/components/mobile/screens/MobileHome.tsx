import { useEffect, useState } from 'react'
import type { Screen, Song } from '../../../types'
import * as db from '../../../hooks/useDB'
import { BB, darken } from '../../../lib/bubble'
import { getProfile } from '../../../lib/settings'
import { getSongGradient } from '../../../lib/songColor'
import { MOODS, type Mood } from '../../../lib/moods'
import { BubbleAlbum, BubbleChip, BubbleEyebrow, BubbleIconBtn, BubbleSongRow } from '../atoms'
import { Sparkle, Star4, Heart, Flower } from '../atoms/stickers'
import { IconPlus, IconPlay } from '../atoms/icons'

type Props = {
  navigate: (s: Screen) => void
  onPickMood: (m: Mood) => void
}

export default function MobileHome({ navigate, onPickMood }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [recent, setRecent] = useState<Song[]>([])
  const [hero, setHero] = useState<Song | undefined>(undefined)

  useEffect(() => {
    db.getAllSongs().then(setSongs)
    db.getRecentlySung(5).then(setRecent)
    db.getContinueSong().then(setHero)
  }, [])

  const heroGradient = hero ? getSongGradient(hero.id) : null
  const recentRail = recent.filter((s) => s.id !== hero?.id).slice(0, 4)
  const showRecentRail = recent.filter((s) => s.lastPlayedAt).length >= 2
  const slice = songs.slice(0, 4)
  const profileName = getProfile().name

  return (
    <div style={{ position: 'relative' }}>
      <Sparkle
        size={20}
        color={BB.yellow}
        style={{ position: 'absolute', top: 22, right: 80, transform: 'rotate(8deg)', opacity: 0.8, pointerEvents: 'none' }}
      />
      <Heart
        size={14}
        color={BB.primary}
        style={{ position: 'absolute', top: 78, right: 138, transform: 'rotate(-12deg)', opacity: 0.6, pointerEvents: 'none' }}
      />
      <Star4
        size={16}
        color={BB.mint}
        style={{ position: 'absolute', top: 22, left: 198, transform: 'rotate(15deg)', opacity: 0.7, pointerEvents: 'none' }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '6px 0 24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: BB.ink2,
              fontFamily: 'var(--bb-font-script)',
            }}
          >
            hi hi ♡
          </div>
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -0.5,
              fontFamily: 'var(--bb-font-display)',
              color: BB.ink,
              marginTop: 2,
            }}
          >
            {profileName.toLowerCase()}<span style={{ color: BB.primary }}>!</span>
          </div>
        </div>
        <BubbleIconBtn color={BB.primary} size={48} onClick={() => navigate({ name: 'add' })}>
          <IconPlus size={22} />
        </BubbleIconBtn>
      </div>

      {hero && heroGradient && (
        <button
          onClick={() => navigate({ name: 'playback', songId: hero.id })}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'block',
            position: 'relative',
            borderRadius: 28,
            padding: 18,
            width: '100%',
            boxSizing: 'border-box',
            background: `linear-gradient(165deg, ${heroGradient[1]}, ${heroGradient[2]})`,
            boxShadow: `0 8px 0 ${darken(heroGradient[1], 0.2)}, 0 14px 32px ${heroGradient[1]}55`,
            color: '#fff',
          }}
        >
          {hero.isFavorite && (
            <div
              style={{
                position: 'absolute',
                top: -12,
                right: -6,
                background: BB.yellow,
                color: BB.ink,
                padding: '8px 14px',
                borderRadius: 999,
                transform: 'rotate(8deg)',
                boxShadow: `0 4px 0 ${darken(BB.yellow, 0.2)}`,
                fontFamily: 'var(--bb-font-display)',
                fontWeight: 700,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Star4 size={12} color={BB.ink} /> faves
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <BubbleAlbum song={hero} size={82} radius={20} shadow={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--bb-font-display)',
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: -0.4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hero.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  opacity: 0.9,
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hero.artist}
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 14,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              color: BB.ink,
              borderRadius: 999,
              fontFamily: 'var(--bb-font-display)',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <IconPlay size={14} />
            <span>{hero.lastPlayedAt ? 'sing again' : 'sing now'}</span>
          </div>
        </button>
      )}

      {showRecentRail && recentRail.length > 0 && (
        <>
          <BubbleEyebrow decoration={<Sparkle size={18} color={BB.primary} />}>
            recently sung
          </BubbleEyebrow>
          <div
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              margin: '0 -20px',
              padding: '0 20px 6px',
              scrollbarWidth: 'none',
            }}
          >
            {recentRail.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate({ name: 'playback', songId: s.id })}
                style={{ all: 'unset', cursor: 'pointer', flexShrink: 0, width: 132 }}
              >
                <BubbleAlbum song={s} size={132} radius={24} />
                <div
                  style={{
                    fontFamily: 'var(--bb-font-display)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: BB.ink,
                    marginTop: 10,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: BB.ink2,
                    fontWeight: 500,
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.artist}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <BubbleEyebrow decoration={<Flower size={20} color={BB.primary} center={BB.yellow} />}>
        moods
      </BubbleEyebrow>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {MOODS.map((m) => (
          <BubbleChip
            key={m.id}
            active
            color={m.bg}
            ink={m.ink}
            onClick={() => onPickMood(m.id)}
          >
            <span>{m.emoji}</span> {m.label}
          </BubbleChip>
        ))}
      </div>

      <BubbleEyebrow
        decoration={<Star4 size={18} color={BB.mint} />}
        right={
          songs.length > slice.length ? (
            <button
              onClick={() => navigate({ name: 'library' })}
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 12,
                color: BB.ink2,
                fontWeight: 600,
              }}
            >
              see all
            </button>
          ) : undefined
        }
      >
        library ({songs.length})
      </BubbleEyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {songs.length === 0 && (
          <div style={{ color: BB.ink2, fontSize: 14, padding: 16, textAlign: 'center' }}>
            no songs yet — tap + to add one
          </div>
        )}
        {slice.map((s) => (
          <BubbleSongRow
            key={s.id}
            song={s}
            onClick={() => navigate({ name: 'playback', songId: s.id })}
          />
        ))}
      </div>
    </div>
  )
}
