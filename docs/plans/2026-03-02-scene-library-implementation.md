# Scene Library + Dynamic Assembly — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the fixed 7-scene Remotion template with a 15-scene (Phase 1+2) extensible library where GPT-4o selects 4–7 scenes per video, each with its own visually redesigned component and brand-color system.

**Architecture:** Scene Registry pattern — `AgentForgeAd.tsx` maps `scene.type` strings to React components via `SCENE_REGISTRY`. All scenes share a `SharedSceneProps` interface (`accentColor`, `brandName`, `audioPath`, etc.) and a unified visual language (Bebas Neue display, DM Sans body, noise overlay, word-by-word animations). GPT-4o outputs a `SceneConfig[]` array instead of a fixed 7-tuple.

**Tech Stack:** Remotion 4.x · @remotion/google-fonts · @remotion/media-utils · TypeScript strict · OpenAI GPT-4o · Node.js worker

**Design doc:** `docs/plans/2026-03-02-scene-library-design.md`

---

## Phase 1 — Architecture Foundation

### Task 1: Load Google Fonts (Bebas Neue + DM Sans + JetBrains Mono)

**Files:**
- Modify: `agentforge-video/src/font.ts`

**Step 1: Rewrite font.ts**

```ts
// agentforge-video/src/font.ts
import { loadFont as loadBebasNeue }    from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadDMSans }       from '@remotion/google-fonts/DMSans';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

// Display font — condensed, cinematic headlines + big numbers
export const { fontFamily: DISPLAY_FONT } = loadBebasNeue();

// Body font — modern, legible, all descriptive copy
export const { fontFamily: FONT } = loadDMSans('normal', {
  weights: ['400', '500', '700'],
  subsets: ['latin'],
});

// Mono font — stats, URLs, percentages, counters
export const { fontFamily: MONO_FONT } = loadJetBrainsMono('normal', {
  weights: ['400', '600'],
  subsets: ['latin'],
});
```

**Step 2: Verify TypeScript**

```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: zero errors (fonts load lazily, no type issues).

---

### Task 2: Create shared utilities

**Files:**
- Create: `agentforge-video/src/shared/colorUtils.ts`
- Create: `agentforge-video/src/shared/NoiseOverlay.tsx`
- Create: `agentforge-video/src/shared/WordByWord.tsx`
- Create: `agentforge-video/src/shared/SceneCounter.tsx`

**Step 1: Create colorUtils.ts**

```ts
// agentforge-video/src/shared/colorUtils.ts

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface AccentVariants {
  solid:  string;   // full opacity — accent text, icons
  glow:   string;   // 0.25 — halos, radial glow
  strong: string;   // 0.45 — card left border highlight
  border: string;   // 0.22 — card borders
  bg:     string;   // 0.07 — card backgrounds
}

export function accentVariants(hex: string): AccentVariants {
  const safe = /^#[0-9a-fA-F]{3,6}$/.test(hex) ? hex : '#3b82f6';
  return {
    solid:  safe,
    glow:   toRgba(safe, 0.25),
    strong: toRgba(safe, 0.45),
    border: toRgba(safe, 0.22),
    bg:     toRgba(safe, 0.07),
  };
}
```

**Step 2: Create NoiseOverlay.tsx**

```tsx
// agentforge-video/src/shared/NoiseOverlay.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';

export const NoiseOverlay: React.FC<{ opacity?: number }> = ({ opacity = 0.035 }) => (
  <AbsoluteFill style={{ opacity, pointerEvents: 'none', zIndex: 99 }}>
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);
```

**Step 3: Create WordByWord.tsx**

```tsx
// agentforge-video/src/shared/WordByWord.tsx
import React from 'react';
import { interpolate, spring } from 'remotion';

interface WordByWordProps {
  text:          string;
  frame:         number;
  fps:           number;
  startFrame:    number;
  staggerFrames?: number;
  style?:        React.CSSProperties;
  wordStyle?:    React.CSSProperties;
  accentWords?:  string[];
  accentColor?:  string;
}

export const WordByWord: React.FC<WordByWordProps> = ({
  text, frame, fps, startFrame,
  staggerFrames = 4,
  style = {},
  wordStyle = {},
  accentWords = [],
  accentColor = '#3b82f6',
}) => {
  const words = text.split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.22em', alignItems: 'baseline', ...style }}>
      {words.map((word, i) => {
        const localFrame = frame - startFrame - i * staggerFrames;
        const progress = spring({ frame: localFrame, fps, config: { damping: 200 } });
        const y  = interpolate(progress, [0, 1], [28, 0]);
        const op = interpolate(localFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const stripped = word.replace(/[.,!?:;]/g, '');
        const isAccent = accentWords.includes(stripped);
        return (
          <span key={i} style={{
            opacity: op,
            transform: `translateY(${y}px)`,
            display: 'inline-block',
            color: isAccent ? accentColor : undefined,
            ...wordStyle,
          }}>
            {word}
          </span>
        );
      })}
    </div>
  );
};
```

**Step 4: Create SceneCounter.tsx**

```tsx
// agentforge-video/src/shared/SceneCounter.tsx
import React from 'react';
import { MONO_FONT } from '../font';

interface SceneCounterProps {
  current: number;  // 1-based display
  total:   number;
}

export const SceneCounter: React.FC<SceneCounterProps> = ({ current, total }) => (
  <div style={{
    position: 'absolute' as const, bottom: 44, left: 80,
    fontFamily: MONO_FONT, fontSize: 18,
    color: 'rgba(148,163,184,0.32)',
    letterSpacing: '3px',
    pointerEvents: 'none',
  }}>
    {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
  </div>
);
```

**Step 5: Verify TypeScript**

```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: zero errors.

---

### Task 3: Rewrite types.ts — full discriminated union

**Files:**
- Modify: `agentforge-video/src/types.ts`

```ts
// agentforge-video/src/types.ts

// ─── Shared props injected by AgentForgeAd assembler into every scene ───────
export interface SharedSceneProps {
  accentColor: string;
  brandName:   string;
  tagline:     string;
  ctaText:     string;
  ctaUrl:      string;
  audioPath:   string;   // e.g. "audio/voiceover/scene_2.mp3"
  sceneIndex:  number;
  sceneTotal:  number;
}

// ─── Per-scene prop interfaces ───────────────────────────────────────────────
export interface ScenePainHookProps {
  voiceover:  string;
  headline:   string;
  sub:        string;
  painPoints: [string, string, string];
}

export interface SceneInboxChaosProps {
  voiceover:  string;
  items: Array<{ subject: string; from: string; time: string; urgent?: boolean }>;
  punchWords: [string, string, string];
}

export interface SceneCostCounterProps {
  voiceover: string;
  intro:     string;
  stat1:     { value: number; unit: string; label: string };
  stat2:     { value: number; unit: string; label: string };
}

export interface SceneBrandRevealProps {
  voiceover: string;
}

export interface SceneFeatureListProps {
  voiceover:     string;
  headlineLines: [string, string, string, string];
  sub:           string;
  features:      Array<{ icon: string; title: string; detail: string; status: string }>;
}

export interface SceneStatsGridProps {
  voiceover: string;
  title:     string;
  sub:       string;
  stats:     Array<{ value: string; label: string; sub: string }>;
}

export interface SceneCTAProps {
  voiceover:  string;
  headline:   string;
  accentLine: string;
  sub:        string;
}

export interface SceneTestimonialProps {
  voiceover: string;
  quote:     string;
  name:      string;
  role:      string;
  company?:  string;
}

export interface SceneBeforeAfterProps {
  voiceover:    string;
  beforeLabel:  string;
  beforePoints: [string, string, string];
  afterLabel:   string;
  afterPoints:  [string, string, string];
}

export interface SceneHowItWorksProps {
  voiceover: string;
  title:     string;
  steps:     Array<{ number: string; icon: string; title: string; description: string }>;
}

export interface SceneProductShowcaseProps {
  voiceover:   string;
  productName: string;
  tagline:     string;
  price?:      string;
}

export interface SceneOfferCountdownProps {
  voiceover: string;
  badge:     string;
  offer:     string;
  benefit:   string;
  urgency:   string;
}

export interface SceneMapLocationProps {
  voiceover: string;
  address:   string;
  city:      string;
  hours:     string;
  phone?:    string;
}

export interface SceneTeamIntroProps {
  voiceover: string;
  title:     string;
  members:   Array<{ name: string; role: string; initials: string }>;
}

export interface SceneComparisonProps {
  voiceover:        string;
  competitorLabel:  string;
  brandLabel:       string;
  features:         Array<{ label: string; competitor: boolean; brand: boolean }>;
}

// ─── Discriminated union ─────────────────────────────────────────────────────
export type SceneConfig =
  | { type: 'pain_hook';        props: ScenePainHookProps }
  | { type: 'inbox_chaos';      props: SceneInboxChaosProps }
  | { type: 'cost_counter';     props: SceneCostCounterProps }
  | { type: 'brand_reveal';     props: SceneBrandRevealProps }
  | { type: 'feature_list';     props: SceneFeatureListProps }
  | { type: 'stats_grid';       props: SceneStatsGridProps }
  | { type: 'cta';              props: SceneCTAProps }
  | { type: 'testimonial';      props: SceneTestimonialProps }
  | { type: 'before_after';     props: SceneBeforeAfterProps }
  | { type: 'how_it_works';     props: SceneHowItWorksProps }
  | { type: 'product_showcase'; props: SceneProductShowcaseProps }
  | { type: 'offer_countdown';  props: SceneOfferCountdownProps }
  | { type: 'map_location';     props: SceneMapLocationProps }
  | { type: 'team_intro';       props: SceneTeamIntroProps }
  | { type: 'comparison';       props: SceneComparisonProps };
  // Adding a new scene type: add entry here + sceneRegistry.ts + scriptgen.ts prompt

// ─── Root composition props ───────────────────────────────────────────────────
export type AgentForgeAdProps = {
  sceneDurations: number[];
  brandName:      string;
  tagline:        string;
  ctaText:        string;
  ctaUrl:         string;
  accentColor:    string;
  scenes:         SceneConfig[];
};
```

**Step 2: Verify TypeScript**

```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: errors about missing scene components (expected — scene files still exist with old names). That's OK for now, we'll fix in Task 4+.

---

### Task 4: Create sceneRegistry.ts

**Files:**
- Create: `agentforge-video/src/sceneRegistry.ts`

> NOTE: This file imports scene components that don't exist yet (Tasks 9–24). It will fail TypeScript until all scenes are created. Write it now anyway — the registry establishes the contract.

```ts
// agentforge-video/src/sceneRegistry.ts
import React from 'react';
import { ScenePainHook }       from './scenes/ScenePainHook';
import { SceneInboxChaos }     from './scenes/SceneInboxChaos';
import { SceneCostCounter }    from './scenes/SceneCostCounter';
import { SceneBrandReveal }    from './scenes/SceneBrandReveal';
import { SceneFeatureList }    from './scenes/SceneFeatureList';
import { SceneStatsGrid }      from './scenes/SceneStatsGrid';
import { SceneCTA }            from './scenes/SceneCTA';
import { SceneTestimonial }    from './scenes/SceneTestimonial';
import { SceneBeforeAfter }    from './scenes/SceneBeforeAfter';
import { SceneHowItWorks }     from './scenes/SceneHowItWorks';
import { SceneProductShowcase }from './scenes/SceneProductShowcase';
import { SceneOfferCountdown } from './scenes/SceneOfferCountdown';
import { SceneMapLocation }    from './scenes/SceneMapLocation';
import { SceneTeamIntro }      from './scenes/SceneTeamIntro';
import { SceneComparison }     from './scenes/SceneComparison';
import type { SharedSceneProps } from './types';

export const SCENE_REGISTRY: Record<string, React.FC<any & SharedSceneProps>> = {
  pain_hook:        ScenePainHook,
  inbox_chaos:      SceneInboxChaos,
  cost_counter:     SceneCostCounter,
  brand_reveal:     SceneBrandReveal,
  feature_list:     SceneFeatureList,
  stats_grid:       SceneStatsGrid,
  cta:              SceneCTA,
  testimonial:      SceneTestimonial,
  before_after:     SceneBeforeAfter,
  how_it_works:     SceneHowItWorks,
  product_showcase: SceneProductShowcase,
  offer_countdown:  SceneOfferCountdown,
  map_location:     SceneMapLocation,
  team_intro:       SceneTeamIntro,
  comparison:       SceneComparison,
};
```

---

### Task 5: Rewrite AgentForgeAd.tsx — dynamic assembler

**Files:**
- Modify: `agentforge-video/src/AgentForgeAd.tsx`

```tsx
// agentforge-video/src/AgentForgeAd.tsx
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade }      from '@remotion/transitions/fade';
import { slide }     from '@remotion/transitions/slide';
import { wipe }      from '@remotion/transitions/wipe';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { flip }      from '@remotion/transitions/flip';
import { WIDTH, HEIGHT, TRANSITION_FRAMES } from './constants';
import { SCENE_REGISTRY } from './sceneRegistry';
import type { AgentForgeAdProps, SharedSceneProps } from './types';

const TRANSITIONS = [
  slide({ direction: 'from-right' }),
  wipe({ direction: 'from-left' }),
  fade(),
  slide({ direction: 'from-bottom' }),
  clockWipe({ width: WIDTH, height: HEIGHT }),
  flip(),
];

export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  scenes,
  sceneDurations,
  brandName,
  tagline,
  ctaText,
  ctaUrl,
  accentColor,
}) => {
  const tf = TRANSITION_FRAMES;
  const totalFrames = sceneDurations.reduce((s, d) => s + d, 0) - (scenes.length - 1) * tf;

  return (
    <AbsoluteFill>
      <Audio
        src={staticFile('audio/music/background.mp3')}
        volume={(f) => {
          const fadeIn  = Math.min(f / 60, 1);
          const fadeOut = Math.min((totalFrames - f) / 60, 1);
          return Math.min(fadeIn, fadeOut) * 0.12;
        }}
        loop
      />

      <TransitionSeries>
        {scenes.map((scene, i) => {
          const Component = SCENE_REGISTRY[scene.type];
          if (!Component) {
            console.warn(`Unknown scene type: ${scene.type}`);
            return null;
          }

          const shared: SharedSceneProps = {
            accentColor,
            brandName,
            tagline,
            ctaText,
            ctaUrl,
            audioPath:  `audio/voiceover/scene_${i}.mp3`,
            sceneIndex: i,
            sceneTotal: scenes.length,
          };

          return (
            <React.Fragment key={i}>
              <TransitionSeries.Sequence durationInFrames={sceneDurations[i] ?? 150}>
                <Component {...(scene.props as any)} {...shared} />
              </TransitionSeries.Sequence>
              {i < scenes.length - 1 && (
                <TransitionSeries.Transition
                  presentation={TRANSITIONS[i % TRANSITIONS.length]}
                  timing={linearTiming({ durationInFrames: tf })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
```

---

### Task 6: Update calculateMetadata.ts — dynamic scene count

**Files:**
- Modify: `agentforge-video/src/calculateMetadata.ts`

```ts
// agentforge-video/src/calculateMetadata.ts
import { CalculateMetadataFunction, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { FPS, TRANSITION_FRAMES } from './constants';
import type { AgentForgeAdProps } from './types';

const PADDING_FRAMES = 25;

export const calculateMetadata: CalculateMetadataFunction<AgentForgeAdProps> = async ({ props }) => {
  const sceneCount = props.scenes.length;
  const files = Array.from({ length: sceneCount }, (_, i) => `audio/voiceover/scene_${i}.mp3`);

  const durations = await Promise.all(
    files.map((f) => getAudioDurationInSeconds(staticFile(f)))
  );

  const sceneDurations = durations.map((d: number) => Math.ceil(d * FPS) + PADDING_FRAMES);
  const totalFrames =
    sceneDurations.reduce((sum: number, d: number) => sum + d, 0) -
    (sceneCount - 1) * TRANSITION_FRAMES;

  return {
    durationInFrames: Math.max(totalFrames, 30),
    props: { ...props, sceneDurations },
  };
};
```

---

## Phase 2 — Rebuild All 7 Scenes (Redesigned)

> Each scene is created as a new file. Old Scene1Pain.tsx–Scene7CTA.tsx are deleted at the end of this phase.

### Task 7: Create ScenePainHook.tsx

**Files:**
- Create: `agentforge-video/src/scenes/ScenePainHook.tsx`

```tsx
// agentforge-video/src/scenes/ScenePainHook.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import type { ScenePainHookProps, SharedSceneProps } from '../types';

export const ScenePainHook: React.FC<ScenePainHookProps & SharedSceneProps> = ({
  headline, sub, painPoints,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_TAG = 0;
  const CUE_HEAD = dur * 0.08;
  const CUE_SUB  = dur * 0.35;
  const CUE_C1   = dur * 0.45;
  const CUE_C2   = dur * 0.57;
  const CUE_C3   = dur * 0.69;

  const bgX   = interpolate(frame, [0, dur], [0, -24], { extrapolateRight: 'clamp' });
  const tagOp = interpolate(frame, [CUE_TAG, CUE_TAG + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardCues  = [CUE_C1, CUE_C2, CUE_C3];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Dot grid parallax */}
      <AbsoluteFill style={{
        backgroundImage: `radial-gradient(circle, ${av.border} 1.5px, transparent 1.5px)`,
        backgroundSize: '64px 64px',
        opacity: 0.5,
        transform: `translateX(${bgX}px)`,
      }} />
      {/* Diagonal accent gradient */}
      <AbsoluteFill style={{ background: `linear-gradient(130deg, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '0 80px', overflow: 'hidden' }}>
        {/* ── Left: text ── */}
        <div style={{ width: '54%', display: 'flex', flexDirection: 'column', gap: 26 }}>
          {/* Tag badge */}
          <div style={{
            opacity: tagOp, display: 'inline-flex', alignItems: 'center', gap: 10,
            background: av.bg, border: `1px solid ${av.border}`,
            borderRadius: 100, padding: '8px 22px', width: 'fit-content',
          }}>
            <div style={{ width: 7, height: 7, background: accentColor, borderRadius: '50%' }} />
            <span style={{ fontSize: 17, color: accentColor, fontFamily: MONO_FONT, fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' as const }}>
              Sound familiar?
            </span>
          </div>

          {/* Headline word-by-word */}
          <WordByWord
            text={headline}
            frame={frame} fps={fps} startFrame={CUE_HEAD} staggerFrames={3}
            style={{ flexWrap: 'wrap', gap: '0.18em', overflow: 'hidden' }}
            wordStyle={{ fontSize: 92, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT, lineHeight: 1.05, letterSpacing: '-2.5px' }}
          />

          {/* Subtitle */}
          {(() => {
            const op = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y  = interpolate(spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } }), [0, 1], [22, 0]);
            return (
              <div style={{ opacity: op, transform: `translateY(${y}px)` }}>
                <div style={{ fontSize: 27, color: 'rgba(148,163,184,0.88)', fontFamily: FONT, fontWeight: '400', lineHeight: 1.6, maxWidth: 540 }}>
                  {sub}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Right: pain point cards ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 64, opacity: exitOp }}>
          {painPoints.map((point, i) => {
            const cue = cardCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [60, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                background: av.bg, borderRadius: 18,
                border: `1px solid ${av.border}`, borderLeft: `3px solid ${av.strong}`,
                padding: '22px 28px',
                display: 'flex', alignItems: 'center', gap: 18,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: av.glow, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: accentColor, opacity: 0.9 }} />
                </div>
                <span style={{ fontSize: 24, color: '#e2e8f0', fontFamily: FONT, fontWeight: '600', lineHeight: 1.35 }}>
                  {point}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

**Step 2: Verify TypeScript (will error until all scenes created — check only this file)**

```bash
cd agentforge-video && npx tsc --noEmit 2>&1 | grep ScenePainHook
```
Expected: no errors mentioning ScenePainHook.

---

### Task 8: Create SceneInboxChaos.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneInboxChaos.tsx`

```tsx
// agentforge-video/src/scenes/SceneInboxChaos.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneInboxChaosProps, SharedSceneProps } from '../types';

export const SceneInboxChaos: React.FC<SceneInboxChaosProps & SharedSceneProps> = ({
  items, punchWords,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const ITEM_SPACING = dur * 0.14;
  const PUNCH_CUE    = dur * 0.72;

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Subtle grid */}
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(5,13,26,0) 30%, #050d1a 75%)' }} />
      <NoiseOverlay />

      {/* Email cards */}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '0 180px' }}>
        {items.map((item, i) => {
          const cue = i * ITEM_SPACING;
          const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
          const x   = interpolate(p, [0, 1], [200, 0]);
          const op  = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const urgentGlow = item.urgent
            ? `0 0 ${interpolate(frame % 60, [0, 30, 60], [8, 20, 8])}px rgba(239,68,68,0.35)`
            : 'none';

          const initials = item.from.split('@')[0].slice(0, 2).toUpperCase();

          return (
            <div key={i} style={{
              opacity: op, transform: `translateX(${x}px)`,
              width: '100%',
              background: item.urgent ? 'rgba(239,68,68,0.06)' : 'rgba(10,22,40,0.9)',
              border: item.urgent ? '1px solid rgba(239,68,68,0.35)' : `1px solid ${av.border}`,
              borderLeft: item.urgent ? '3px solid #ef4444' : `3px solid ${av.strong}`,
              borderRadius: 14, padding: '18px 24px',
              display: 'flex', alignItems: 'center', gap: 18,
              boxShadow: urgentGlow,
            }}>
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: item.urgent ? 'rgba(239,68,68,0.2)' : av.bg,
                border: item.urgent ? '1px solid rgba(239,68,68,0.4)' : `1px solid ${av.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 14, color: item.urgent ? '#ef4444' : accentColor, fontFamily: MONO_FONT, fontWeight: '600' }}>{initials}</span>
              </div>

              {/* Subject + from */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 22, color: item.urgent ? '#fca5a5' : '#e2e8f0', fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.subject}
                </div>
                <div style={{ fontSize: 17, color: 'rgba(148,163,184,0.7)', fontFamily: MONO_FONT, marginTop: 3 }}>
                  {item.from}
                </div>
              </div>

              {/* Time + urgent badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 17, color: 'rgba(148,163,184,0.6)', fontFamily: MONO_FONT }}>{item.time}</span>
                {item.urgent && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '3px 10px' }}>
                    <span style={{ fontSize: 13, color: '#ef4444', fontFamily: MONO_FONT, fontWeight: '600', letterSpacing: '1.5px' }}>URGENT</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* Punch words */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 90 }}>
        <div style={{ display: 'flex', gap: 48 }}>
          {punchWords.map((word, i) => {
            const cue = PUNCH_CUE + i * (dur * 0.07);
            const p   = spring({ frame: frame - cue, fps, config: { damping: 15 } });
            const scale = interpolate(p, [0, 1], [0.6, 1]);
            const op  = interpolate(frame - cue, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ opacity: op, transform: `scale(${scale})` }}>
                <span style={{ fontSize: 68, fontWeight: '800', color: i === 1 ? accentColor : '#f1f5f9', fontFamily: DISPLAY_FONT, letterSpacing: '2px' }}>
                  {word}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 9: Create SceneCostCounter.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneCostCounter.tsx`

```tsx
// agentforge-video/src/scenes/SceneCostCounter.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneCostCounterProps, SharedSceneProps } from '../types';

const Stat: React.FC<{
  value: number; unit: string; label: string;
  cue: number; frame: number; fps: number; accentColor: string;
}> = ({ value, unit, label, cue, frame, fps, accentColor }) => {
  const av = accentVariants(accentColor);
  const p  = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y  = interpolate(p, [0, 1], [50, 0]);
  const op = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const countProgress = interpolate(frame - cue - 10, [0, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const displayValue  = Math.round(value * countProgress);
  const glowSize  = interpolate(p, [0, 1], [0, 80]);
  const formatted = displayValue >= 1000
    ? displayValue.toLocaleString()
    : String(displayValue);

  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, position: 'relative' as const, textAlign: 'center' as const }}>
      {/* Radial glow behind number */}
      <div style={{
        position: 'absolute' as const, top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: glowSize * 2, height: glowSize * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${av.glow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center' }}>
        <span style={{ fontSize: 160, color: accentColor, fontFamily: DISPLAY_FONT, lineHeight: 1, letterSpacing: '-2px' }}>
          {unit.startsWith('€') || unit.startsWith('$') ? unit : ''}{formatted}{unit.startsWith('€') || unit.startsWith('$') ? '' : unit}
        </span>
      </div>
      <div style={{ fontSize: 28, color: 'rgba(148,163,184,0.8)', fontFamily: FONT, fontWeight: '500', marginTop: -8, letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ width: '80%', height: 1, background: `linear-gradient(90deg, transparent, ${av.border}, transparent)`, margin: '14px auto 0' }} />
    </div>
  );
};

export const SceneCostCounter: React.FC<SceneCostCounterProps & SharedSceneProps> = ({
  intro, stat1, stat2,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_INTRO = 0;
  const CUE_STAT1 = dur * 0.22;
  const CUE_STAT2 = dur * 0.54;

  const introOp = interpolate(frame, [CUE_INTRO, CUE_INTRO + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const introY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(5,13,26,0) 20%, #050d1a 65%)' }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, padding: '0 100px' }}>
        {/* Intro text */}
        <div style={{ opacity: introOp, transform: `translateY(${introY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: 32, color: 'rgba(148,163,184,0.75)', fontFamily: FONT, fontWeight: '400', maxWidth: 800, lineHeight: 1.5 }}>
            {intro}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 100, alignItems: 'center' }}>
          <Stat {...stat1} cue={CUE_STAT1} frame={frame} fps={fps} accentColor={accentColor} />
          <div style={{ width: 1, height: 140, background: `linear-gradient(to bottom, transparent, rgba(148,163,184,0.2), transparent)` }} />
          <Stat {...stat2} cue={CUE_STAT2} frame={frame} fps={fps} accentColor={accentColor} />
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 10: Create SceneBrandReveal.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneBrandReveal.tsx`

```tsx
// agentforge-video/src/scenes/SceneBrandReveal.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneBrandRevealProps, SharedSceneProps } from '../types';

export const SceneBrandReveal: React.FC<SceneBrandRevealProps & SharedSceneProps> = ({
  accentColor, brandName, tagline, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_NAME    = 0;
  const CUE_TAGLINE = dur * 0.40;
  const CUE_LINE    = dur * 0.55;

  // Brand name: clip-path reveal left → right
  const revealProgress = spring({ frame: frame - CUE_NAME, fps, config: { damping: 200 }, durationInFrames: 45 });
  const clipW = interpolate(revealProgress, [0, 1], [0, 100]);

  // Pulse rings
  const ring1Scale = interpolate(frame % 80, [0, 80], [0.8, 2.2], { extrapolateRight: 'clamp' });
  const ring1Op    = interpolate(frame % 80, [0, 50, 80], [0.5, 0.15, 0]);

  // Tagline typewriter
  const charCount = Math.floor(interpolate(frame - CUE_TAGLINE, [0, tagline.length * 3], [0, tagline.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  // Accent line
  const lineW = interpolate(spring({ frame: frame - CUE_LINE, fps, config: { damping: 200 } }), [0, 1], [0, 280]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Radial glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${av.bg} 0%, transparent 65%)` }} />
      {/* Pulse rings */}
      {[ring1Scale, ring1Scale * 1.3].map((scale, i) => (
        <AbsoluteFill key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{
            width: 400, height: 400, borderRadius: '50%',
            border: `1px solid ${av.border}`,
            transform: `scale(${scale})`,
            opacity: ring1Op * (i === 0 ? 1 : 0.5),
          }} />
        </AbsoluteFill>
      ))}
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        {/* Brand name with clip reveal */}
        <div style={{ overflow: 'hidden', position: 'relative' as const }}>
          <div style={{
            fontSize: Math.max(100, 180 - brandName.length * 4),
            fontFamily: DISPLAY_FONT,
            color: '#f1f5f9',
            letterSpacing: '6px',
            textTransform: 'uppercase' as const,
            clipPath: `inset(0 ${100 - clipW}% 0 0)`,
          }}>
            {brandName}
          </div>
        </div>

        {/* Accent line */}
        <div style={{ width: lineW, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

        {/* Tagline typewriter */}
        {frame >= CUE_TAGLINE && (
          <div style={{ fontSize: 28, color: 'rgba(148,163,184,0.75)', fontFamily: MONO_FONT, letterSpacing: '4px', textTransform: 'uppercase' as const }}>
            {tagline.slice(0, charCount)}
            <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 0.7 : 0 }}>|</span>
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 11: Create SceneFeatureList.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneFeatureList.tsx`

```tsx
// agentforge-video/src/scenes/SceneFeatureList.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import type { SceneFeatureListProps, SharedSceneProps } from '../types';

export const SceneFeatureList: React.FC<SceneFeatureListProps & SharedSceneProps> = ({
  headlineLines, sub, features,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const lineCues = [0, dur * 0.12, dur * 0.24, dur * 0.36];
  const CUE_SUB    = dur * 0.44;
  const CUE_HEADER = dur * 0.50;
  const cardCues   = [dur * 0.54, dur * 0.64, dur * 0.74];

  const bgOp = interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });

  const subOp  = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headOp = interpolate(frame - CUE_HEADER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 75% 30%, ${av.bg} 0%, transparent 55%)`, opacity: bgOp }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '48px 80px', gap: 60, overflow: 'hidden' }}>
        {/* Left: headline lines */}
        <div style={{ width: 480, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          {headlineLines.map((text, idx) => {
            const isLast = idx === headlineLines.length - 1;
            return (
              <WordByWord
                key={idx}
                text={text}
                frame={frame} fps={fps} startFrame={lineCues[idx]} staggerFrames={4}
                style={{ overflow: 'hidden' }}
                wordStyle={{
                  fontSize: 56, fontWeight: '800',
                  color: isLast ? accentColor : '#f1f5f9',
                  fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-1.5px',
                }}
              />
            );
          })}
          <div style={{ opacity: subOp, marginTop: 12 }}>
            <div style={{ fontSize: 22, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, lineHeight: 1.65, maxWidth: 440 }}>
              {sub}
            </div>
          </div>
        </div>

        {/* Right: feature cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Live indicator */}
          <div style={{ opacity: headOp, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
            <span style={{ fontSize: 15, color: 'rgba(148,163,184,0.7)', fontFamily: MONO_FONT, fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>
              Live Dashboard
            </span>
          </div>

          {features.slice(0, 3).map((f, i) => {
            const cue = cardCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const x   = interpolate(p, [0, 1], [40, 0]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const dotPulse = interpolate(frame % 50, [0, 25, 50], [0.7, 1, 0.7]);
            return (
              <div key={i} style={{
                opacity: op, transform: `translateX(${x}px)`,
                background: av.bg, borderRadius: 14,
                border: `1px solid ${av.border}`, borderLeft: `3px solid ${av.strong}`,
                padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ fontSize: 30, flexShrink: 0, width: 40, textAlign: 'center' as const }}>{f.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</div>
                  <div style={{ fontSize: 17, color: 'rgba(148,163,184,0.75)', fontFamily: FONT, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.detail}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 16, color: '#22c55e', fontFamily: MONO_FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{f.status}</span>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', transform: `scale(${dotPulse})`, boxShadow: '0 0 6px #22c55e' }} />
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 12: Create SceneStatsGrid.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneStatsGrid.tsx`

```tsx
// agentforge-video/src/scenes/SceneStatsGrid.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneStatsGridProps, SharedSceneProps } from '../types';

const CHARS = '0123456789ABCDEFX#%';

function scramble(target: string, frame: number, cue: number): string {
  const elapsed = frame - cue;
  if (elapsed < 0) return target.replace(/./g, CHARS[0]);
  if (elapsed >= 30) return target;
  return target.split('').map((ch) => {
    if (/[^0-9]/.test(ch)) return ch;
    const settled = elapsed > 20 + Math.random() * 10;
    return settled ? ch : CHARS[Math.floor((frame * 7 + Math.random() * 5) % CHARS.length)];
  }).join('');
}

const StatCard: React.FC<{ value: string; label: string; sub: string; cue: number; frame: number; fps: number; accentColor: string }> = ({
  value, label, sub, cue, frame, fps, accentColor,
}) => {
  const av  = accentVariants(accentColor);
  const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y   = interpolate(p, [0, 1], [60, 0]);
  const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const display = scramble(value, frame, cue);

  return (
    <div style={{
      opacity: op, transform: `translateY(${y}px)`,
      flex: 1, background: av.bg, borderRadius: 20,
      border: `1px solid ${av.border}`, borderTop: `2px solid ${av.strong}`,
      padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
    }}>
      <div style={{ fontSize: 100, color: accentColor, fontFamily: DISPLAY_FONT, lineHeight: 1, letterSpacing: '1px' }}>
        {display}
      </div>
      <div style={{ fontSize: 24, color: '#f1f5f9', fontFamily: FONT, fontWeight: '700', textAlign: 'center' as const }}>{label}</div>
      <div style={{ fontSize: 18, color: 'rgba(148,163,184,0.6)', fontFamily: MONO_FONT, textAlign: 'center' as const }}>{sub}</div>
    </div>
  );
};

export const SceneStatsGrid: React.FC<SceneStatsGridProps & SharedSceneProps> = ({
  title, sub, stats,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);
  const cardCues = [dur * 0.22, dur * 0.36, dur * 0.50];

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(10,22,40,0.8) 0%, #050d1a 60%)' }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: 40 }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: 52, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}>{title}</div>
          <div style={{ fontSize: 22, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, marginTop: 8 }}>{sub}</div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 24, width: '100%' }}>
          {stats.slice(0, 3).map((s, i) => (
            <StatCard key={i} {...s} cue={cardCues[i]} frame={frame} fps={fps} accentColor={accentColor} />
          ))}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 13: Create SceneCTA.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneCTA.tsx`

```tsx
// agentforge-video/src/scenes/SceneCTA.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneCTAProps, SharedSceneProps } from '../types';

export const SceneCTA: React.FC<SceneCTAProps & SharedSceneProps> = ({
  headline, accentLine, sub,
  accentColor, brandName, ctaText, ctaUrl, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_BRAND  = 0;
  const CUE_HEAD   = dur * 0.15;
  const CUE_ACCENT = dur * 0.32;
  const CUE_SUB    = dur * 0.48;
  const CUE_CTA    = dur * 0.58;
  const CUE_URL    = dur * 0.70;

  const pulseScale = interpolate(frame % 90, [0, 45, 90], [1, 1.06, 1]);

  const brandOp = interpolate(frame, [CUE_BRAND, CUE_BRAND + 25], [0, 0.07], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const headOp = interpolate(frame - CUE_HEAD, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headY  = interpolate(spring({ frame: frame - CUE_HEAD, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const accOp = interpolate(frame - CUE_ACCENT, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const accY  = interpolate(spring({ frame: frame - CUE_ACCENT, fps, config: { damping: 200 } }), [0, 1], [30, 0]);

  const subOp = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const ctaP  = spring({ frame: frame - CUE_CTA, fps, config: { damping: 15 } });
  const ctaSc = interpolate(ctaP, [0, 1], [0.7, 1]);
  const ctaOp = interpolate(frame - CUE_CTA, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // URL typewriter
  const urlLen = Math.floor(interpolate(frame - CUE_URL, [0, ctaUrl.length * 2.5], [0, ctaUrl.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Full-bleed radial gradient */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${av.strong} 0%, transparent 60%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(5,13,26,0) 30%, #050d1a 70%)' }} />
      {/* Pulse ring */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 600, height: 600, borderRadius: '50%', border: `1px solid ${av.border}`, transform: `scale(${pulseScale})` }} />
      </AbsoluteFill>
      <NoiseOverlay />

      {/* Ghost brand name background */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 340, color: '#f1f5f9', fontFamily: DISPLAY_FONT, opacity: brandOp, letterSpacing: '20px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
          {brandName}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 100px' }}>
        {/* Headline */}
        <div style={{ opacity: headOp, transform: `translateY(${headY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: 64, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2px' }}>
            {headline}
          </div>
        </div>

        {/* Accent line */}
        <div style={{ opacity: accOp, transform: `translateY(${accY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: 64, fontWeight: '800', color: accentColor, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2px' }}>
            {accentLine}
          </div>
        </div>

        {/* Sub */}
        <div style={{ opacity: subOp, marginTop: 8 }}>
          <div style={{ fontSize: 26, color: 'rgba(148,163,184,0.8)', fontFamily: FONT, fontWeight: '400', textAlign: 'center' as const }}>
            {sub}
          </div>
        </div>

        {/* CTA button shape */}
        <div style={{ opacity: ctaOp, transform: `scale(${ctaSc})`, marginTop: 16 }}>
          <div style={{
            background: accentColor, borderRadius: 100, padding: '18px 52px',
            boxShadow: `0 0 40px ${av.glow}`,
          }}>
            <span style={{ fontSize: 28, color: '#ffffff', fontFamily: FONT, fontWeight: '700', letterSpacing: '0.5px' }}>
              {ctaText}
            </span>
          </div>
        </div>

        {/* URL typewriter */}
        {frame >= CUE_URL && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 20, color: 'rgba(148,163,184,0.5)', fontFamily: MONO_FONT, letterSpacing: '2px' }}>
              {ctaUrl.slice(0, urlLen)}<span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 0.5 : 0 }}>|</span>
            </span>
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 14: Delete old scene files + update Root.tsx

**Step 1: Delete old scene files**

```bash
cd agentforge-video/src/scenes
rm Scene1Pain.tsx Scene2Chaos.tsx Scene3Cost.tsx Scene4Logo.tsx Scene5Solution.tsx Scene6Stats.tsx Scene7CTA.tsx
```

**Step 2: Update Root.tsx with new defaultProps schema**

```tsx
// agentforge-video/src/Root.tsx
import { Composition } from 'remotion';
import { AgentForgeAd } from './AgentForgeAd';
import { calculateMetadata } from './calculateMetadata';
import { FPS, WIDTH, HEIGHT, TRANSITION_FRAMES } from './constants';
import type { AgentForgeAdProps } from './types';

const DEFAULT_PROPS: AgentForgeAdProps = {
  sceneDurations: [210, 180, 90, 300, 240],
  brandName:   'YourBrand',
  tagline:     'Your Tagline Here',
  ctaText:     'Get Started Free',
  ctaUrl:      'yourdomain.com',
  accentColor: '#3b82f6',
  scenes: [
    {
      type: 'pain_hook',
      props: {
        voiceover: 'Is your team drowning in repetitive tasks that should be automated?',
        headline: 'Your team is drowning in busywork.',
        sub: 'Every day your best people waste hours on tasks that do not grow the business.',
        painPoints: ['Manual data entry', 'Missed follow-ups', 'Endless reporting'],
      },
    },
    {
      type: 'feature_list',
      props: {
        voiceover: 'YourBrand handles it all — automatically — so your team can focus on what matters.',
        headlineLines: ['We handle', 'it all for you.', 'Every task.', 'Automatically.'],
        sub: 'No setup. No learning curve. Fully managed.',
        features: [
          { icon: '📧', title: 'Smart Automation', detail: 'Handles repetitive tasks automatically', status: 'Running now' },
          { icon: '📊', title: 'Live Analytics', detail: 'Real-time data, zero manual entry', status: 'Synced live' },
          { icon: '🔔', title: 'Smart Alerts', detail: 'Never miss a critical update', status: '12 sent today' },
        ],
      },
    },
    {
      type: 'stats_grid',
      props: {
        voiceover: 'Our clients save hundreds of hours and thousands of euros every single month.',
        title: 'Average results after 30 days',
        sub: 'Across 50+ business clients',
        stats: [
          { value: '28hrs', label: 'Saved per week', sub: 'Per team average' },
          { value: '5 days', label: 'To go live', sub: 'From first call' },
          { value: '$5.6K', label: 'Monthly ROI', sub: 'Average return' },
        ],
      },
    },
    {
      type: 'brand_reveal',
      props: { voiceover: 'YourBrand — built for businesses that want to grow, not just survive.' },
    },
    {
      type: 'cta',
      props: {
        voiceover: 'Book your free call today and see exactly how much time you could save.',
        headline: 'Stop paying people to do what',
        accentLine: 'AI does better.',
        sub: 'Book your free 15-minute call today.',
      },
    },
  ],
};

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeAd"
    component={AgentForgeAd}
    durationInFrames={DEFAULT_PROPS.sceneDurations.reduce((s, d) => s + d, 0) - (DEFAULT_PROPS.scenes.length - 1) * TRANSITION_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={calculateMetadata}
  />
);
```

**Step 3: TypeScript check — must pass zero errors**

```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: **zero errors**.

**Step 4: Commit Phase 1 (architecture + 7 rebuilt scenes)**

```bash
cd agentforge-video && git add -A && git commit -m "feat: scene registry architecture + 7 redesigned scenes (Phase 1)"
```

---

## Phase 3 — 8 New Scene Types

### Task 15: Create SceneTestimonial.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneTestimonial.tsx`

```tsx
// agentforge-video/src/scenes/SceneTestimonial.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import type { SceneTestimonialProps, SharedSceneProps } from '../types';

export const SceneTestimonial: React.FC<SceneTestimonialProps & SharedSceneProps> = ({
  quote, name, role, company,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_MARK   = 0;
  const CUE_QUOTE  = dur * 0.12;
  const CUE_PERSON = dur * 0.70;

  const markOp = interpolate(frame, [CUE_MARK, CUE_MARK + 20], [0, 0.14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const markScale = spring({ frame, fps, config: { damping: 200 } });

  const personP  = spring({ frame: frame - CUE_PERSON, fps, config: { damping: 200 } });
  const personY  = interpolate(personP, [0, 1], [30, 0]);
  const personOp = interpolate(frame - CUE_PERSON, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 30% 60%, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      {/* Giant quote mark */}
      <div style={{
        position: 'absolute' as const, top: 40, left: 60,
        fontSize: 320, color: accentColor, fontFamily: DISPLAY_FONT, lineHeight: 1,
        opacity: markOp, transform: `scale(${interpolate(markScale, [0, 1], [0.8, 1])})`,
        pointerEvents: 'none', userSelect: 'none' as const,
      }}>
        "
      </div>

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 120px 0 100px', gap: 32 }}>
        {/* Quote text */}
        <WordByWord
          text={quote}
          frame={frame} fps={fps} startFrame={CUE_QUOTE} staggerFrames={3}
          style={{ flexWrap: 'wrap', gap: '0.3em', maxWidth: 1200 }}
          wordStyle={{ fontSize: 52, fontStyle: 'italic' as const, color: '#f1f5f9', fontFamily: FONT, fontWeight: '500', lineHeight: 1.4, letterSpacing: '-0.5px' }}
        />

        {/* Divider */}
        <div style={{ width: 80, height: 2, background: accentColor, opacity: personOp }} />

        {/* Person */}
        <div style={{ opacity: personOp, transform: `translateY(${personY}px)`, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: av.bg, border: `2px solid ${av.strong}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 20, color: accentColor, fontFamily: MONO_FONT, fontWeight: '600' }}>
              {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 26, color: '#f1f5f9', fontFamily: FONT, fontWeight: '700' }}>{name}</div>
            <div style={{ fontSize: 19, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, marginTop: 2 }}>
              {role}{company ? ` · ${company}` : ''}
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 16: Create SceneBeforeAfter.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneBeforeAfter.tsx`

```tsx
// agentforge-video/src/scenes/SceneBeforeAfter.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneBeforeAfterProps, SharedSceneProps } from '../types';

export const SceneBeforeAfter: React.FC<SceneBeforeAfterProps & SharedSceneProps> = ({
  beforeLabel, beforePoints, afterLabel, afterPoints,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_LABELS = 0;
  const CUE_BEFORE = dur * 0.15;
  const CUE_AFTER  = dur * 0.45;
  // Divider sweeps left → right
  const dividerX = interpolate(
    spring({ frame: frame - dur * 0.35, fps, config: { damping: 200 }, durationInFrames: 40 }),
    [0, 1], [0, 960 - 2]  // half width - half divider
  );

  const labelsOp = interpolate(frame, [CUE_LABELS, CUE_LABELS + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bCues = [CUE_BEFORE, CUE_BEFORE + dur * 0.08, CUE_BEFORE + dur * 0.16];
  const aCues = [CUE_AFTER,  CUE_AFTER + dur * 0.08,  CUE_AFTER + dur * 0.16];

  const PointList: React.FC<{ points: [string,string,string]; cues: number[]; color: string; prefix?: string }> = ({
    points, cues, color, prefix = '✗',
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
      {points.map((pt, i) => {
        const op = interpolate(frame - cues[i], [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const y  = interpolate(spring({ frame: frame - cues[i], fps, config: { damping: 200 } }), [0, 1], [20, 0]);
        return (
          <div key={i} style={{ opacity: op, transform: `translateY(${y}px)`, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, color, fontFamily: MONO_FONT, fontWeight: '700', flexShrink: 0, marginTop: 2 }}>{prefix}</span>
            <span style={{ fontSize: 24, color: '#e2e8f0', fontFamily: FONT, fontWeight: '500', lineHeight: 1.4 }}>{pt}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <NoiseOverlay />

      {/* Before side */}
      <AbsoluteFill style={{ clipPath: `inset(0 ${1920 - dividerX}px 0 0)`, background: 'rgba(239,68,68,0.04)' }} />
      {/* After side */}
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${dividerX}px)`, background: av.bg }} />

      {/* Divider line */}
      <div style={{
        position: 'absolute' as const, top: 0, left: dividerX, width: 2, height: '100%',
        background: `linear-gradient(to bottom, transparent, ${accentColor} 20%, ${accentColor} 80%, transparent)`,
        boxShadow: `0 0 20px ${av.glow}`,
      }} />

      {/* Content */}
      <AbsoluteFill style={{ display: 'flex' }}>
        {/* Before */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', padding: '60px 60px 60px 80px', opacity: labelsOp }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 100, padding: '7px 18px', width: 'fit-content' }}>
            <span style={{ fontSize: 17, color: '#ef4444', fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' as const }}>{beforeLabel}</span>
          </div>
          <PointList points={beforePoints} cues={bCues} color="#ef4444" prefix="✗" />
        </div>

        {/* After */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', padding: '60px 80px 60px 60px', opacity: labelsOp }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: av.bg, border: `1px solid ${av.border}`, borderRadius: 100, padding: '7px 18px', width: 'fit-content' }}>
            <span style={{ fontSize: 17, color: accentColor, fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' as const }}>{afterLabel}</span>
          </div>
          <PointList points={afterPoints} cues={aCues} color={accentColor} prefix="✓" />
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 17: Create SceneHowItWorks.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneHowItWorks.tsx`

```tsx
// agentforge-video/src/scenes/SceneHowItWorks.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import type { SceneHowItWorksProps, SharedSceneProps } from '../types';

export const SceneHowItWorks: React.FC<SceneHowItWorksProps & SharedSceneProps> = ({
  title, steps,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_TITLE = 0;
  const stepCues  = steps.map((_, i) => dur * (0.25 + i * 0.22));
  const lineCues  = steps.slice(0, -1).map((_, i) => dur * (0.36 + i * 0.22));

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 20%, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: 50 }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
          <WordByWord
            text={title} frame={frame} fps={fps} startFrame={CUE_TITLE} staggerFrames={4}
            style={{ justifyContent: 'center' }}
            wordStyle={{ fontSize: 56, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}
          />
        </div>

        {/* Steps row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%' }}>
          {steps.map((step, i) => {
            const cue = stepCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 15 } });
            const scale = interpolate(p, [0, 1], [0.6, 1]);
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

            // Connecting line
            const lineProgress = i < steps.length - 1
              ? interpolate(frame - lineCues[i], [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              : 0;

            return (
              <React.Fragment key={i}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, opacity: op, transform: `scale(${scale})` }}>
                  {/* Number circle */}
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: av.bg, border: `2px solid ${av.strong}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 30px ${av.glow}`,
                  }}>
                    <span style={{ fontSize: 36, color: accentColor, fontFamily: DISPLAY_FONT }}>{step.number}</span>
                  </div>
                  {/* Icon */}
                  <div style={{ fontSize: 40 }}>{step.icon}</div>
                  {/* Text */}
                  <div style={{ textAlign: 'center' as const, maxWidth: 280 }}>
                    <div style={{ fontSize: 26, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT, marginBottom: 8 }}>{step.title}</div>
                    <div style={{ fontSize: 19, color: 'rgba(148,163,184,0.75)', fontFamily: FONT, lineHeight: 1.5 }}>{step.description}</div>
                  </div>
                </div>

                {/* Connecting line */}
                {i < steps.length - 1 && (
                  <div style={{ width: 80, height: 2, alignSelf: 'flex-start', marginTop: 39, flexShrink: 0 }}>
                    <div style={{ width: `${lineProgress * 100}%`, height: '100%', background: `linear-gradient(90deg, ${accentColor}, ${av.border})` }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 18: Create SceneProductShowcase.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneProductShowcase.tsx`

```tsx
// agentforge-video/src/scenes/SceneProductShowcase.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneProductShowcaseProps, SharedSceneProps } from '../types';

export const SceneProductShowcase: React.FC<SceneProductShowcaseProps & SharedSceneProps> = ({
  productName, tagline, price,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  // Ken Burns: slow zoom 1.0 → 1.08
  const zoom = interpolate(frame, [0, dur], [1.0, 1.08], { extrapolateRight: 'clamp' });

  const CUE_NAME  = dur * 0.30;
  const CUE_TAG   = dur * 0.50;
  const CUE_PRICE = dur * 0.62;

  const nameP  = spring({ frame: frame - CUE_NAME, fps, config: { damping: 200 } });
  const nameY  = interpolate(nameP, [0, 1], [40, 0]);
  const nameOp = interpolate(frame - CUE_NAME, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const tagOp = interpolate(frame - CUE_TAG, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const tagY  = interpolate(spring({ frame: frame - CUE_TAG, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  const priceP  = spring({ frame: frame - CUE_PRICE, fps, config: { damping: 15 } });
  const priceSc = interpolate(priceP, [0, 1], [0.6, 1]);
  const priceOp = interpolate(frame - CUE_PRICE, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Background image with Ken Burns */}
      <AbsoluteFill>
        <Img
          src={staticFile(`images/scene_${sceneIndex}.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
      </AbsoluteFill>

      {/* Dark gradient overlay — heavier at bottom */}
      <AbsoluteFill style={{ background: 'linear-gradient(to top, #050d1a 0%, rgba(5,13,26,0.85) 40%, rgba(5,13,26,0.3) 70%, transparent 100%)' }} />
      <NoiseOverlay />

      {/* Content — anchored to bottom */}
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 80px 80px' }}>
        {/* Product name */}
        <div style={{ opacity: nameOp, transform: `translateY(${nameY}px)` }}>
          <div style={{ fontSize: 110, color: '#f1f5f9', fontFamily: DISPLAY_FONT, letterSpacing: '2px', lineHeight: 1 }}>
            {productName.toUpperCase()}
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOp, transform: `translateY(${tagY}px)`, marginTop: 8 }}>
          <div style={{ fontSize: 28, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, fontWeight: '400', maxWidth: 700 }}>
            {tagline}
          </div>
        </div>

        {/* Price badge */}
        {price && (
          <div style={{ opacity: priceOp, transform: `scale(${priceSc})`, transformOrigin: 'left bottom', marginTop: 20 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: accentColor, borderRadius: 100, padding: '12px 32px',
              boxShadow: `0 0 30px ${av.glow}`,
            }}>
              <span style={{ fontSize: 30, color: '#ffffff', fontFamily: FONT, fontWeight: '700' }}>{price}</span>
            </div>
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 19: Create SceneOfferCountdown.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneOfferCountdown.tsx`

```tsx
// agentforge-video/src/scenes/SceneOfferCountdown.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { WordByWord } from '../shared/WordByWord';
import { accentVariants } from '../shared/colorUtils';
import type { SceneOfferCountdownProps, SharedSceneProps } from '../types';

export const SceneOfferCountdown: React.FC<SceneOfferCountdownProps & SharedSceneProps> = ({
  badge, offer, benefit, urgency,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_BADGE   = 0;
  const CUE_OFFER   = dur * 0.15;
  const CUE_BENEFIT = dur * 0.50;
  const CUE_URGENCY = dur * 0.68;

  const badgeOp = interpolate(frame, [CUE_BADGE, CUE_BADGE + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const benefitOp = interpolate(frame - CUE_BENEFIT, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const benefitY  = interpolate(spring({ frame: frame - CUE_BENEFIT, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const urgencyOp = interpolate(frame - CUE_URGENCY, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Progress bar depletes
  const barWidth = interpolate(frame, [0, dur * 0.95], [100, 8], { extrapolateRight: 'clamp' });
  const barGlow  = interpolate(frame % 40, [0, 20, 40], [0.4, 0.8, 0.4]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${av.bg} 0%, transparent 60%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px', gap: 28 }}>
        {/* Badge */}
        <div style={{ opacity: badgeOp }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: av.bg, border: `1px solid ${av.strong}`, borderRadius: 100, padding: '10px 28px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            <span style={{ fontSize: 18, color: accentColor, fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '3px', textTransform: 'uppercase' as const }}>{badge}</span>
          </div>
        </div>

        {/* Offer text */}
        <WordByWord
          text={offer} frame={frame} fps={fps} startFrame={CUE_OFFER} staggerFrames={3}
          style={{ justifyContent: 'center', textAlign: 'center' as const }}
          wordStyle={{ fontSize: 72, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2px', textAlign: 'center' as const }}
        />

        {/* Benefit */}
        <div style={{ opacity: benefitOp, transform: `translateY(${benefitY}px)` }}>
          <div style={{ fontSize: 28, color: accentColor, fontFamily: FONT, fontWeight: '600', textAlign: 'center' as const }}>{benefit}</div>
        </div>

        {/* Urgency text */}
        <div style={{ opacity: urgencyOp }}>
          <div style={{ fontSize: 20, color: 'rgba(148,163,184,0.6)', fontFamily: MONO_FONT, textAlign: 'center' as const, letterSpacing: '1px' }}>{urgency}</div>
        </div>
      </AbsoluteFill>

      {/* Countdown bar at bottom */}
      <div style={{ position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 6 }}>
        <div style={{
          width: `${barWidth}%`, height: '100%',
          background: `linear-gradient(90deg, ${accentColor}, ${av.border})`,
          boxShadow: `0 0 ${barGlow * 20}px ${av.glow}`,
          transition: 'none',
        }} />
      </div>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 20: Create SceneMapLocation.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneMapLocation.tsx`

```tsx
// agentforge-video/src/scenes/SceneMapLocation.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneMapLocationProps, SharedSceneProps } from '../types';

export const SceneMapLocation: React.FC<SceneMapLocationProps & SharedSceneProps> = ({
  address, city, hours, phone,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_MAP  = 0;
  const CUE_PIN  = dur * 0.20;
  const CUE_CARD = dur * 0.45;

  const mapOp = interpolate(frame, [CUE_MAP, CUE_MAP + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Pin drops from above
  const pinP  = spring({ frame: frame - CUE_PIN, fps, config: { damping: 10, stiffness: 120 } });
  const pinY  = interpolate(pinP, [0, 1], [-120, 0]);
  const pinOp = interpolate(frame - CUE_PIN, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Ripple rings from pin
  const ripple1 = interpolate((frame - CUE_PIN - 15) % 60, [0, 60], [0, 2.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ripple1Op = interpolate((frame - CUE_PIN - 15) % 60, [0, 40, 60], [0.6, 0.2, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardP  = spring({ frame: frame - CUE_CARD, fps, config: { damping: 200 } });
  const cardX  = interpolate(cardP, [0, 1], [60, 0]);
  const cardOp = interpolate(frame - CUE_CARD, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      {/* Stylized dot map background */}
      <AbsoluteFill style={{
        opacity: mapOp,
        backgroundImage: `radial-gradient(circle, ${av.border} 1.5px, transparent 1.5px)`,
        backgroundSize: '40px 40px',
      }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 40% 50%, rgba(5,13,26,0) 20%, #050d1a 60%)' }} />
      <NoiseOverlay />

      {/* Pin + ripples */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        {/* Ripple */}
        {[ripple1, ripple1 * 1.4].map((scale, i) => (
          <div key={i} style={{
            position: 'absolute' as const,
            width: 60, height: 60, borderRadius: '50%',
            border: `1.5px solid ${accentColor}`,
            transform: `scale(${scale})`,
            opacity: ripple1Op * (i === 0 ? 1 : 0.5),
          }} />
        ))}

        {/* Pin */}
        <div style={{ opacity: pinOp, transform: `translateY(${pinY}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 50, height: 50, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: accentColor, boxShadow: `0 0 30px ${av.glow}` }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', marginTop: 2 }} />
        </div>
      </AbsoluteFill>

      {/* Location info card */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 80px' }}>
        <div style={{
          opacity: cardOp, transform: `translateX(${cardX}px)`,
          background: 'rgba(10,22,40,0.92)', borderRadius: 20,
          border: `1px solid ${av.border}`, borderLeft: `3px solid ${accentColor}`,
          padding: '36px 40px', minWidth: 380, display: 'flex', flexDirection: 'column', gap: 16,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ fontSize: 36, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT }}>{city}</div>
          <div style={{ width: 40, height: 2, background: accentColor }} />
          <div style={{ fontSize: 22, color: 'rgba(148,163,184,0.85)', fontFamily: FONT, lineHeight: 1.5 }}>{address}</div>
          <div style={{ fontSize: 19, color: 'rgba(148,163,184,0.65)', fontFamily: MONO_FONT }}>🕐 {hours}</div>
          {phone && <div style={{ fontSize: 19, color: accentColor, fontFamily: MONO_FONT }}>📞 {phone}</div>}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 21: Create SceneTeamIntro.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneTeamIntro.tsx`

```tsx
// agentforge-video/src/scenes/SceneTeamIntro.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneTeamIntroProps, SharedSceneProps } from '../types';

export const SceneTeamIntro: React.FC<SceneTeamIntroProps & SharedSceneProps> = ({
  title, members,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_TITLE = 0;
  const cardCues  = members.map((_, i) => dur * (0.25 + i * 0.18));

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#060c18', overflow: 'hidden' }}>
      {/* Warm tint overlay */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(59,90,160,0.12) 0%, transparent 60%)' }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: 50 }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: 54, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}>{title}</div>
          <div style={{ width: 60, height: 2, background: accentColor, margin: '14px auto 0' }} />
        </div>

        {/* Member cards */}
        <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' as const }}>
          {members.map((member, i) => {
            const cue = cardCues[i];
            const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [50, 0]);
            const op  = interpolate(frame - cue, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                background: av.bg, borderRadius: 20, border: `1px solid ${av.border}`,
                padding: '36px 40px', minWidth: 240,
              }}>
                {/* Avatar circle */}
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${av.strong}, ${av.bg})`,
                  border: `2px solid ${av.strong}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 32, color: accentColor, fontFamily: DISPLAY_FONT, letterSpacing: '1px' }}>
                    {member.initials}
                  </span>
                </div>
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 26, fontWeight: '700', color: '#f1f5f9', fontFamily: FONT }}>{member.name}</div>
                  <div style={{ fontSize: 19, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, marginTop: 4 }}>{member.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 22: Create SceneComparison.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneComparison.tsx`

```tsx
// agentforge-video/src/scenes/SceneComparison.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import type { SceneComparisonProps, SharedSceneProps } from '../types';

export const SceneComparison: React.FC<SceneComparisonProps & SharedSceneProps> = ({
  competitorLabel, brandLabel, features,
  accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av = accentVariants(accentColor);

  const CUE_HEADER = 0;
  const rowCues    = features.map((_, i) => dur * (0.20 + i * 0.09));

  const headerOp = interpolate(frame, [CUE_HEADER, CUE_HEADER + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 65% 50%, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 120px' }}>
        <div style={{ width: '100%', maxWidth: 1100 }}>
          {/* Header row */}
          <div style={{ opacity: headerOp, display: 'flex', marginBottom: 8 }}>
            <div style={{ flex: 2 }} />
            <div style={{ flex: 1, textAlign: 'center' as const, padding: '12px 0' }}>
              <span style={{ fontSize: 20, color: 'rgba(148,163,184,0.45)', fontFamily: MONO_FONT, fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' as const }}>
                {competitorLabel}
              </span>
            </div>
            <div style={{ flex: 1, textAlign: 'center' as const, padding: '12px 0', background: av.bg, borderRadius: '12px 12px 0 0', border: `1px solid ${av.border}`, borderBottom: 'none' }}>
              <span style={{ fontSize: 20, color: accentColor, fontFamily: MONO_FONT, fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' as const }}>
                {brandLabel}
              </span>
            </div>
          </div>

          {/* Feature rows */}
          {features.map((f, i) => {
            const cue = rowCues[i];
            const op  = interpolate(frame - cue, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const x   = interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [-20, 0]);
            const isLast = i === features.length - 1;
            return (
              <div key={i} style={{ opacity: op, transform: `translateX(${x}px)`, display: 'flex' }}>
                {/* Feature label */}
                <div style={{ flex: 2, padding: '16px 20px 16px 0', borderBottom: isLast ? 'none' : '1px solid rgba(148,163,184,0.08)' }}>
                  <span style={{ fontSize: 22, color: '#e2e8f0', fontFamily: FONT, fontWeight: '500' }}>{f.label}</span>
                </div>
                {/* Competitor */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: isLast ? 'none' : '1px solid rgba(148,163,184,0.08)' }}>
                  <span style={{ fontSize: 26, color: f.competitor ? 'rgba(148,163,184,0.3)' : 'rgba(239,68,68,0.5)', fontFamily: MONO_FONT }}>
                    {f.competitor ? '✓' : '✗'}
                  </span>
                </div>
                {/* Brand */}
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: av.bg, borderLeft: `1px solid ${av.border}`, borderRight: `1px solid ${av.border}`,
                  borderBottom: isLast ? `1px solid ${av.border}` : `1px solid ${av.border}`,
                }}>
                  <span style={{ fontSize: 26, color: f.brand ? accentColor : 'rgba(148,163,184,0.3)', fontFamily: MONO_FONT }}>
                    {f.brand ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
```

---

### Task 23: TypeScript check + commit Phase 2

**Step 1: Full TypeScript check — must pass zero errors**

```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: **zero errors**.

**Step 2: Commit**

```bash
git add agentforge-video/src/scenes/ agentforge-video/src/shared/ && git commit -m "feat: 8 new scene types (Phase 2) — testimonial, before/after, how-it-works, showcase, countdown, map, team, comparison"
```

---

## Phase 4 — Worker Updates

### Task 24: Update apps/worker/src/types/script.ts

**Files:**
- Modify: `apps/worker/src/types/script.ts`

> This mirrors the `SceneConfig` discriminated union from the Remotion side so GPT-4o output can be typed end-to-end.

```ts
// apps/worker/src/types/script.ts

// ─── Per-scene data mirrors agentforge-video/src/types.ts ───────────────────
export interface ScenePainHookData {
  voiceover:  string;
  headline:   string;
  sub:        string;
  painPoints: [string, string, string];
}

export interface SceneInboxChaosData {
  voiceover:  string;
  items: Array<{ subject: string; from: string; time: string; urgent?: boolean }>;
  punchWords: [string, string, string];
}

export interface SceneCostCounterData {
  voiceover: string;
  intro:     string;
  stat1:     { value: number; unit: string; label: string };
  stat2:     { value: number; unit: string; label: string };
}

export interface SceneBrandRevealData { voiceover: string }

export interface SceneFeatureListData {
  voiceover:     string;
  headlineLines: [string, string, string, string];
  sub:           string;
  features:      Array<{ icon: string; title: string; detail: string; status: string }>;
}

export interface SceneStatsGridData {
  voiceover: string;
  title:     string;
  sub:       string;
  stats:     Array<{ value: string; label: string; sub: string }>;
}

export interface SceneCTAData {
  voiceover:  string;
  headline:   string;
  accentLine: string;
  sub:        string;
}

export interface SceneTestimonialData {
  voiceover: string;
  quote:     string;
  name:      string;
  role:      string;
  company?:  string;
}

export interface SceneBeforeAfterData {
  voiceover:    string;
  beforeLabel:  string;
  beforePoints: [string, string, string];
  afterLabel:   string;
  afterPoints:  [string, string, string];
}

export interface SceneHowItWorksData {
  voiceover: string;
  title:     string;
  steps:     Array<{ number: string; icon: string; title: string; description: string }>;
}

export interface SceneProductShowcaseData {
  voiceover:   string;
  productName: string;
  tagline:     string;
  price?:      string;
}

export interface SceneOfferCountdownData {
  voiceover: string;
  badge:     string;
  offer:     string;
  benefit:   string;
  urgency:   string;
}

export interface SceneMapLocationData {
  voiceover: string;
  address:   string;
  city:      string;
  hours:     string;
  phone?:    string;
}

export interface SceneTeamIntroData {
  voiceover: string;
  title:     string;
  members:   Array<{ name: string; role: string; initials: string }>;
}

export interface SceneComparisonData {
  voiceover:        string;
  competitorLabel:  string;
  brandLabel:       string;
  features:         Array<{ label: string; competitor: boolean; brand: boolean }>;
}

// ─── Discriminated union ─────────────────────────────────────────────────────
export type SceneConfig =
  | { type: 'pain_hook';        props: ScenePainHookData }
  | { type: 'inbox_chaos';      props: SceneInboxChaosData }
  | { type: 'cost_counter';     props: SceneCostCounterData }
  | { type: 'brand_reveal';     props: SceneBrandRevealData }
  | { type: 'feature_list';     props: SceneFeatureListData }
  | { type: 'stats_grid';       props: SceneStatsGridData }
  | { type: 'cta';              props: SceneCTAData }
  | { type: 'testimonial';      props: SceneTestimonialData }
  | { type: 'before_after';     props: SceneBeforeAfterData }
  | { type: 'how_it_works';     props: SceneHowItWorksData }
  | { type: 'product_showcase'; props: SceneProductShowcaseData }
  | { type: 'offer_countdown';  props: SceneOfferCountdownData }
  | { type: 'map_location';     props: SceneMapLocationData }
  | { type: 'team_intro';       props: SceneTeamIntroData }
  | { type: 'comparison';       props: SceneComparisonData };

// ─── Root script ─────────────────────────────────────────────────────────────
export interface VideoScript {
  brandName:   string;
  tagline:     string;
  ctaText:     string;
  ctaUrl:      string;
  accentColor: string;   // hex extracted from brand site
  scenes:      SceneConfig[];  // 4–7 entries chosen by GPT
}
```

---

### Task 25: Update scraper.ts — extract accentColor

**Files:**
- Modify: `apps/worker/src/jobs/scraper.ts`

Find the `scrapeUrl` function. Add accent color extraction from HTML. The `ScrapeResult` interface needs a new field:

```ts
export interface ScrapeResult {
  text:          string;
  brandImageUrl: string | null;
  accentColor:   string | null;  // ← NEW
}
```

In the function body, after extracting `brandImageUrl`, add:

```ts
// Extract accent color from theme-color meta or first accent-looking color
const themeColorMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
                     || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
const accentColor = themeColorMatch
  ? themeColorMatch[1].trim()
  : null;

return { text, brandImageUrl, accentColor };
```

---

### Task 26: Update scriptgen.ts — dynamic scene selection

**Files:**
- Modify: `apps/worker/src/jobs/scriptgen.ts`

Update the function signature to accept `accentColor` as context, and completely replace the `SYSTEM` and `buildPrompt` functions:

```ts
// apps/worker/src/jobs/scriptgen.ts
import OpenAI from 'openai';
import type { VideoScript } from '../types/script';

const client = new OpenAI();

const SYSTEM = `You are an expert video ad scriptwriter. Analyse business content and output a dynamic video ad script choosing the most appropriate scene types for this specific business.

You must select 4–7 scenes from the AVAILABLE SCENE TYPES. Always include brand_reveal. Always end with cta. Choose scenes that make sense for this business type.

AVAILABLE SCENE TYPES:
- pain_hook: Headline + 3 pain points. Use for ANY business with a clear customer problem.
- inbox_chaos: Inbox overflowing with tasks/emails. Use for B2B SaaS, agencies, service businesses.
- cost_counter: Animated counter showing money/time wasted. Use for ROI-heavy narratives.
- brand_reveal: Brand name reveal moment. ALWAYS include.
- feature_list: 3-feature solution grid with live status. Use for SaaS, apps, digital services.
- stats_grid: 3 social proof numbers. Use when you have strong metrics/results.
- cta: Full-screen call to action. ALWAYS last.
- testimonial: Customer quote. Use for service businesses, healthcare, local services.
- before_after: Split screen before/after comparison. Use for transformation stories.
- how_it_works: 3-step process. Use for services, apps, anything with a clear process.
- product_showcase: Hero image + name + price. Use for physical products, food, beauty.
- offer_countdown: Urgency + offer. Use for promotions, local businesses, ecommerce.
- map_location: Location pin + address + hours. Use for any local business.
- team_intro: Meet the team. Use for healthcare, legal, professional services, agencies.
- comparison: Brand vs. competitor table. Use for SaaS, competitive markets.

Always respond with valid JSON matching the EXACT schema given. No extra keys. No nulls.`;

function buildPrompt(sourceText: string, inputType: string, accentColor: string | null): string {
  return `Analyse this ${inputType} content and create a complete video ad script with DYNAMICALLY CHOSEN scenes.
Brand accent color (for context): ${accentColor ?? 'unknown'}

SOURCE CONTENT:
${sourceText.slice(0, 4000)}

Return a JSON object with this EXACT structure:
{
  "brandName": "Company/product name from content",
  "tagline": "Compelling one-line tagline (max 6 words)",
  "ctaText": "CTA button text e.g. 'Book a Free Demo'",
  "ctaUrl": "Website URL from content or infer from brand name",
  "accentColor": "Brand primary color as hex (e.g. #e63946), or infer from industry if unknown",
  "scenes": [
    // 4–7 scene objects. Choose types appropriate for this business.
    // Each object: { "type": "<scene_type>", "props": { ...all required fields for that type... } }
    // voiceover is always 15–25 words.
    // pain_hook props: { voiceover, headline, sub, painPoints: [str, str, str] }
    // inbox_chaos props: { voiceover, items: [{subject, from, time, urgent?}] (4 items), punchWords: [str, str, str] }
    // cost_counter props: { voiceover, intro, stat1: {value: number, unit, label}, stat2: {value: number, unit, label} }
    // brand_reveal props: { voiceover }
    // feature_list props: { voiceover, headlineLines: [str, str, str, str], sub, features: [{icon, title, detail, status}] (3 items) }
    // stats_grid props: { voiceover, title, sub, stats: [{value: string, label, sub}] (3 items) }
    // cta props: { voiceover, headline, accentLine, sub }
    // testimonial props: { voiceover, quote, name, role, company? }
    // before_after props: { voiceover, beforeLabel, beforePoints: [str, str, str], afterLabel, afterPoints: [str, str, str] }
    // how_it_works props: { voiceover, title, steps: [{number: "01", icon: "emoji", title, description}] (3 steps) }
    // product_showcase props: { voiceover, productName, tagline, price? }
    // offer_countdown props: { voiceover, badge, offer, benefit, urgency }
    // map_location props: { voiceover, address, city, hours, phone? }
    // team_intro props: { voiceover, title, members: [{name, role, initials}] (2–4 members) }
    // comparison props: { voiceover, competitorLabel, brandLabel, features: [{label, competitor: bool, brand: bool}] (5–7 rows) }
  ]
}`;
}

export async function generateScript(
  sourceText: string,
  inputType: string,
  accentColor: string | null = null,
): Promise<VideoScript> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildPrompt(sourceText, inputType, accentColor) },
    ],
    max_tokens: 4000,
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error('GPT-4o returned empty content');

  try {
    return JSON.parse(raw) as VideoScript;
  } catch {
    throw new Error(`Failed to parse GPT-4o JSON: ${raw.slice(0, 200)}`);
  }
}
```

---

### Task 27: Update pipeline.ts — thread accentColor

**Files:**
- Modify: `apps/worker/src/jobs/pipeline.ts`

Find the section that calls `scrapeUrl` and `generateScript`. Update it to pass `accentColor`:

```ts
// After scrapeUrl:
const { text, brandImageUrl, accentColor } = await scrapeUrl(inputData.url);
sourceText = text;

// Update generateScript call to pass accentColor:
const script = await generateScript(sourceText, inputType, accentColor);
```

No other changes needed — `script.accentColor` is already part of `VideoScript` and gets passed to `renderVideo` via `script`.

---

### Task 28: Update render.ts — scene_N naming + accentColor in props

**Files:**
- Modify: `apps/worker/src/jobs/render.ts`

Two changes:
1. Copy audio files as `scene_N.mp3` (was `scene${i+1}.mp3`)
2. Copy images as `scene_N.png` (was named by scene type)
3. Add `accentColor` to remotionProps

```ts
// In renderVideo():

// 1. Copy voiceover audio files — CHANGE: scene_0, scene_1 etc.
audioPaths.forEach((src, i) => {
  const dest = path.join(remotionPublic, `audio/voiceover/scene_${i}.mp3`);  // ← was scene${i+1}
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
});

// 2. Copy background images — CHANGE: scene_0, scene_1 etc.
imagePaths.forEach((src, i) => {
  const dest = path.join(remotionPublic, `images/scene_${i}.png`);  // ← was bgNames[i]
  if (fs.existsSync(src)) fs.copyFileSync(src, dest);
});

// 3. Add accentColor to remotionProps
const remotionProps = {
  brandName:   script.brandName,
  tagline:     script.tagline,
  ctaText:     script.ctaText,
  ctaUrl:      script.ctaUrl,
  accentColor: script.accentColor ?? '#3b82f6',  // ← NEW
  scenes:      script.scenes,
};
```

---

### Task 29: Update images.ts — use scene_N in Gemini prompts

**Files:**
- Modify: `apps/worker/src/jobs/images.ts`

The `generateImages` function currently uses hardcoded scene names for Gemini prompts. Update to use scene index and pass `scene.type` from the script for context:

Change the function signature to accept `scenes: SceneConfig[]` instead of `voiceovers: string[]`:

```ts
export async function generateImages(
  scenes:        SceneConfig[],       // ← was voiceovers: string[]
  workDir:       string,
  brandName:     string,
  brandImageUrl: string | null,
): Promise<string[]>
```

Then build prompts using `scene.type` and the voiceover from `scene.props.voiceover`:

```ts
const voiceover = (scene.props as any).voiceover ?? '';
const promptMap: Record<string, string> = {
  pain_hook:        `dramatic moody illustration for a business problem ad — ${brandName} — dark cinematic`,
  inbox_chaos:      `busy chaotic office inbox notifications overwhelm — dark moody — ${brandName}`,
  cost_counter:     `abstract financial loss clock ticking — dark dramatic — ${brandName}`,
  brand_reveal:     `sleek minimalist dark brand reveal background — abstract — ${brandName}`,
  feature_list:     `modern tech dashboard dark background — abstract blue — ${brandName}`,
  stats_grid:       `data visualization dark abstract background — ${brandName}`,
  cta:              `dramatic call to action background dark cinematic — ${brandName}`,
  testimonial:      `professional portrait style blurred background — ${brandName}`,
  before_after:     `split scene transformation — dark left bright right — ${brandName}`,
  how_it_works:     `clean process diagram abstract background — ${brandName}`,
  product_showcase: `product hero shot clean background — ${brandName} — ${voiceover}`,
  offer_countdown:  `urgency excitement promotional background dark — ${brandName}`,
  map_location:     `aerial city view at night with lights — ${brandName}`,
  team_intro:       `professional team office environment warm lighting — ${brandName}`,
  comparison:       `competitive market abstract background dark — ${brandName}`,
};
const geminiPrompt = promptMap[scene.type] ?? `${brandName} — ${voiceover} — cinematic dark`;
```

Update the call in `pipeline.ts` accordingly:
```ts
const imagePaths = await generateImages(script.scenes, workDir, script.brandName, brandImageUrl);
```

---

### Task 30: Final TypeScript check + full commit + push

**Step 1: Check worker**

```bash
cd apps/worker && npx tsc --noEmit
```
Expected: **zero errors**.

**Step 2: Check Remotion**

```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: **zero errors**.

**Step 3: Commit all worker changes**

```bash
git add apps/worker/src/ && git commit -m "feat(worker): dynamic scene selection + accentColor extraction + scene_N naming"
```

**Step 4: Push**

```bash
git push origin main
```

---

### Task 31: VPS deployment

SSH into VPS and run:

```bash
cd /path/to/project
git pull
cd apps/worker && npm install && npm run build
pm2 restart all
pm2 logs --lines 30
```

Verify:
- No startup errors
- `Worker API on :3001` in logs

---

## End-to-End Test

After VPS deployment, test two inputs:

**Test 1 — SaaS product:**
URL: `https://stripe.com`
Expected: video uses `pain_hook` → `feature_list` → `stats_grid` → `brand_reveal` → `cta`
Verify: brand name "Stripe", accent color is Stripe blue (#635BFF or similar)

**Test 2 — Local service:**
Prompt: "Dental clinic called SmilePro Milano, accepting new patients, specializes in cosmetic dentistry and orthodontics"
Expected: video uses `pain_hook` → `before_after` → `how_it_works` → `team_intro` → `map_location` → `cta`
Verify: zero occurrences of AgentForge copy, address shows Milano, before/after shows dental transformation

---

## Extensibility: Adding a New Scene in the Future

1. Create `agentforge-video/src/scenes/SceneNewType.tsx` implementing `React.FC<SceneNewTypeProps & SharedSceneProps>`
2. Add `| { type: 'new_type'; props: SceneNewTypeProps }` to discriminated union in `agentforge-video/src/types.ts`
3. Add `new_type: SceneNewType` to `agentforge-video/src/sceneRegistry.ts`
4. Add `SceneNewTypeData` interface + union entry to `apps/worker/src/types/script.ts`
5. Add `new_type` to the scene catalogue in `apps/worker/src/jobs/scriptgen.ts` SYSTEM prompt

Total: ~5 files, ~15 minutes of work per new scene type.
