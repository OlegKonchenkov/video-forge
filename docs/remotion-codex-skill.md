# Remotion Scene Generation — Codex Skill Reference

> **Purpose**: This document is the complete knowledge pack for an AI code-generation agent (Codex mode) to produce custom Remotion scene `.tsx` files from scratch at runtime. It covers every convention, shared utility, type contract, animation pattern, and hard rule enforced in this project.

---

## 1. Architecture Overview

```
agentforge-video/
├── src/
│   ├── Root.tsx                 # Composition registration + calculateMetadata
│   ├── AgentForgeAd.tsx         # Main composition — assembles scenes via TransitionSeries
│   ├── calculateMetadata.ts     # Dynamic duration/resolution from audio + aspectRatio
│   ├── constants.ts             # FPS=30, TRANSITION_FRAMES=15, COLORS
│   ├── types.ts                 # All interfaces (SharedSceneProps, per-scene props, SceneConfig union)
│   ├── sceneRegistry.ts         # Maps type string → React component
│   ├── font.ts                  # FONT (DM Sans) + MONO_FONT (JetBrains Mono)
│   ├── scenes/                  # 26 scene components (Scene*.tsx)
│   └── shared/                  # Reusable visual primitives + hooks + utilities
└── public/
    ├── audio/voiceover/         # scene_0.mp3, scene_1.mp3, ...
    ├── audio/music/             # background.mp3
    └── images/                  # scene_0.png, scene_1.png, ...
```

### How Scenes Are Assembled

`AgentForgeAd.tsx` receives an array of `SceneConfig` objects. For each scene:
1. Looks up the component in `SCENE_REGISTRY[scene.type]`
2. Injects `SharedSceneProps` (accentColor, bgColor, etc.)
3. Spreads `scene.props` (scene-specific data)
4. Wraps in `<TransitionSeries.Sequence>` with per-scene duration
5. Adds transition effect between scenes (fade, slide, wipe, clockWipe, flip)

A global `<LightLeak>` overlay (9% opacity, screen blend) and background music loop are applied on top.

### calculateMetadata

When `hasVoiceover=true`, reads each `audio/voiceover/scene_{i}.mp3` via `getAudioDurationInSeconds` (from `@remotion/media-utils`), converts to frames (`ceil(seconds * 30) + 25 padding`). This means **each scene's `durationInFrames` is proportional to its voiceover length**. When `hasVoiceover=false`, each scene gets a fixed 180 frames (6 seconds).

The `aspectRatio` prop controls canvas size:
- `'16:9'` → 1920×1080 (landscape)
- `'9:16'` → 1080×1920 (portrait/reel)

---

## 2. SharedSceneProps Contract

Every scene component receives these props, injected by `AgentForgeAd`:

```ts
interface SharedSceneProps {
  accentColor:  string;    // Brand accent hex, e.g. '#3b82f6'
  bgColor:      string;    // Background hex, e.g. '#050d1a'
  surfaceColor: string;    // Card/panel hex, e.g. '#0a1628'
  showImage:    boolean;   // Whether to render background image layer
  brandName:    string;    // e.g. 'AgentForge'
  tagline:      string;    // e.g. 'AI Automation for Growing Businesses'
  ctaText:      string;    // e.g. 'Book a Free Call'
  ctaUrl:       string;    // e.g. 'agentforge.ai/start'
  audioPath:    string;    // e.g. 'audio/voiceover/scene_2.mp3' (empty if no voiceover)
  sceneIndex:   number;    // 0-based position in video
  sceneTotal:   number;    // total number of scenes
  variantId:    number;    // visual variant preset (0-4)
}
```

### Scene Component Signature

```tsx
export const SceneExample: React.FC<SceneExampleProps & SharedSceneProps> = ({
  // Scene-specific props (destructured from SceneExampleProps)
  title, items,
  // SharedSceneProps (destructured)
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  // ... component body
};
```

---

## 3. Fonts

Only two fonts are available. **Never reference any other font family.**

```ts
import { FONT, MONO_FONT } from '../font';
```

| Constant | Family | Usage |
|----------|--------|-------|
| `FONT` | DM Sans (400, 500, 700) | All body text, headings, descriptions |
| `MONO_FONT` | JetBrains Mono (400, 600) | Stats, URLs, percentages, labels, counters, badges |

**DISPLAY_FONT does NOT exist. Never use it.**

---

## 4. Proportional Timing Pattern (Critical)

All animation cues are expressed as fractions of the scene's total duration. This ensures animations stay synchronized with voiceover regardless of audio length.

```tsx
const frame = useCurrentFrame();
const { fps, durationInFrames: dur } = useVideoConfig();

// Cue points — all proportional to scene duration
const CUE_BADGE   = dur * 0.04;   // 4% into the scene
const CUE_TITLE   = dur * 0.10;   // 10% into the scene
const CUE_CARD_1  = dur * 0.35;   // 35% into the scene
const CUE_CARD_2  = dur * 0.50;   // 50% into the scene
const CUE_CARD_3  = dur * 0.65;   // 65% into the scene
```

**Rules:**
- **NEVER** use `fps * seconds` for timing — always `dur * fraction`
- Cues must fit between 0.0 and ~0.85 (leave room for exit animation)
- Staggered items: space 0.12–0.16 apart (e.g., `dur * 0.35`, `dur * 0.49`, `dur * 0.63`)
- First visible element should appear at `dur * 0.04` (not frame 0 — that's mid-transition)

---

## 5. Standard Animation Patterns

### 5.1 Spring Entry (most common)

```tsx
import { spring, interpolate } from 'remotion';

const p  = spring({ frame: frame - CUE, fps, config: { damping: 200 } });
const y  = interpolate(p, [0, 1], [30, 0]);              // slide up 30px
const op = interpolate(frame - CUE, [0, 14], [0, 1], {   // fade in over 14 frames
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});

// In JSX:
<div style={{ opacity: op, transform: `translateY(${y}px)` }}>
```

Spring config `{ damping: 200 }` is the project standard. Use `{ damping: 180, stiffness: 120 }` for bouncier entries, `{ damping: 130, stiffness: 200 }` for snappy scale-ins.

### 5.2 Exit Animation (mandatory on every scene)

```tsx
const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});

// Applied to the main content AbsoluteFill:
<AbsoluteFill style={{ opacity: exitOp, /* ... */ }}>
```

Some scenes fade to 0.3 instead of 0 (`[1, 0.3]`). This is acceptable. The exit must start at ~88% of duration.

### 5.3 Staggered List Entry

```tsx
const itemCues = [dur * 0.35, dur * 0.49, dur * 0.63];

{items.map((item, i) => {
  const cue = itemCues[i];
  const p   = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const x   = interpolate(p, [0, 1], [40, 0]);   // slide from right
  const op  = interpolate(frame - cue, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return (
    <div key={i} style={{ opacity: op, transform: `translateX(${x}px)` }}>
      {/* ... */}
    </div>
  );
})}
```

### 5.4 Pulsing Glow

```tsx
const glowPulse = 0.5 + Math.sin(frame * 0.08) * 0.5;  // oscillates 0–1
const boxShadow = `0 0 ${20 + glowPulse * 30}px ${accentColor}`;
```

### 5.5 Number Scramble (for stats/counters)

```tsx
function scramble(target: string, frame: number, cue: number): string {
  const CHARS = '0123456789ABCDEFX';
  const elapsed = frame - cue;
  if (elapsed < 0) return target.replace(/[0-9]/g, '0');
  if (elapsed >= 32) return target;
  return target.split('').map((ch) => {
    if (!/[0-9]/.test(ch)) return ch;
    const progress = elapsed / 32;
    const settled = (frame * 7 + target.charCodeAt(0)) % (32 - elapsed) === 0 || progress > 0.85;
    return settled ? ch : CHARS[(frame * 13 + target.charCodeAt(0)) % CHARS.length];
  }).join('');
}
```

### 5.6 SVG Stroke Draw-In (via @remotion/paths)

```tsx
import { evolvePath } from '@remotion/paths';

const SVG_PATH = 'M60 10 L110 30 L110 70 C110 100 85 120 60 130 C35 120 10 100 10 70 L10 30 Z';
const drawProgress = interpolate(frame, [CUE_START, CUE_END], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});
const evo = evolvePath(drawProgress, SVG_PATH);

<path
  d={SVG_PATH}
  strokeDasharray={evo.strokeDasharray}
  strokeDashoffset={evo.strokeDashoffset}
/>
```

---

## 6. Responsive Layout System

### useSceneLayout Hook

```tsx
import { useSceneLayout } from '../shared/useSceneLayout';

const layout = useSceneLayout();
```

Returns a `SceneLayout` object:

| Property | Portrait (9:16) | Landscape (16:9) | Usage |
|----------|-----------------|-------------------|-------|
| `isPortrait` | `true` | `false` | Branch logic |
| `width` | 1080 | 1920 | Canvas width |
| `height` | 1920 | 1080 | Canvas height |
| `displaySize` | 100 | 96 | Hero numbers, giant text |
| `headingSize` | 54 | 56 | Scene headings |
| `bodySize` | 26 | 28 | Body/description text |
| `labelSize` | 15 | 16 | Mono labels, caps text |
| `outerPadding` | 56 | 80 | Left/right scene padding |
| `innerGap` | 48 | 40 | Gap between major sections |
| `cardGap` | 22 | 28 | Gap between cards/items |
| `direction` | `'column'` | `'row'` | flexDirection for split panels |
| `maxContentWidth` | width-112 | 1200 | Max-width for centered blocks |
| `maxListItems` | 3 | 3 | Max items to render |

### Layout Pattern

```tsx
<AbsoluteFill style={{
  display: 'flex',
  flexDirection: layout.direction,        // row in landscape, column in portrait
  alignItems: 'center',
  justifyContent: 'center',
  padding: `0 ${layout.outerPadding}px`,
  gap: layout.innerGap,
  opacity: exitOp,
}}>
```

For split-panel scenes (before/after, case study):
```tsx
<div style={{ flex: 1, padding: layout.isPortrait ? '0' : '0 52px 0 0' }}>
  {/* Left/top panel */}
</div>
<div style={{ flex: 1, padding: layout.isPortrait ? '0' : '0 0 0 52px' }}>
  {/* Right/bottom panel */}
</div>
```

---

## 7. Visual Variant System

### useVisualVariant Hook

```tsx
import { useVisualVariant } from '../shared/useVisualVariant';

const variant = useVisualVariant(variantId, accentColor);
const av = variant.av;  // AccentVariants shorthand
```

### 5 Visual Presets

| ID | Name | bgPrimitive | Entry | Card Style | Color Treatment |
|----|------|-------------|-------|------------|-----------------|
| 0 | TECH | particles | slide left | radius 8, left border, 0.45 bg | standard |
| 1 | ELEGANT | gradient_mesh | scale bottom | radius 24, top border, 0.06 bg | muted |
| 2 | MINIMAL | none | fade bottom | radius 4, bottom border, 0.03 bg | monochrome |
| 3 | BOLD | geometric | slide bottom | radius 16, all border, 0.55 bg | vibrant |
| 4 | RETRO | scanlines | slide right | radius 0, left border, 0.40 bg | standard |

### AccentVariants (`av`)

Generated from `accentColor` via `accentVariants(hex)`:

| Property | Description | Typical Use |
|----------|-------------|-------------|
| `av.solid` | Full opacity accent | Text, icons, borders |
| `av.glow` | `rgba(accent, 0.25)` | Halos, radial glow, boxShadow |
| `av.strong` | `rgba(accent, 0.45)` | Card left-border highlight |
| `av.border` | `rgba(accent, 0.22)` | Card borders |
| `av.bg` | `rgba(accent, 0.07)` | Card backgrounds, subtle fills |

### VariantBackground Component

Renders the background primitive for the active variant:

```tsx
import { VariantBackground } from '../shared/VariantBackground';

<VariantBackground variant={variant} accentColor={accentColor} />
```

Renders one of: `<ParticleField>`, `<GradientMesh>`, `<GeometricShapes>`, `<ScanlineEffect>`, or nothing (MINIMAL).

---

## 8. Shared Components Reference

### 8.1 SceneBackground

**Image layer using Remotion's `<Img>` for frame-perfect loading.**

```tsx
import { SceneBackground } from '../shared/SceneBackground';

<SceneBackground showImage={showImage} sceneIndex={sceneIndex} />
// or with custom overlay:
<SceneBackground showImage={showImage} sceneIndex={sceneIndex} overlayOpacity={0.78} />
```

- Default overlay opacity: 0.80
- Loads `images/scene_{sceneIndex}.png` via `staticFile()`
- **NEVER use CSS `backgroundImage` or `background: url(...)`.** Always use `<Img>` from Remotion.

### 8.2 NoiseOverlay

Film-grain SVG filter overlay for cinematic texture.

```tsx
import { NoiseOverlay } from '../shared/NoiseOverlay';

<NoiseOverlay />           // default 3.5% opacity
<NoiseOverlay opacity={0.05} />
```

### 8.3 SceneCounter

Bottom-left scene counter in mono font.

```tsx
import { SceneCounter } from '../shared/SceneCounter';

<SceneCounter current={sceneIndex + 1} total={sceneTotal} />
```

### 8.4 SVG Decorations

```tsx
import { CornerBrackets, FloatingOrbs, TechGrid, ScanBeam, Crosshair, StatusDot } from '../shared/SvgDecorations';
```

| Component | Visual | Good For |
|-----------|--------|----------|
| `CornerBrackets` | L-brackets in 4 corners, draw-in animation | Tech, data, professional |
| `FloatingOrbs` | Soft floating accent circles | Atmospheric, elegant |
| `TechGrid` | Subtle perspective grid pattern | Data dashboards, stats |
| `ScanBeam` | Horizontal scan line sweeping vertically | Tech, terminal, sci-fi |
| `Crosshair` | Rotating crosshair indicator | Precision, targeting |
| `StatusDot` | Pulsing status indicator | Status badges, live indicators |

Common usage:
```tsx
<CornerBrackets
  color={accentColor}
  size={layout.isPortrait ? 16 : 24}
  offset={layout.isPortrait ? 28 : 40}
  startFrame={Math.round(CUE_START)}
  opacity={0.18}
/>
```

### 8.5 Text Animation Components

**WordByWord** — Word-level staggered reveal:
```tsx
import { WordByWord } from '../shared/WordByWord';

<WordByWord
  text="Your team is drowning in busywork."
  frame={frame} fps={fps} startFrame={CUE}
  staggerFrames={3}
  style={{ justifyContent: 'center' }}
  wordStyle={{ fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT }}
  accentWords={['drowning']}
  accentColor={accentColor}
/>
```

**KineticText** — Character-level reveal (blur-in / slide-up / scale-in):
```tsx
import { KineticText } from '../shared/KineticText';

<KineticText
  text={headline}
  startFrame={CUE}
  fps={fps}
  type="blur-in"        // 'blur-in' | 'slide-up' | 'scale-in'
  staggerFrames={2}
  style={{ fontSize: headFontSize, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT }}
/>
```

### 8.6 Visual Effect Overlays

**ShimmerOverlay** — Diagonal light sweep (for buttons, cards):
```tsx
import { ShimmerOverlay } from '../shared/ShimmerOverlay';

<div style={{ position: 'relative', overflow: 'hidden' }}>
  <span>Button Text</span>
  <ShimmerOverlay color="#ffffff" periodFrames={70} opacity={0.5} />
</div>
```

### 8.7 Background Primitives (used via VariantBackground, but can be used directly)

**ParticleField** — Floating particle dots:
```tsx
<ParticleField color={accentColor} count={45} opacity={0.22} speed={1.2} maxRadius={3} />
```

**GradientMesh** — 3-layer oscillating radial gradients:
```tsx
<GradientMesh colors={[accentColor, hueRotate(accentColor, 45), hueRotate(accentColor, -55)]} speed={0.8} opacity={0.50} />
```

**GeometricShapes** — Rotating SVG shapes:
```tsx
<GeometricShapes color={accentColor} count={8} opacity={0.08} style="mixed" />
```

**ScanlineEffect** — CRT horizontal lines:
```tsx
<ScanlineEffect opacity={0.06} spacing={5} />
```

### 8.8 fitText — Dynamic Text Sizing

```tsx
import { fitText, fitSingleLine } from '../shared/fitText';

// Multi-line: finds max fontSize where text fits in containerWidth × maxLines
const fontSize = fitText(headline, baseSize, containerWidth, 2);

// Single-line convenience:
const fontSize = fitSingleLine(accentLine, baseSize, containerWidth);
```

Uses `@remotion/layout-utils` for precise DOM measurement with heuristic fallback.

### 8.9 emojiMap — Icon Resolution

```tsx
import { resolveEmoji } from '../shared/emojiMap';

const emoji = resolveEmoji('email');  // → '📧'
const emoji = resolveEmoji('🚀');    // → '🚀' (pass-through)
const emoji = resolveEmoji('xyz');   // → '✦' (fallback)
```

Maps ~80 English names to emoji. Already-emoji input passes through.

### 8.10 colorUtils

```tsx
import { accentVariants, hueRotate, themeVariants } from '../shared/colorUtils';

const av = accentVariants('#3b82f6');  // { solid, glow, strong, border, bg }
const rotated = hueRotate('#3b82f6', 45);  // hex color rotated 45°
const theme = themeVariants(bgColor, surfaceColor, accentColor);  // { bg, surface, overlay, textPrimary, textMuted, accent }
```

---

## 9. Scene Component Template

This is the canonical template every generated scene should follow:

```tsx
// agentforge-video/src/scenes/SceneMyScene.tsx
// Visual: BRIEF DESCRIPTION — key visual elements
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { SceneBackground } from '../shared/SceneBackground';
// Add specific imports as needed: CornerBrackets, TechGrid, WordByWord, etc.
import type { SceneMySceneProps, SharedSceneProps } from '../types';

export const SceneMyScene: React.FC<SceneMySceneProps & SharedSceneProps> = ({
  // Scene-specific props
  title, items,
  // SharedSceneProps
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;
  const layout = useSceneLayout();

  // ─── Timing cues (proportional) ────────────────────────────
  const CUE_TITLE = dur * 0.06;
  const CUE_ITEMS = dur * 0.30;
  // ...more cues as needed...

  // ─── Title animation ───────────────────────────────────────
  const titleP  = spring({ frame: frame - CUE_TITLE, fps, config: { damping: 200 } });
  const titleY  = interpolate(titleP, [0, 1], [24, 0]);
  const titleOp = interpolate(frame - CUE_TITLE, [0, 16], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // ─── Exit animation ────────────────────────────────────────
  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 10], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {/* 1. Background image (if enabled) */}
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />

      {/* 2. Variant background primitive */}
      <VariantBackground variant={variant} accentColor={accentColor} />

      {/* 3. Optional decorations (CornerBrackets, TechGrid, etc.) */}

      {/* 4. Noise overlay */}
      <NoiseOverlay />

      {/* 5. Main content with exit animation */}
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
        opacity: exitOp,
      }}>
        {/* Title */}
        <div style={{
          opacity: titleOp, transform: `translateY(${titleY}px)`,
          textAlign: 'center' as const,
        }}>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1px',
            textShadow: '0 2px 16px rgba(0,0,0,0.7)',
          }}>
            {title}
          </div>
        </div>

        {/* Content cards/items */}
        {/* ... */}
      </AbsoluteFill>

      {/* 6. Scene counter (always last before audio) */}
      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />

      {/* 7. Voiceover audio */}
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
```

### Layer Order (z-stack, bottom to top)

1. `backgroundColor` on root `AbsoluteFill`
2. `<SceneBackground>` — image + dark overlay
3. Optional tint/gradient `AbsoluteFill`
4. `<VariantBackground>` — animated bg primitive
5. SVG decorations (CornerBrackets, TechGrid, etc.)
6. `<NoiseOverlay>` — film grain
7. Main content `AbsoluteFill` (with `exitOp`)
8. `<SceneCounter>` — bottom-left
9. `<Audio>` — voiceover

---

## 10. Card / Glassmorphic Panel Pattern

Most scenes use translucent glass-style cards:

```tsx
<div style={{
  background: 'rgba(255,255,255,0.04)',   // or av.bg
  border: `1px solid ${av.border}`,
  borderLeft: `3px solid ${accentColor}`,  // accent highlight side
  borderRadius: 14,                         // or variant.cardRadius
  padding: '14px 20px',
  boxShadow: `0 0 20px ${av.glow}`,
  display: 'flex', alignItems: 'center', gap: 16,
}}>
```

Common variations:
- `borderTop: '3px solid accent'` for "popular" or highlighted cards
- `background: av.bg` (7% accent tint) for color-coded cards
- `borderRadius: variant.cardRadius` to respect the visual variant

---

## 11. Color & Typography Conventions

### Text Colors
| Use Case | Color |
|----------|-------|
| Primary headings | `'#f1f5f9'` |
| Body text | `'#f1f5f9'` or `'#e2e8f0'` |
| Muted/secondary | `'rgba(148,163,184,0.75)'` or `'rgba(148,163,184,0.55)'` |
| Accent text | `accentColor` (the prop) |
| Danger/negative | `'#ef4444'` or `'rgba(239,68,68,0.7)'` |

### Text Shadows
```tsx
// Standard heading shadow
textShadow: '0 2px 16px rgba(0,0,0,0.7)'
// Strong heading shadow
textShadow: '0 2px 24px rgba(0,0,0,0.9)'
// Body text shadow
textShadow: '0 1px 10px rgba(0,0,0,0.8)'
// Accent glow shadow
textShadow: `0 0 50px ${accentColor}, 0 2px 20px rgba(0,0,0,0.8)`
```

### Font Weights
- `'800'` or `'900'` — headings, hero text
- `'700'` — sub-headings, emphasis
- `'600'` — card titles, feature names
- `'500'` — body text
- `'400'` — secondary text, descriptions

---

## 12. Hard Rules (MUST follow)

### 12.1 No Math.random()
`Math.random()` causes non-deterministic frames (different on each render). Use the deterministic seed function:

```tsx
function det(i: number, offset: number): number {
  return ((Math.sin(i * 127.1 + offset * 311.7) * 43758.5453) % 1 + 1) % 1;
}
```

### 12.2 `as const` Required
TypeScript strict mode requires `as const` on these CSS properties:

```tsx
position: 'absolute' as const,
textAlign: 'center' as const,
flexDirection: 'column' as const,
textTransform: 'uppercase' as const,
whiteSpace: 'nowrap' as const,
overflowWrap: 'break-word' as const,
objectFit: 'cover' as const,
```

### 12.3 No CSS backgroundImage
**NEVER** use `background: url(...)` or `backgroundImage`. Always use Remotion's `<Img>` component (via `SceneBackground` or directly):

```tsx
// WRONG:
style={{ backgroundImage: `url(${staticFile('images/scene_0.png')})` }}

// RIGHT:
<SceneBackground showImage={showImage} sceneIndex={sceneIndex} />
```

### 12.4 Only FONT and MONO_FONT
Never reference `DISPLAY_FONT`, `Inter`, `Arial`, or any other font family. Only use `FONT` (DM Sans) and `MONO_FONT` (JetBrains Mono).

### 12.5 Always Use Proportional Timing
Never `fps * 2` or hardcoded frame numbers. Always `dur * 0.XX`.

### 12.6 Always Include Exit Animation
Every scene must fade/scale out starting at `dur * 0.88`.

### 12.7 Always Include SceneCounter and Audio
```tsx
<SceneCounter current={sceneIndex + 1} total={sceneTotal} />
{audioPath && <Audio src={staticFile(audioPath)} />}
```

### 12.8 Import Audio from @remotion/media
```tsx
import { Audio } from '@remotion/media';
// NOT from 'remotion' — Audio is in the media package
```

### 12.9 Extrapolation Clamping
Always clamp interpolations:
```tsx
interpolate(value, inputRange, outputRange, {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

The only exception is `spring()` which naturally clamps.

---

## 13. Existing Scene Types (26 total)

For reference when generating new scenes or understanding the design language:

| Type | Visual Archetype | Key Elements |
|------|-----------------|--------------|
| `pain_hook` | Glitch terminal | KineticText blur-in, terminal-style cards, status badge |
| `inbox_chaos` | Email flood | Floating email items, urgent highlights, punchwords |
| `cost_counter` | Counting dashboard | Animated number counters, stat labels |
| `brand_reveal` | Logo emergence | Brand name scale-in, tagline fade, gradient wash |
| `feature_list` | Feature grid | Icon circles, feature cards, status badges |
| `stats_grid` | Data dashboard | TechGrid, scramble numbers, metric cards |
| `cta` | Neon pulse | WordByWord headline, shimmer button, domain URL |
| `testimonial` | Client quote | Quote marks, name/role, glassmorphic card |
| `before_after` | Split reveal | Glowing divider, before (red) / after (accent) columns |
| `how_it_works` | Step flow | Numbered circles, connecting lines, step cards |
| `product_showcase` | Product hero | Product `<Img>`, name, tagline, price badge |
| `offer_countdown` | Urgency timer | Badge, offer text, benefit, urgency pulse |
| `map_location` | Location card | SVG map pin, address, hours, phone |
| `team_intro` | Team grid | Initials circles, name/role cards |
| `comparison` | Feature matrix | Two-column check/cross grid, brand highlight |
| `big_stat` | Giant number | Counting up display number, unit, label, sub |
| `mission_statement` | Manifesto | WordByWord statement, 3 value pills |
| `social_proof` | Trust badges | Badge grid with label/value pairs |
| `timeline` | Vertical timeline | Year markers, connecting line, event cards |
| `pricing_table` | Tier cards | 2-3 pricing cards, popular glow, feature lists |
| `case_study` | Client success | Metric delta (before→after), client quote |
| `faq` | Q&A stack | Sequential Q/A cards, accent border |
| `feature_spotlight` | Single feature hero | Large emoji, radial glow, benefit pills |
| `guarantee` | Trust shield | SVG shield draw-in, guarantee checkmark cards |
| `closing_recap` | Key takeaways | Numbered checklist, readyText pulse |
| `animated_chart` | Bar chart | Growing horizontal bars, value countup |

---

## 14. How to Register a New Scene

### Step 1: Define Props Interface in `types.ts`

```ts
export interface SceneMyNewProps {
  voiceover: string;
  title:     string;
  items:     Array<{ label: string; value: string }>;
}
```

### Step 2: Add to SceneConfig Union in `types.ts`

```ts
| { type: 'my_new'; showImage: boolean; variantId?: number; props: SceneMyNewProps }
```

### Step 3: Create Scene Component in `scenes/SceneMyNew.tsx`

Follow the template in Section 9.

### Step 4: Register in `sceneRegistry.ts`

```ts
import { SceneMyNew } from './scenes/SceneMyNew';

// In SCENE_REGISTRY:
my_new: SceneMyNew,
```

### Step 5: Add to scriptgen catalogue (if using prefab mode)

Add entry in `apps/worker/src/jobs/scriptgen.ts` with props schema and USE FOR hints.

---

## 15. Available Remotion Imports

```tsx
// Core
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile, Sequence } from 'remotion';

// Media
import { Audio } from '@remotion/media';

// Media Utils (for calculateMetadata only, not in scene components)
import { getAudioDurationInSeconds } from '@remotion/media-utils';

// Layout Utils (for fitText)
import { fitText as remotionFitText, measureText } from '@remotion/layout-utils';

// Paths (for SVG draw-in animations)
import { evolvePath, getLength } from '@remotion/paths';

// Transitions (used in AgentForgeAd.tsx, not in scenes)
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { flip } from '@remotion/transitions/flip';

// Light Leaks (used in AgentForgeAd.tsx, not in scenes)
import { LightLeak } from '@remotion/light-leaks';

// Google Fonts (already loaded in font.ts)
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

// Images (when needed directly)
import { Img } from 'remotion';
```

---

## 16. Example: Complete Generated Scene

Here is `SceneStatsGrid` as a full reference implementation:

```tsx
// agentforge-video/src/scenes/SceneStatsGrid.tsx
// DATA DASHBOARD — particle field + scramble numbers + glowing metric cards
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, MONO_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import { useVisualVariant } from '../shared/useVisualVariant';
import { VariantBackground } from '../shared/VariantBackground';
import { TechGrid } from '../shared/SvgDecorations';
import { SceneBackground } from '../shared/SceneBackground';
import type { SceneStatsGridProps, SharedSceneProps } from '../types';

const CHARS = '0123456789ABCDEFX';

function scramble(target: string, frame: number, cue: number): string {
  const elapsed = frame - cue;
  if (elapsed < 0) return target.replace(/[0-9]/g, '0');
  if (elapsed >= 32) return target;
  return target.split('').map((ch) => {
    if (!/[0-9]/.test(ch)) return ch;
    const progress = elapsed / 32;
    const settled = (frame * 7 + target.charCodeAt(0)) % (32 - elapsed) === 0 || progress > 0.85;
    return settled ? ch : CHARS[(frame * 13 + target.charCodeAt(0)) % CHARS.length];
  }).join('');
}

export const SceneStatsGrid: React.FC<SceneStatsGridProps & SharedSceneProps> = ({
  title, sub, stats,
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const layout = useSceneLayout();

  const titleP  = spring({ frame, fps, config: { damping: 200 } });
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleY  = interpolate(titleP, [0, 1], [24, 0]);
  const cardCues = [dur * 0.22, dur * 0.36, dur * 0.50];

  const exitOp = interpolate(frame, [dur * 0.88, dur * 0.88 + 12], [1, 0.3], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      <SceneBackground showImage={showImage} sceneIndex={sceneIndex} />
      <VariantBackground variant={variant} accentColor={accentColor} />
      <TechGrid color={accentColor} cellSize={layout.isPortrait ? 48 : 60} opacity={0.04} />
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 30%, ${accentVariants(accentColor).glow} 0%, transparent 60%)`,
      }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`, gap: layout.innerGap, opacity: exitOp,
      }}>
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{
            fontSize: layout.headingSize, fontWeight: '800', color: '#f1f5f9',
            fontFamily: FONT, letterSpacing: '-1.5px',
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: layout.bodySize - 4, color: 'rgba(148,163,184,0.75)',
            fontFamily: FONT, marginTop: 8,
          }}>
            {sub}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: layout.direction, gap: layout.cardGap, width: '100%' }}>
          {stats.slice(0, layout.maxListItems).map((s, i) => {
            const av  = accentVariants(accentColor);
            const p   = spring({ frame: frame - cardCues[i], fps, config: { damping: 200 } });
            const y   = interpolate(p, [0, 1], [70, 0]);
            const op  = interpolate(frame - cardCues[i], [0, 18], [0, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            const display = scramble(s.value, frame, cardCues[i]);
            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`, flex: 1, borderRadius: 18,
                background: av.bg, border: `1px solid ${av.border}`,
                borderTop: `3px solid ${accentColor}`,
                padding: layout.isPortrait ? '24px 20px' : '36px 32px',
                display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
                boxShadow: `0 0 30px ${av.glow}`,
              }}>
                <div style={{
                  fontSize: layout.displaySize, color: accentColor,
                  fontFamily: FONT, fontWeight: '900', lineHeight: 1,
                  textShadow: `0 0 40px ${av.glow}`,
                }}>
                  {display}
                </div>
                <div style={{
                  fontSize: layout.bodySize - 4, color: '#f1f5f9',
                  fontFamily: FONT, fontWeight: '700', textAlign: 'center' as const,
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: layout.labelSize + 2, color: 'rgba(148,163,184,0.75)',
                  fontFamily: MONO_FONT, textAlign: 'center' as const,
                }}>
                  {s.sub}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
```

---

## 17. Quick Checklist for Generated Scenes

Before considering a generated scene complete, verify:

- [ ] Uses `useCurrentFrame()`, `useVideoConfig()`, `useSceneLayout()`, `useVisualVariant()`
- [ ] All timing cues use `dur * fraction` (proportional)
- [ ] Exit animation at `dur * 0.88`
- [ ] `SceneBackground` for image layer (not CSS backgroundImage)
- [ ] `VariantBackground` for animated bg primitive
- [ ] `NoiseOverlay` for film grain
- [ ] `SceneCounter` at bottom
- [ ] `Audio` conditionally rendered when `audioPath` is non-empty
- [ ] Only `FONT` and `MONO_FONT` used
- [ ] `as const` on all position/textAlign/flexDirection/textTransform values
- [ ] No `Math.random()` — use deterministic `det()` function
- [ ] All `interpolate()` calls have `extrapolateLeft: 'clamp', extrapolateRight: 'clamp'`
- [ ] Component exported as named export matching `Scene{PascalName}`
- [ ] Props type is `Scene{PascalName}Props & SharedSceneProps`
- [ ] Responsive: uses `layout.direction`, `layout.isPortrait`, `layout.outerPadding`
- [ ] Items sliced to `layout.maxListItems` to prevent overflow
