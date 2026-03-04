# Video Quality V2 — Design Doc
**Date:** 2026-03-04
**Status:** Approved

## Problem Statement

Four compounding issues make generated videos feel generic and unpolished:
1. Every scene has a background image even when it hurts readability (comparison tables, cost counters, etc.)
2. Scene colors ignore the brand palette — all videos use the same hardcoded `#050d1a` dark navy
3. Portrait (9:16) is treated as "compressed landscape" — text too small, vertical space wasted
4. Scene selection is too deterministic — all B2B sites produce nearly identical scene sequences

## Decisions

- **Color approach:** B — theme mirrors the website (light sites get bright-shifted dark, dark sites get deep dark)
- **Color extraction:** CSS mining (primary) + GPT inference (fallback if < 2 colors found)
- **Scene variety:** Option C — 4 new scene types + loosened GPT selection rules
- **Portrait philosophy:** "Instagram Reel" not "compressed landscape" — fewer items, bigger text, full vertical bleed

---

## Section 1 — Brand Theme System

### New `BrandPalette` type (scraper.ts + types)
```ts
interface BrandPalette {
  bg:      string;   // primary background hex
  surface: string;   // card/panel background hex
  accent:  string;   // brand accent hex
  text:    string;   // primary text hex
  isDark:  boolean;  // luminance(bg) < 50%
}
```

### CSS Color Mining (scraper.ts)
- Parse all `<style>` blocks and inline `style=""` attributes from scraped HTML
- Extract hex values matching `/#[0-9a-fA-F]{3,6}/g`
- Rank by frequency; skip near-white (#fff*, #f*f*f*) and near-black for accent slot
- Map top colors to palette slots: most-frequent dark → `bg`, most-frequent bright → `accent`, mid-tone → `surface`
- Compute `text` as high-contrast counterpart to `bg` (white for dark bg, near-black for light bg)
- Compute `isDark` via relative luminance formula: `0.2126*R + 0.7152*G + 0.0722*B < 0.5`

### Fallback (GPT inference)
If CSS mining yields < 2 usable hex colors, inject found fragments into the `scriptgen` prompt and ask GPT to output `palette: { bg, surface, accent, text }` explicitly alongside `accentColor`.

### ScriptGen changes (scriptgen.ts)
- Receive `BrandPalette` from scraper and include it in the GPT prompt as context
- GPT outputs `bgColor` and `surfaceColor` in the script JSON in addition to existing `accentColor`
- Scenes clamp colors: if `isDark` → use bg directly; if light site → darken bg by 60% for cinematic feel

### Remotion changes
- `AgentForgeAdProps` + `SharedSceneProps` gain `bgColor: string` and `surfaceColor: string`
- `colorUtils.ts`: new `themeVariants(bgColor, accentColor)` helper replaces the hardcoded `#050d1a` usage
- All 15 scene files: replace `backgroundColor: '#050d1a'` with `backgroundColor: bgColor`
- Dark overlay opacity: `0.75 → 0.50` for `showImage: true` scenes (images breathe more)
- `useSceneLayout` exposes `textColor` and `mutedTextColor` derived from palette

---

## Section 2 — Selective Image Backgrounds

### `showImage` flag
GPT outputs `showImage: boolean` per scene. Default guidance:

| showImage: true (atmosphere) | showImage: false (data is the visual) |
|---|---|
| brand_reveal, testimonial, product_showcase, cta, pain_hook, team_intro, map_location, big_stat, mission_statement | inbox_chaos, cost_counter, comparison, stats_grid, how_it_works, feature_list, before_after, offer_countdown, social_proof, timeline |

GPT can override any default if content justifies it.

### Scene changes
- `SharedSceneProps` gains `showImage: boolean`
- All 15 scenes: wrap image `AbsoluteFill` in `{showImage && ...}` — 1 line per scene
- When `showImage: false`: radial brand-color gradient fills background (already exists in most scenes, promoted to primary)
- When `showImage: true`: overlay opacity 0.75 → 0.50

### images.ts changes
- Skip Gemini generation when `showImage: false` for that scene index → faster pipeline, lower API cost
- Pass `showImageFlags: boolean[]` to `generateImages()`

---

## Section 3 — 4 New Scene Types

All new scenes are portrait-first in design.

### 1. `big_stat`
```
props: { voiceover, value: string, unit: string, label: string, sub: string }
```
Single enormous animated number counting up from 0. Value fills ~60% of screen height in portrait.
`showImage: true` by default. Gemini prompt: dramatic number visualization.

### 2. `mission_statement`
```
props: { voiceover, statement: string, values: [string, string, string] }
```
Full-screen quote built word by word. Three brand value pills appear below with stagger.
`showImage: true` by default.

### 3. `social_proof`
```
props: { voiceover, title: string, badges: Array<{label: string, value: string}> /* 3-4 */ }
```
Grid of credential cards (years in business, clients, certifications, rankings).
`showImage: false` by default — clean gradient background.

### 4. `timeline`
```
props: { voiceover, title: string, events: Array<{year: string, label: string}> /* 3-4 */ }
```
Animated milestone dots: horizontal in landscape (row), vertical in portrait (column).
Spring animations reveal each dot. `showImage: false` by default.

### Registration
- 4 new `.tsx` files in `agentforge-video/src/scenes/`
- Added to `sceneRegistry.ts` discriminated union
- Added to `scriptgen.ts` SCENE_CATALOGUE with selection hints
- Added to `types.ts` prop interfaces + `SceneConfig` union
- Gemini prompt templates added to `images.ts`

---

## Section 4 — GPT Variety

### Randomness seed
Inject `seed: Math.random().toString(36).slice(2,8)` into the prompt header. Instruction: *"Use this seed to vary your scene selection — identical URLs must produce different scene sequences."*

### Loosened selection rules
Replace rigid `"For B2B: must include how_it_works + stats_grid + comparison"` with:
*"These are suggestions, not requirements. Pick the 5-7 scenes that tell the most compelling story for THIS specific business. Vary your selection even across repeated generations of the same URL."*

### New scene hints
- `big_stat` / `timeline`: *"Prefer for established companies with notable numbers or history (founded >10 years ago, large client base, measurable impact)"*
- `mission_statement`: *"Use when the brand has a clear values/mission focus — sustainability, innovation, quality"*
- `social_proof`: *"Use when trust signals are a key differentiator (certifications, awards, client count)"*

### Temperature
Raise `temperature: 0.7 → 0.9` in scriptgen to increase creative variance.

---

## Section 5 — Portrait Screen Maximization

Mental model: **"Instagram Reel"** not "compressed landscape". One bold idea per screen, full vertical bleed.

### useSceneLayout.ts changes
```ts
// Portrait (9:16) — BIGGER, not smaller
displaySize:  100,   // was 72  — hero numbers fill the screen
headingSize:   54,   // was 44  — large, readable at a glance
bodySize:      26,   // was 22
labelSize:     15,   // was 13
outerPadding:  72,   // was 48  — wide side margins = clean mobile feel
innerGap:      56,   // was 28  — generous vertical breathing room
cardGap:       24,   // was 16
maxContentWidth: width - 144,  // was width - 96
```

### Multi-item scene caps in portrait
Scenes with repeated items show **2 items max** in portrait (not 3), with each item taking ~40% of screen height:
- `feature_list`: show 2 features in portrait
- `how_it_works`: show 2 steps in portrait
- `comparison`: show 4 rows max in portrait (was 6)
- `before_after`: 2 points per side in portrait (was 3)
- `stats_grid`: show 2 stats in portrait (was 3)

### Single-stat scenes in portrait
`big_stat`, `cost_counter`: value font size = `Math.min(displaySize * 1.8, height * 0.35)` — dynamically fills vertical space.

---

## Files Changed

| File | Change |
|---|---|
| `apps/worker/src/jobs/scraper.ts` | CSS color mining → `BrandPalette` |
| `apps/worker/src/jobs/scriptgen.ts` | Pass palette, seed, loose rules, 4 new scenes, temperature 0.9 |
| `apps/worker/src/jobs/images.ts` | Accept `showImageFlags[]`, skip Gemini when false |
| `apps/worker/src/jobs/pipeline.ts` | Pass `bgColor`, `surfaceColor`, `showImageFlags` downstream |
| `apps/worker/src/types/script.ts` | Add `bgColor`, `surfaceColor`, `showImage` to SceneConfig |
| `agentforge-video/src/types.ts` | Add `bgColor`, `surfaceColor`, `showImage` to props |
| `agentforge-video/src/shared/colorUtils.ts` | Add `themeVariants()` |
| `agentforge-video/src/shared/useSceneLayout.ts` | New portrait sizes + `textColor`/`mutedTextColor` |
| All 15 scene `.tsx` files | `bgColor`, `showImage`, overlay opacity, portrait item caps |
| `agentforge-video/src/scenes/SceneBigStat.tsx` | NEW |
| `agentforge-video/src/scenes/SceneMissionStatement.tsx` | NEW |
| `agentforge-video/src/scenes/SceneSocialProof.tsx` | NEW |
| `agentforge-video/src/scenes/SceneTimeline.tsx` | NEW |
| `agentforge-video/src/sceneRegistry.ts` | Register 4 new scenes |
