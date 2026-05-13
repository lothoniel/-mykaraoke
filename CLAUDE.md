# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://127.0.0.1:5174 (port is hardcoded — Spotify OAuth redirect URI depends on it)
npm run build      # tsc + vite build
npm run lint       # ESLint
```

No tests exist in this project.

## Environment

Copy `.env.local.example` to `.env.local` and fill in Spotify credentials. Both `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_CLIENT_SECRET` are required for track metadata fetching. The OAuth redirect URI is hardcoded to `http://127.0.0.1:5174/` in `src/lib/spotify.ts`.

## Architecture

Client-side SPA (React 19 + Vite). No backend. All data is persisted in IndexedDB via **Dexie** (`src/lib/db.ts`, database name `mykaraoke-db`).

**Navigation** is a single `Screen` union type (`src/types/index.ts`). `App.tsx` holds the active screen in state and passes a `navigate(s: Screen)` callback down to each screen component — there is no router library.

**Data access** lives entirely in `src/hooks/useDB.ts` (despite the name, it is not a hook — it exports plain async functions that call the Dexie `db` singleton). All screen components import `* as db from '../../hooks/useDB'`.

**External integrations:**
- `src/lib/spotify.ts` — two auth flows: client-credentials (for public track metadata, keyed from env vars) and PKCE OAuth (for user's liked songs / playlists, token stored in `localStorage`). The OAuth callback is handled in `App.tsx` on mount.
- `src/lib/lrclib.ts` — fetches synced (LRC) or plain lyrics from lrclib.net. Returns `Timing[]` if synced timestamps are available, `null` for plain lyrics.
- `src/lib/youtube.ts` — URL parsing helpers and time formatters only.
- `src/hooks/useYouTube.ts` — lazily loads the YouTube IFrame API (module-level singleton) and wraps a `YT.Player` instance. Each screen that embeds a player generates a unique DOM id via `useId()` to avoid collisions.

**The timing workflow** is the core feature: `TimingScreen` embeds a YouTube player and lets users tap "Mark Time" to associate each lyric line (`lineIndex`) with a playback timestamp (seconds). `PlaybackScreen` polls `getCurrentTime()` every 150ms while playing to highlight the current lyric line in real time.

**Song data model** (`src/types/index.ts`): `lyrics: string[]` and `timings: Timing[]` are parallel — timings reference lyrics by `lineIndex`. Spotify metadata (`duration`, `genres`, etc.) is cached at add time, not re-fetched.

## Design tokens

Custom Tailwind colors: `canvas` (page bg), `lavender` / `lavender-dark` / `lavender-light` / `lavender-soft` (primary accent palette), `ink` (main text), `muted` (secondary text). Use these rather than generic grays.

## Key constraints

- Always use `generateId()` from `src/lib/id.ts` (not `crypto.randomUUID()` directly) — the fallback handles non-HTTPS / iPhone LAN contexts.
- The dev server must run on port 5174 — changing it breaks Spotify OAuth.
