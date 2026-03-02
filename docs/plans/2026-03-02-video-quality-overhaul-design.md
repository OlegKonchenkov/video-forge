# Video Quality Overhaul — Design Doc
**Date:** 2026-03-02
**Status:** Approved
**Scope:** Script quality, responsive layouts, aspect ratio, image resilience

---

## Problem Summary

Test video on enereco.com/it revealed four categories of issues:

1. **Script quality** — GPT-4o generated B2C consumer copy for a B2B engineering firm; English copy for an Italian website; word-merge bug (`"OutdatedEnergy"`)
2. **Scene layouts** — scenes designed around background images collapse to empty dark voids when Gemini image generation fails
3. **Aspect ratio** — only 16:9 supported; no 9:16 (Instagram Reels, TikTok) option in UI or Remotion
4. **Image generation** — Gemini fails silently (no retry, no useful fallback, no error logging)

---

## Section 1 — Script Quality Stack

### GPT Upgrade
- **Model:** `gpt-4o` → `gpt-5.2` (API id: `gpt-5.2`)
- Cost: ~$0.01 per video script (~4000 tokens in, ~1500 out)
- GPT-5.2 has significantly better B2B/B2C context awareness and structured JSON output

### Language Detection
- `scraper.ts` reads `<html lang="...">` attribute → returns `language: string` (e.g. `"it"`, `"en"`, `"de"`)
- Fallback: detect from `<meta http-equiv="Content-Language">` or default to `"en"`
- `ScrapeResult` gains `language: string` field
- `VideoScript` gains `language: string` field
- `generateScript()` signature: `(sourceText, inputType, accentColor, language)`
- GPT prompt instruction: `"Write ALL copy fields in [language]. Use natural conversational [language]."`

### Word-Merge Fix
- Add explicit prompt rule: `"CRITICAL: Use correct spacing between ALL words in every text field. Never concatenate adjacent words. Example: 'Outdated Energy' not 'OutdatedEnergy'."`

### B2B/B2C Detection
- Scraper scans for B2B signals: `engineering`, `procurement`, `enterprise`, `contractor`, `B2B`, `services for`, `clients`
- Returns `businessType: 'b2b' | 'b2c' | 'mixed'`
- Scriptgen prompt adapts scene selection hint:
  - B2B: prefer `how_it_works`, `feature_list`, `stats_grid`, `comparison`, `testimonial`, `brand_reveal`, `cta`
  - B2C: prefer `pain_hook`, `inbox_chaos`, `offer_countdown`, `before_after`, `product_showcase`

### Deeper Scraping
- Follow up to 3 internal links from homepage (priority: `/services`, `/about`, `/solutions`, `/prodotti`, `/servizi`)
- Total text budget: 5000 → 8000 chars
- Deduplicate and concatenate content before passing to GPT

---

## Section 2 — Responsive Scene Layouts (16:9 ↔ 9:16)

### Aspect Ratio Choice in UI
- `apps/web` video creation form: add radio/toggle `Landscape 16:9` / `Portrait 9:16`
- Default: `16:9`
- Value stored in job payload as `aspectRatio: '16:9' | '9:16'`

### Remotion Dynamic Dimensions
- `calculateMetadata` reads `props.aspectRatio`:
  - `'16:9'` → `{ width: 1920, height: 1080 }`
  - `'9:16'` → `{ width: 1080, height: 1920 }`
- All scenes replace `WIDTH`/`HEIGHT` constants with `useVideoConfig().width` / `.height`
- `constants.ts`: remove exported `WIDTH`/`HEIGHT`; keep `FPS`, `TRANSITION_FRAMES`

### `useSceneLayout()` Hook
New file: `agentforge-video/src/shared/useSceneLayout.ts`

Returns a layout token object derived from `useVideoConfig()`:

```ts
interface SceneLayout {
  isPortrait:     boolean
  // Typography
  displaySize:    number   // Bebas Neue headlines
  headingSize:    number   // DM Sans headings
  bodySize:       number   // DM Sans body
  labelSize:      number   // Mono labels
  // Spacing
  outerPadding:   number
  innerGap:       number
  cardGap:        number
  // Layout
  direction:      'row' | 'column'
  cardWidth:      number | string
  cardHeight:     number
  maxContentWidth: number
}
```

Token values:

| Token | 16:9 | 9:16 |
|---|---|---|
| `displaySize` | 96 | 72 |
| `headingSize` | 48 | 40 |
| `bodySize` | 22 | 20 |
| `labelSize` | 14 | 13 |
| `outerPadding` | 80 | 48 |
| `innerGap` | 32 | 24 |
| `direction` | `'row'` | `'column'` |
| `cardWidth` | `'fill_container'` | `'100%'` |
| `maxContentWidth` | 1760 | 984 |

### Scene Migration Rules
Each of the 15 scenes:
1. Calls `const layout = useSceneLayout()` at the top
2. Replaces hardcoded font sizes with `layout.displaySize`, `layout.headingSize`, etc.
3. Replaces `flexDirection: 'row'` split layouts with `layout.direction`
4. Replaces hardcoded `padding: 80` with `layout.outerPadding`

**Special cases:**
- `SceneBeforeAfter`: portrait → vertical stack (before top / after bottom) with horizontal divider
- `SceneHowItWorks`: portrait → vertical steps with vertical connecting line
- `SceneComparison`: portrait → compact table, hide sub-labels, reduce font sizes
- `SceneStatsGrid`: portrait → 3 cards stacked vertically full-width

### Background Image as Decoration (not structure)
- All scenes that previously used split layout because of a background image now use **full-width content**
- Background image (when present) rendered as full-bleed at `opacity: 0.18` underneath content
- Scenes look complete and polished with OR without a background image

---

## Section 3 — Image Generation Resilience

### Retry Logic
- 3 attempts per scene with exponential backoff: 1s → 2s → 4s
- Catches HTTP 429 (rate limit) and 5xx errors
- Logs actual HTTP status code + first 200 chars of error response

### Better Placeholder
- Replace 1×1 transparent PNG with a **gradient PNG** using the `accentColor`
- Generated via pure Node.js Buffer — no external dependency
- Simple 1920×1080 (or 1080×1920) gradient: `rgba(accent, 0.15)` → `#050d1a`

### og:image Reuse
- Scraped `brandImageUrl` already used for scene 0
- Extended: if Gemini fails for scene N and `brandImageUrl` exists, use it as fallback (with stronger dark overlay in the scene)

### Error Logging
- Log pattern: `[images] scene_${i} (${scene.type}): Gemini failed (HTTP ${status}) - ${errorBody.slice(0,200)}`

---

## Section 4 — Full Change Map

| File | Change |
|---|---|
| `apps/worker/src/jobs/scraper.ts` | Language detect, follow 3 subpages, businessType hint |
| `apps/worker/src/jobs/scriptgen.ts` | Model → `gpt-5.2`, language param, word-merge rule, B2B/B2C hint |
| `apps/worker/src/jobs/images.ts` | Retry ×3 + backoff, gradient placeholder, og:image fallback, error logging |
| `apps/worker/src/jobs/pipeline.ts` | Thread `language` + `aspectRatio` |
| `apps/worker/src/jobs/render.ts` | Pass `aspectRatio` in Remotion props |
| `apps/worker/src/types/script.ts` | Add `language`, `aspectRatio` to `VideoScript` |
| `agentforge-video/src/constants.ts` | Remove `WIDTH`/`HEIGHT` |
| `agentforge-video/src/calculateMetadata.ts` | Return `width`/`height` from `props.aspectRatio` |
| `agentforge-video/src/types.ts` | Add `aspectRatio` to `AgentForgeAdProps` |
| `agentforge-video/src/Root.tsx` | Update default props |
| `agentforge-video/src/AgentForgeAd.tsx` | Remove WIDTH/HEIGHT imports |
| `agentforge-video/src/shared/useSceneLayout.ts` | **New** — layout token hook |
| `agentforge-video/src/scenes/*.tsx` (all 15) | `useSceneLayout()` migration |
| `apps/web` form | 16:9 / 9:16 toggle |

**Estimated scope:** ~22 files, ~600 lines net change. Largest task: 15-scene layout migration (mechanical). Highest risk: `calculateMetadata` dynamic dimensions.

---

## Non-Goals
- Switching image provider away from Gemini (deferred)
- Adding more scene types
- VPS infrastructure changes
