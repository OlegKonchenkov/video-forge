# Scene Library + Dynamic Assembly — Design Doc
_2026-03-02_

## Problem

The current video pipeline always produces the same 7-scene structure with the same visual layouts. Only text and audio change per render. A dentist clinic ad, a SaaS product ad, and a restaurant ad all look structurally identical.

Goal: every generated video has a unique scene selection, order, and visual identity appropriate for that business.

---

## Decisions

| Question | Decision |
|----------|----------|
| Scene variety | Scene Registry + Dynamic Assembly (Approach B) |
| Business coverage | All types (B2B SaaS, local service, ecommerce, healthcare, any URL) |
| Visual style | Unified dark/cinematic base + brand accent color extracted from website |
| Scene count | Variable: 4–7 per video, GPT-4o selects |
| Extensibility | New scene = 1 React file + 1 registry entry + update GPT prompt |

---

## Architecture

### 1. Discriminated Union — `SceneConfig`

```ts
// agentforge-video/src/types.ts
type SceneConfig =
  | { type: 'pain_hook';       props: ScenePainHookProps }
  | { type: 'inbox_chaos';     props: SceneInboxChaosProps }
  | { type: 'cost_counter';    props: SceneCostCounterProps }
  | { type: 'brand_reveal';    props: SceneBrandRevealProps }
  | { type: 'feature_list';    props: SceneFeatureListProps }
  | { type: 'stats_grid';      props: SceneStatsGridProps }
  | { type: 'cta';             props: SceneCTAProps }
  | { type: 'testimonial';     props: SceneTestimonialProps }
  | { type: 'before_after';    props: SceneBeforeAfterProps }
  | { type: 'how_it_works';    props: SceneHowItWorksProps }
  | { type: 'product_showcase';props: SceneProductShowcaseProps }
  | { type: 'offer_countdown'; props: SceneOfferCountdownProps }
  | { type: 'map_location';    props: SceneMapLocationProps }
  | { type: 'team_intro';      props: SceneTeamIntroProps }
  | { type: 'comparison';      props: SceneComparisonProps }
  // Phase 3 — added incrementally
  | { type: 'industry_stat';   props: SceneIndustryStatProps }
  | { type: 'problem_agitate'; props: SceneProblemAgitateProps }
  | { type: 'video_quote';     props: SceneVideoQuoteProps }
  | { type: 'number_reveal';   props: SceneNumberRevealProps }
  | { type: 'checklist_fail';  props: SceneChecklistFailProps }
  | { type: 'logos_wall';      props: SceneLogosWallProps }
  | { type: 'award_badges';    props: SceneAwardBadgesProps }
  | { type: 'demo_screen';     props: SceneDemoScreenProps }
  | { type: 'timeline_story';  props: SceneTimelineStoryProps }
  | { type: 'founder_message'; props: SceneFounderMessageProps }

export type VideoScript = {
  brandName:   string
  tagline:     string
  ctaText:     string
  ctaUrl:      string
  accentColor: string        // hex extracted from brand site, e.g. "#e63946"
  scenes:      SceneConfig[] // 4–7 entries
}

export type AgentForgeAdProps = {
  sceneDurations: number[]
  brandName:      string
  tagline:        string
  ctaText:        string
  ctaUrl:         string
  accentColor:    string
  scenes:         SceneConfig[]
}
```

### 2. Scene Registry

```ts
// agentforge-video/src/sceneRegistry.ts
import { ScenePainHook }      from './scenes/ScenePainHook'
import { SceneInboxChaos }    from './scenes/SceneInboxChaos'
// ... all imports

export const SCENE_REGISTRY: Record<string, React.FC<any>> = {
  pain_hook:       ScenePainHook,
  inbox_chaos:     SceneInboxChaos,
  cost_counter:    SceneCostCounter,
  brand_reveal:    SceneBrandReveal,
  feature_list:    SceneFeatureList,
  stats_grid:      SceneStatsGrid,
  cta:             SceneCTA,
  testimonial:     SceneTestimonial,
  before_after:    SceneBeforeAfter,
  how_it_works:    SceneHowItWorks,
  product_showcase:SceneProductShowcase,
  offer_countdown: SceneOfferCountdown,
  map_location:    SceneMapLocation,
  team_intro:      SceneTeamIntro,
  comparison:      SceneComparison,
  // Phase 3 added as built
}
```

### 3. Dynamic Assembler — `AgentForgeAd.tsx`

```tsx
export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  scenes, sceneDurations, brandName, tagline, accentColor, ctaText, ctaUrl,
}) => {
  const tf = TRANSITION_FRAMES
  return (
    <AbsoluteFill>
      <Audio src={staticFile('audio/music/background.mp3')} ... />
      <TransitionSeries>
        {scenes.map((scene, i) => {
          const Component = SCENE_REGISTRY[scene.type]
          const sharedProps = { accentColor, brandName, tagline, ctaText, ctaUrl,
                                audioPath: `audio/voiceover/scene_${i}.mp3` }
          return (
            <React.Fragment key={i}>
              <TransitionSeries.Sequence durationInFrames={sceneDurations[i]}>
                <Component {...scene.props} {...sharedProps} />
              </TransitionSeries.Sequence>
              {i < scenes.length - 1 && (
                <TransitionSeries.Transition
                  presentation={TRANSITIONS[i % TRANSITIONS.length]}
                  timing={linearTiming({ durationInFrames: tf })}
                />
              )}
            </React.Fragment>
          )
        })}
      </TransitionSeries>
    </AbsoluteFill>
  )
}
```

### 4. Shared Props Interface

Every scene component receives these guaranteed props in addition to its own:

```ts
interface SharedSceneProps {
  accentColor: string   // brand hex color
  brandName:   string
  tagline:     string
  ctaText:     string
  ctaUrl:      string
  audioPath:   string   // e.g. "audio/voiceover/scene_2.mp3"
}
```

---

## Visual Design System

### Typography (Google Fonts via @remotion/google-fonts)

| Role | Font | Weight | Use |
|------|------|--------|-----|
| Display | Bebas Neue | 400 (only weight) | Scene titles, giant numbers |
| Headline | Barlow | 800 | Secondary headlines, labels |
| Body | DM Sans | 400, 500, 700 | All descriptive copy |
| Mono | JetBrains Mono | 400, 600 | Stats, URLs, code, percentages |

### Color System

```ts
// computed per-render from accentColor prop
const accent       = accentColor              // e.g. "#e63946"
const accentGlow   = accentColor + '40'       // 25% — glow halos
const accentBorder = accentColor + '33'       // 20% — card borders
const accentBg     = accentColor + '12'       // 7%  — card backgrounds
const accentText   = accentColor              // accent headlines

// fixed base palette
const BG       = '#050d1a'
const BG_CARD  = '#0a1628'
const WHITE    = '#ffffff'
const GRAY     = '#94a3b8'
const GRAY_DIM = '#475569'
```

### Brand Color Extraction (scraper.ts)

Priority order:
1. `<meta name="theme-color" content="...">`
2. First `background-color` or `color` in `<style>` matching a button/primary class
3. Dominant hue of `og:image` (simple pixel sampling, no library)
4. Fallback: `#3b82f6`

### Shared Visual Elements (every scene)

1. **Noise grain** — SVG `feTurbulence` fractalNoise overlay at 4% opacity, cinematic texture
2. **Animated mesh gradient** — 3-point radial using accentColor, shifts at `frame * 0.08` px
3. **Scene counter** — `01 / 05` bottom-left, JetBrains Mono, 35% opacity
4. **Horizontal rule** — 1px gradient line under headlines, fades left-to-right

### Animation Principles (all scenes)

- **Word-by-word entrance**: split text on spaces, each word: `spring({ frame: frame - (i * 4), fps, config: { damping: 200 } })`
- **Reveal motion**: `translateY(+40px) + scale(0.94)` → `translateY(0) + scale(1)`, never bare fade
- **Parallax**: background layer moves at `frame * 0.15`px, content at `0`
- **Exit**: elements blur out `filter: blur(${exitBlur}px)` + scale 0.97 at `dur * 0.88`
- **No CSS transitions or Tailwind animation classes** (breaks Remotion renderer)
- All timing: `dur * fraction`, never `fps * N` (proportional to scene audio length)

---

## Scene Library

### Phase 1 — Rebuild existing 7 (renamed)

| New name | Old name | Key visual upgrade |
|----------|----------|--------------------|
| `ScenePainHook` | Scene1Pain | Diagonal layout, pain cards float right with glassmorphism, word-by-word headline |
| `SceneInboxChaos` | Scene2Chaos | Cards slide from right with motion blur, per-card urgency pulse glow |
| `SceneCostCounter` | Scene3Cost | Giant Bebas Neue number centered, radial accent glow, animated decimal point |
| `SceneBrandReveal` | Scene4Logo | clip-path mask reveal + particle burst ring, tagline typewriter |
| `SceneFeatureList` | Scene5Solution | Frosted glass cards, animated checkmark SVG stroke, live status pulse |
| `SceneStatsGrid` | Scene6Stats | Number scramble → settle (random chars → correct number), gradient bars |
| `SceneCTA` | Scene7CTA | Full-bleed radial accent gradient, URL typewriter, large brand name |

### Phase 2 — 8 new scene types

| Type | Layout | Key animation |
|------|--------|---------------|
| `SceneTestimonial` | Giant `"` top-left, quote center, name/role bottom | Quote fades in word-by-word, name slides up |
| `SceneBeforeAfter` | Vertical wipe divider, left=before dark, right=after bright | Animated divider sweeps left→right at `dur * 0.40` |
| `SceneHowItWorks` | 3 steps horizontal, connected by animated line | Line draws left→right, each step icon pops in sequence |
| `SceneProductShowcase` | Hero image with Ken Burns zoom, bold price/name overlay | Image slowly zooms 1.0→1.08 over scene duration |
| `SceneOfferCountdown` | Large offer text top, urgency progress bar bottom | Bar depletes right→left, accent glow pulses |
| `SceneMapLocation` | Stylised grid/dot map, animated pin drop, address card | Pin drops with spring bounce, address card slides in |
| `SceneTeamIntro` | 2–4 person cards with photo placeholder, name, role | Cards stagger in, subtle warm accent tint |
| `SceneComparison` | Two columns, competitor column desaturated, brand glows | Brand column highlights with accent border on reveal |

### Phase 3 — 10 more (added incrementally)

`industry_stat` · `problem_agitate` · `video_quote` · `number_reveal` · `checklist_fail` · `logos_wall` · `award_badges` · `demo_screen` · `timeline_story` · `founder_message`

Each added independently — no architectural changes needed, just new file + registry + GPT prompt update.

---

## Worker Changes

### `scraper.ts` — add `accentColor` extraction

```ts
export interface ScrapeResult {
  text:           string
  brandImageUrl:  string | null
  accentColor:    string | null   // NEW
}
```

### `scriptgen.ts` — GPT prompt update

- Accept `accentColor` as input context (so GPT knows brand palette when writing copy)
- Scene selection instruction: "Choose 4–7 scenes from the available types below that best fit this business. Always end with `cta`. Always include `brand_reveal`. Choose opening and middle scenes based on industry."
- Full scene type catalogue in system prompt with short description of when to use each

### `pipeline.ts`

```ts
const { text, brandImageUrl, accentColor } = await scrapeUrl(url)
const script = await generateScript(text, inputType, accentColor)
// accentColor in script comes from GPT or falls back to scraped value
```

### `render.ts`

Audio paths now position-based: `scene_0.mp3`, `scene_1.mp3`, ... instead of `scene1.mp3`.
No other changes — `--props` JSON mechanism stays the same.

---

## File Structure After Implementation

```
agentforge-video/src/
  sceneRegistry.ts          ← NEW: maps type string → component
  types.ts                  ← REWRITTEN: discriminated union
  AgentForgeAd.tsx          ← REWRITTEN: dynamic assembler
  scenes/
    ScenePainHook.tsx       ← rebuilt
    SceneInboxChaos.tsx     ← rebuilt
    SceneCostCounter.tsx    ← rebuilt
    SceneBrandReveal.tsx    ← rebuilt
    SceneFeatureList.tsx    ← rebuilt
    SceneStatsGrid.tsx      ← rebuilt
    SceneCTA.tsx            ← rebuilt
    SceneTestimonial.tsx    ← NEW
    SceneBeforeAfter.tsx    ← NEW
    SceneHowItWorks.tsx     ← NEW
    SceneProductShowcase.tsx← NEW
    SceneOfferCountdown.tsx ← NEW
    SceneMapLocation.tsx    ← NEW
    SceneTeamIntro.tsx      ← NEW
    SceneComparison.tsx     ← NEW
    # Phase 3 added later
  shared/
    NoiseOverlay.tsx        ← NEW: shared grain texture
    SceneCounter.tsx        ← NEW: "01 / 05" chip
    WordByWord.tsx          ← NEW: word-by-word text animator
    colorUtils.ts           ← NEW: accentGlow/accentBorder helpers

apps/worker/src/jobs/
  scraper.ts                ← add accentColor extraction
  scriptgen.ts              ← update prompt for dynamic scene selection
  pipeline.ts               ← thread accentColor
  render.ts                 ← scene_N.mp3 audio naming
```

---

## Extensibility Contract

To add a new scene type in the future:

1. Create `agentforge-video/src/scenes/SceneXxx.tsx` — implement `React.FC<SceneXxxProps & SharedSceneProps>`
2. Add `| { type: 'xxx'; props: SceneXxxProps }` to the discriminated union in `types.ts`
3. Add `xxx: SceneXxx` to `SCENE_REGISTRY` in `sceneRegistry.ts`
4. Add the type name + description to the GPT-4o system prompt in `scriptgen.ts`

No other files need to change.
