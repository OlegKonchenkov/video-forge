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

## Project Status (as of 2026-03-13)
- ✅ Backend fixed: Jina Reader fallback in `apps/worker/src/jobs/scraper.ts`, Daniel voice fallback in `tts.ts`
- ✅ 6 shared visual primitives added: `agentforge-video/src/shared/` — ParticleField, GeometricShapes, GradientMesh, KineticText, ShimmerOverlay, ScanlineEffect
- ✅ All 19 scenes redesigned with unique visual identities (TypeScript clean, committed, pushed)
- ⚠️ NOT production-ready — scenes need real-render testing and visual refinement
- ⚠️ No end-to-end generation test done after redesign (generate → render → review)

## 🚀 Next Major Feature: AI-Generated Scenes Mode
Goal: UI toggle in `apps/web/` to switch between two generation modes:
- **PREFAB mode** (current): uses the 19 hardcoded scene templates in `agentforge-video/src/scenes/`
- **CODEX mode** (planned): worker calls Codex/Claude API to generate custom scene `.tsx` files from scratch at runtime, writes them to a temp folder, injects them into the Remotion composition, then renders
Implementation approach:
  1. Add `generationMode: 'prefab' | 'codex'` toggle to the generation form in `apps/web/`
  2. In `apps/worker/src/jobs/pipeline.ts`, branch on mode: prefab = existing path, codex = call Claude API with `remotion-best-practices` skill context + scene spec, write generated TSX, render
  3. Use `apps/worker/src/jobs/scriptgen.ts` output as the scene spec fed to Codex

## Shared Visual Primitives (agentforge-video/src/shared/)
- `ParticleField` — floating particle dots, props: count, color, opacity, speed, maxRadius
- `GeometricShapes` — rotating SVG (circles/triangles/hexagons/mixed), props: color, opacity, count, style
- `GradientMesh` — 3-layer oscillating radial gradients, props: colors[3], speed, opacity
- `KineticText` — char-by-char reveal (blur-in/slide-up/scale-in), props: text, startFrame, fps, type, staggerFrames
- `ShimmerOverlay` — diagonal light sweep, props: color, periodFrames, opacity, width
- `ScanlineEffect` — CRT horizontal lines, props: opacity, spacing, color
- `WordByWord` (existing) — already in shared, used for statement/manifesto scenes

## Scene Coding Rules
- **Never use `Math.random()` in render** — causes non-deterministic frames; use: `((Math.sin(i * 127.1 + frame * 311.7) * 43758.5453) % 1 + 1) % 1`
- **No DISPLAY_FONT** — removed from all scenes; use only `FONT` and `MONO_FONT` from `../font`
- **`as const` required** for `position`, `textAlign`, `flexDirection`, `textTransform` in TypeScript strict mode
- **Re-read before parallel Write** — if writing 4+ files in parallel, each must have been Read in current session or Write fails with "File has not been read yet"

## Worker Pipeline (apps/worker/src/jobs/)
- `scraper.ts` — axios first, Jina Reader fallback (`https://r.jina.ai/{url}`) if text < 200 chars
- `tts.ts` — ElevenLabs; on HTTP 400/422 retries with Daniel voice `onwK4e9ZLuTAKqWW03F9`; Charlotte IT `XB0fDUnXU5powFXDhCwa` often not on account
- `pipeline.ts` — orchestrates: scrape → scriptgen → images → tts → render → upload
- `render.ts` — calls `npx remotion render` via child_process; output goes to `out/`
