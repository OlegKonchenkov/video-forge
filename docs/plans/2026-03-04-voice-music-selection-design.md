# Voice & Music Selection — Design Doc

**Date:** 2026-03-04
**Status:** Approved
**Feature:** User-selectable voiceover voice and background music in the video creation wizard

---

## Overview

Add a new **Settings step** (Step 3) to the 4-step video creation wizard that lets users:

1. **Choose a voiceover voice** — Off / Auto / curated list of ~12 ElevenLabs voices with ▶ preview, plus a "Load all voices" button for the full catalogue.
2. **Choose background music** — Auto / mood-category tabs (Corporate, Energetic, Cinematic, Calm, Upbeat), each showing ~3–4 SoundHelix CC0 track cards with ▶ preview.

---

## Wizard Flow

```
Step 1: Input Type  →  Step 2: Your Content  →  Step 3: Settings  →  Step 4: Review
```

State shape added to the wizard:

```ts
voiceId: string | null | 'auto'  // null = Off (no voiceover), 'auto' = AI picks
musicId: string                  // 'auto' or a specific track key e.g. 'corporate_1'
```

---

## Section 1 — UI

### Step 3: Settings

#### Voice Section

```
┌─────────────────────────────────────────────────────────┐
│  Voiceover                                              │
│  [Off]  [Auto ✦]  [Choose Voice]                       │
│                                                         │
│  (when Choose Voice is active)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ 👤 Daniel│ │ 👤 Rachel│ │ 👤 Emily │               │
│  │  ▶ Play  │ │  ▶ Play  │ │  ▶ Play  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
│  ... (9 more curated voices)                            │
│  [ Load all voices ]                                    │
└─────────────────────────────────────────────────────────┘
```

- **Off** → `voiceId = null` — no voiceover audio generated.
- **Auto ✦** → `voiceId = 'auto'` — backend picks voice based on detected language + businessType (formal accent for B2B, energetic for B2C).
- **Choose Voice** → card grid (3 per row). Clicking ▶ plays the ElevenLabs CDN preview URL. Only one preview plays at a time.
- **Load all voices** → calls `/api/voices?curated=false`, adds remaining cards.

Curated list of 12 voice IDs baked into the frontend (no API call needed):

| # | Name | ElevenLabs ID | Character |
|---|------|---------------|-----------|
| 1 | Daniel | `onwK4e9ZLuTAKqWW03F9` | Default, professional male |
| 2 | Rachel | `21m00Tcm4TlvDq8ikWAM` | American female |
| 3 | Clyde | `2EiwWnXFnvU5JabPnv8n` | Deep male |
| 4 | Domi | `AZnzlk1XvdvUeBnXmlld` | Energetic female |
| 5 | Bella | `EXAVITQu4vr4xnSDxMaL` | Warm female |
| 6 | Antoni | `ErXwobaYiN019PkySvjV` | Well-rounded male |
| 7 | Elli | `MF3mGyEYCl7XYWbV9V6O` | Young female |
| 8 | Josh | `TxGEqnHWrfWFTfGW9XjX` | Deep male |
| 9 | Arnold | `VR6AewLTigWG4xSOukaG` | Crisp male |
| 10 | Adam | `pNInz6obpgDQGcFmaJgB` | Narration male |
| 11 | Sam | `yoZ06aMxZJJ28mfd3POQ` | Raspy male |
| 12 | Charlotte | `XB0fDUnXU5powFXDhCwa` | Swedish female |

#### Music Section

```
┌─────────────────────────────────────────────────────────┐
│  Background Music                                       │
│  [Auto ✦] [Corporate] [Energetic] [Cinematic]          │
│           [Calm]      [Upbeat]                          │
│                                                         │
│  (when a category tab is active, e.g. Corporate)        │
│  ┌────────────────┐ ┌────────────────┐                 │
│  │ 🎵 Track 1     │ │ 🎵 Track 2     │                 │
│  │ ▶ Play         │ │ ▶ Play         │                 │
│  └────────────────┘ └────────────────┘                 │
│  ┌────────────────┐                                     │
│  │ 🎵 Track 3     │                                     │
│  │ ▶ Play         │                                     │
│  └────────────────┘                                     │
└─────────────────────────────────────────────────────────┘
```

- **Auto ✦** → `musicId = 'auto'` — backend maps businessType → category → random track.
- Category tabs show ~3–4 SoundHelix CC0 tracks each.
- Clicking a card selects it (highlighted border). Clicking ▶ previews without selecting.
- One audio plays at a time (shared `currentAudio` ref).

Music track registry (frontend constant):

```ts
const MUSIC_TRACKS = {
  corporate:  ['Song-3', 'Song-7', 'Song-11'],
  energetic:  ['Song-1', 'Song-5', 'Song-14'],
  cinematic:  ['Song-6', 'Song-9', 'Song-12'],
  calm:       ['Song-2', 'Song-8', 'Song-15'],
  upbeat:     ['Song-4', 'Song-10', 'Song-17'],
};
// URL pattern: https://www.soundhelix.com/examples/mp3/SoundHelix-{Song-N}.mp3
```

Auto mapping (backend):

```ts
const AUTO_MUSIC_MAP: Record<string, string> = {
  b2b:   'corporate',
  b2c:   'upbeat',
  mixed: 'cinematic',
};
```

---

## Section 2 — Backend & Data Flow

### API Route: `/api/voices`

New Next.js route handler (`apps/web/app/api/voices/route.ts`):

- `GET /api/voices?curated=true` → returns hardcoded 12-voice list (no ElevenLabs API call — just shapes the curated data with `preview_url` from ElevenLabs CDN pattern).
- `GET /api/voices?curated=false` → proxies `GET https://api.elevenlabs.io/v1/voices` with server-side `ELEVENLABS_API_KEY`. Returns full list.
- `export const revalidate = 3600;`

### Job Payload

`apps/worker/src/api/jobs.ts` — add to destructuring and job data:

```ts
const { videoId, userId, inputType, inputData, aspectRatio, resourcePaths, voiceId, musicId } = req.body;
// voiceId: string | null | 'auto'
// musicId: string ('auto' | track key)
```

### TTS (`apps/worker/src/jobs/tts.ts`)

```ts
export async function generateVoiceovers(
  scenes: string[],
  workDir: string,
  voiceId: string | null | 'auto',
): Promise<string[]>
```

- If `voiceId === null` → return `[]` immediately (no files written).
- If `voiceId === 'auto'` → resolve to system-picked voice ID (see below).
- Otherwise → use provided voice ID.

Auto-voice resolution logic (in tts.ts):

```ts
function resolveAutoVoice(lang: string, businessType: string): string {
  if (lang !== 'en' && lang !== 'it') return 'onwK4e9ZLuTAKqWW03F9'; // Daniel fallback
  if (businessType === 'b2b') return 'pNInz6obpgDQGcFmaJgB'; // Adam – authoritative
  if (businessType === 'b2c') return 'AZnzlk1XvdvUeBnXmlld'; // Domi – energetic
  return 'onwK4e9ZLuTAKqWW03F9'; // Daniel default
}
```

### Pipeline (`apps/worker/src/jobs/pipeline.ts`)

Thread `voiceId` and `musicId` through:

```ts
const audioPaths = await generateVoiceovers(voiceoverTexts, workDir, voiceId);
const hasVoiceover = audioPaths.length > 0;
// ... pass hasVoiceover and musicId to render
```

### Render (`apps/worker/src/jobs/render.ts`)

Resolve music:

```ts
function resolveMusicUrl(musicId: string, businessType: string): string {
  const category = musicId === 'auto'
    ? AUTO_MUSIC_MAP[businessType] ?? 'corporate'
    : musicId.split('_')[0]; // e.g. 'corporate_1' → 'corporate'
  const tracks = MUSIC_TRACKS[category];
  const trackName = musicId === 'auto'
    ? tracks[Math.floor(Math.random() * tracks.length)]
    : musicId.split('_')[1]; // e.g. 'Song-3'
  return `https://www.soundhelix.com/examples/mp3/SoundHelix-${trackName}.mp3`;
}
```

Download resolved URL to `public/audio/music/background.mp3` (same path Remotion already reads).

### Remotion Types (`agentforge-video/src/types.ts`)

Add to `AgentForgeAdProps`:

```ts
hasVoiceover: boolean;  // false → skip per-scene Audio tags
```

### `calculateMetadata.ts`

When `hasVoiceover === false`, use fixed 180 frames (6 s @ 30 fps) per scene instead of reading audio files.

### `AgentForgeAd.tsx`

Conditionally render per-scene voiceover `<Audio>` tags based on `hasVoiceover` prop. Background music `<Audio>` always renders (music is always present).

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/app/api/voices/route.ts` | **NEW** — ElevenLabs voice proxy |
| `apps/web/app/(app)/videos/new/page.tsx` | 4-step flow + Settings step UI |
| `apps/worker/src/api/jobs.ts` | Forward `voiceId`, `musicId` |
| `apps/worker/src/jobs/tts.ts` | `voiceId` param, skip/Auto logic |
| `apps/worker/src/jobs/pipeline.ts` | Thread `voiceId`, `musicId`, `hasVoiceover` |
| `apps/worker/src/jobs/render.ts` | Resolve + download music track |
| `agentforge-video/src/types.ts` | `hasVoiceover` in `AgentForgeAdProps` |
| `agentforge-video/src/calculateMetadata.ts` | Fallback 180 frames when no audio |
| `agentforge-video/src/AgentForgeAd.tsx` | Conditional voiceover `<Audio>` |

---

## Success Criteria

- User can turn voiceover Off, select Auto, or pick a specific voice with ▶ preview.
- User can select Auto music or pick a specific track by mood category with ▶ preview.
- Off voiceover generates a valid video with no audio artifacts and correct scene lengths.
- Auto voice resolves server-side without exposing API key to the client.
- Music downloads and plays correctly in the rendered MP4.
- TypeScript check (`npx tsc --noEmit`) passes with zero errors.
