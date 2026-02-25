# Project: resend-web-adv

## Structure
- `agentforge-video/` — Remotion video project (main work)
- `docs/plans/` — implementation plans

## Remotion Video Workflow
- Render: `cd agentforge-video && npx remotion render AgentForgeAd out/<name>.mp4 --codec h264`
- TypeScript check: `cd agentforge-video && npx tsc --noEmit` (zero output = clean)
- All render/npx commands: use **Bash tool**, NOT Codex MCP (blocked by Windows PSSecurityException)
- `getAudioDurationInSeconds`: import from `@remotion/media-utils`, NOT `@remotion/media`
- `clockWipe()`: requires `{ width: WIDTH, height: HEIGHT }` arguments
- `position: 'absolute'`: needs `as const` in TypeScript strict mode

## Proportional Timing Pattern (voiceover sync)
```ts
const { fps, durationInFrames: dur } = useVideoConfig();
const CUE = dur * 0.15; // fires at 15% of scene's audio duration
```
Scenes receive their `durationInFrames` from `calculateMetadata` (set to audio length + 25-frame padding).
All animation cues use `dur * fraction`, never `fps * N`.

## Exit Animation Pattern
```ts
const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const exitScale = interpolate(frame, [dur * 0.68, dur * 0.68 + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: t => t * t });
```

## API Keys & Services (in `agentforge-video/.env`)
- ElevenLabs TTS: voice `onwK4e9ZLuTAKqWW03F9` (Daniel), model `eleven_multilingual_v2`
- Gemini images: model `gemini-2.5-flash-image` ✅ (others return 404)
- Background music: SoundHelix CC0 ✅ — Pixabay returns 403
- `ffprobe` not available on this machine — use Remotion `calculateMetadata` for audio durations

## Efficiency Notes
- When code is already written in a plan, use `Write` tool in parallel — don't dispatch subagents
- Subagents cost ~10× more tokens for no benefit when code is pre-written
- For new websites: scrape with Playwright → generate voiceover (ElevenLabs) + images (Gemini) + music (SoundHelix) → scaffold Remotion scenes with proportional timing
