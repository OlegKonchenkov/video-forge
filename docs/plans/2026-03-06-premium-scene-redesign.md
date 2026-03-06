# Premium Scene Redesign + Bug Fixes

**Date**: 2026-03-06
**Status**: Approved

---

## Problems

1. **Scraping failure on bot-protected sites** — `axios.get` blocked by Cloudflare/JS rendering (e.g. openai.com). Error: `Failed to scrape URL`.
2. **TTS voiceover never generated** — silent failure when ElevenLabs voice ID unavailable (e.g. `XB0fDUnXU5powFXDhCwa` Charlotte IT not on account). No useful error log. Falls back to no audio with no warning.
3. **Scenes visually uniform and low quality** — all 19 scenes share: same dark radial-gradient, same border-left cards, same spring animation, same noise overlay. No visual differentiation between scene types.

---

## Architecture Decision

**Approach B: Full scene redesign + bug fixes.**

- Fix scraper: Jina Reader API as primary (`https://r.jina.ai/{url}`), axios as fallback.
- Fix TTS: log full error body, fallback to Daniel voice on voice-not-found errors.
- Rewrite all 19 scenes with unique visual identities and new shared primitives.
- Improve scriptgen: richer props, `visualMood` field for AI selection.

---

## Backend Changes

### `apps/worker/src/jobs/scraper.ts`
- Primary: `GET https://r.jina.ai/{encodedUrl}` with header `Accept: text/plain`
- On Jina failure (non-200): fall back to axios raw HTML scrape
- Extract palette, language, businessType from the Jina text response

### `apps/worker/src/jobs/tts.ts`
- Log full error response body (not just status)
- On 400/422 (voice not found): retry once with default Daniel voice `onwK4e9ZLuTAKqWW03F9`
- On 401: throw with clear message about API key
- On 429: add exponential backoff (1 retry after 2s)

### `apps/worker/src/jobs/scriptgen.ts`
- Add `visualMood` field to JSON output: `"cinematic" | "glitch" | "bold" | "clean"`
- Scene types get richer prop options (see per-scene specs below)

---

## New Remotion Shared Primitives

All new components go in `agentforge-video/src/shared/`:

### `ParticleField.tsx`
Floating particle system. Props: `count`, `color`, `size`, `speed`, `opacity`.
Particles drift upward slowly, fade in/out. Pure SVG circles with randomized positions seeded by sceneIndex.

### `GeometricShapes.tsx`
Large decorative SVG shapes. Props: `shape` (`circle|hex|triangle|lines`), `color`, `opacity`, `size`.
Positioned absolutely, animated with slow rotation or pulse.

### `GradientMesh.tsx`
Animated gradient mesh that shifts position over time. Props: `colors[]`, `speed`.
Uses multiple radial gradients with offset animation via interpolate.

### `KineticText.tsx`
Text reveal with blur+scale combo. Props: `text`, `frame`, `startFrame`, `style`.
Blur goes from 20px→0, scale 0.8→1, opacity 0→1. More cinematic than WordByWord.

### `ShimmerOverlay.tsx`
Diagonal shine sweep for buttons/cards. One-shot animation triggered at startFrame.

### `ScanlineEffect.tsx`
Horizontal scanlines for glitch/terminal aesthetic. Opacity ~0.04, no performance impact.

---

## Scene Redesigns (all 19)

### pain_hook — "Warning Split"
- **Left half** (54% landscape / full portrait): Dark background + red/warning diagonal gradient top-left. Headline at scale 1.3 with 3D skew on entry (`rotateX(15deg)→0`). Subtitle in mono font.
- **Right half** (landscape) / **Bottom** (portrait): Each pain card has unique left-border color (red→orange→yellow) with icon area showing a pulsing warning circle. Cards slide from right.
- Background: `GeometricShapes` — large partially-visible circle behind the right column.

### inbox_chaos — "Terminal Overflow"
- Background: dark terminal green `#001a00` or brand-derived dark, `ScanlineEffect` at opacity 0.06.
- Emails render as terminal lines: `> FROM: ...` in monospace, blinking cursor between items.
- `punchWords` appear as full-screen bold white text that flashes then disappears (glitch style).
- Items fall from top with physics-style bounce via spring.

### cost_counter — "Odometer Burn"
- Background: brand dark with `ParticleField` using red/orange particles (cost = fire).
- Stat numbers animate via custom odometer: each digit rolls from 9→target.
- Stats sit inside hexagonal SVG containers.
- Intro text slides up with large letter-spacing animation.

### brand_reveal — "Light Sweep"
- Full black background initially.
- Brand name appears via clip-path from center outward (not left→right).
- After reveal: horizontal light streak sweeps across (white gradient animated).
- `PulseRing` replaced by 4 lines extending from center (cross shape, scale 0→5).
- Tagline fades in with `KineticText`.

### feature_list — "Bento Grid"
- **Landscape**: 2-column bento layout. Left = tall card with headline + sub. Right = 3 feature cards stacked.
- **Portrait**: headline on top, bento 2×2 grid of cards below (3 features + live indicator).
- Each feature card has unique gradient (`av.bg` with different tint per index).
- Card icons are 48px circles with glow shadow.

### stats_grid — "Number Stage"
- `GradientMesh` background with slow-shifting gradients.
- Each stat card: massive number (displaySize * 1.4), gradient text via `-webkit-background-clip: text`.
- Numbers scramble up from 0 with odometer-style reveal.
- Cards have `border-top: 3px solid accentColor` and subtle reflection effect below.

### cta — "Full Bleed Impact"
- Full-screen gradient from brand accent to deep dark (diagonal).
- `ShimmerOverlay` on the CTA button (one-shot shine left→right).
- Headline at 1.2× larger font, split into 2 lines with accent color second line.
- URL appears with neon glow `textShadow: 0 0 20px accentColor`.
- `ParticleField` at low opacity (0.15) for ambient effect.

### testimonial — "Magazine Quote"
- Portrait-style layout: giant quote mark SVG (300px+), quote text centered.
- Background: subtle radial gradient + `GeometricShapes` hexagonal decorative behind text.
- Author: avatar circle (initials-based, generated from name), role in caps below.
- Quote words reveal with `KineticText` (blur+scale) instead of word-by-word.

### before_after — "Wipe Reveal"
- **Landscape**: animated vertical divider wipes from center. Before on left (desaturated/warm), after on right (accent brand color).
- **Portrait**: horizontal wipe, before on top, after on bottom.
- Wipe position animates from 50%→50% (just the reveal), divider line has glow effect.
- Each point in list has a check/x icon with spring animation.

### how_it_works — "Progress Path"
- SVG path connecting the 3 steps draws progressively (strokeDashoffset animation).
- Step nodes are large circles with step number, connected by animated dashed line.
- **Landscape**: horizontal path. **Portrait**: vertical zigzag path.
- Icon/title/description reveal as path reaches each node.

### product_showcase — "Float & Glow"
- Full-screen background image at 90% opacity (no heavy overlay).
- Product name in enormous display font (displaySize * 2.5), animated scale 0.8→1.
- Tagline below with blur KineticText reveal.
- Price badge (if present): pill shape with accent background, bounces in.
- Ambient `GradientMesh` in brand colors at 40% opacity.

### offer_countdown — "Fire Timer"
- Background: gradient from deep dark to brand accent at bottom edge.
- `ParticleField` with orange/red particles rising upward (fire effect).
- Badge pulses with `scale(1)→scale(1.04)→scale(1)` loop.
- Urgency bar fills from 0→100% across the scene duration.
- All text has warm glow shadow (`rgba(255,120,0,0.5)`).

### map_location — "Radar Pulse"
- SVG radar circle centered, `PulseRing` at 3 rings, cross-hair lines.
- Location pin SVG drops from top with bounce.
- Address/city in large display font on card overlay.
- Hours and phone in mono font, typewriter reveal.
- Background: subtle topographic map pattern (SVG path lines).

### team_intro — "Reveal Gallery"
- Cards reveal with cascade animation (staggered 12-frame each).
- Each avatar circle has gradient border (accent color), initials in display font.
- Name in bold, role in mono caps below.
- Background: `GeometricShapes` large circles behind card area at 0.05 opacity.
- Landscape: horizontal row. Portrait: 3-card grid.

### comparison — "Champion Column"
- Brand column has animated highlight that sweeps top→bottom on entry.
- Feature rows reveal with alternating slide direction (odd from left, even from right).
- Brand column has `box-shadow: 0 0 40px glow` that pulses.
- Header uses `KineticText` for brand column title.

### big_stat — "Stadium Screen"
- Stat value occupies 85% viewport height, centered.
- Gradient text: accent color with lighter variant.
- Background: slow zoom on image (Ken Burns effect: `scale(1.0)→scale(1.08)`).
- Overlay gradient from bottom (solid brand color) fades to transparent mid-screen.
- Unit and label animate separately with delay.

### mission_statement — "Manifesto Reveal"
- Statement words reveal with dramatic pause between each word (slower than WordByWord).
- Values appear as 3 pill badges horizontally, each with unique subtle color.
- Background: full-screen image with heavy vignette.
- `GeometricShapes` — large hexagonal grid at 0.05 opacity.

### social_proof — "Trust Wall"
- Badges arranged in 2×2 grid (landscape) or 4-column row (portrait).
- Each badge: outer ring that draws clockwise (SVG stroke animation).
- Value in large display font, label below in caps mono.
- `GradientMesh` background with slow animation.

### timeline — "Milestone Track"
- SVG path backbone draws progressively (same technique as how_it_works).
- **Landscape**: horizontal timeline, events alternate above/below.
- **Portrait**: vertical timeline with offset event cards.
- Each event node: small circle + year in accent + label card that slides in.
- Title at top with `KineticText`.

---

## scriptgen.ts Updates

Add `visualMood` to output JSON:
```json
{ "visualMood": "cinematic" }
```
Values: `cinematic` (default, current dark moody), `bold` (high contrast, large type), `glitch` (scanlines, terminal), `clean` (lighter, more whitespace).

Scenes receive `visualMood` via `SharedSceneProps` and can branch their visuals accordingly (e.g. `pain_hook` in `glitch` mode shows `ScanlineEffect`).

---

## Technical Constraints

- All Remotion constraints from CLAUDE.md apply
- `getAudioDurationInSeconds` from `@remotion/media-utils`
- `clockWipe()` needs `{ width, height }` args
- `position: 'absolute'` needs `as const`
- Proportional timing: `dur * fraction`, never `fps * N`
- No ffprobe — use `calculateMetadata` for durations
- TypeScript strict mode — `npx tsc --noEmit` must be clean

---

## Delivery Order

1. **Fix scraper** (scraper.ts — Jina Reader)
2. **Fix TTS** (tts.ts — error logging + fallback)
3. **New shared primitives** (ParticleField, GeometricShapes, GradientMesh, KineticText, ShimmerOverlay, ScanlineEffect)
4. **Rewrite scenes** in 4 parallel batches:
   - Batch A: pain_hook, inbox_chaos, brand_reveal, cta
   - Batch B: feature_list, stats_grid, big_stat, testimonial
   - Batch C: before_after, how_it_works, product_showcase, offer_countdown
   - Batch D: map_location, team_intro, comparison, cost_counter, mission_statement, social_proof, timeline
5. **TypeScript check**
6. **Commit + push**
