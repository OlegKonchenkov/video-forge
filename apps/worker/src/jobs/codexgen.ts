// apps/worker/src/jobs/codexgen.ts
// CODEX mode: AI generates custom scene TSX files from scratch
// Uses OpenAI Responses API with GPT-5 reasoning + remotion-best-practices skill
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import type { VideoScript } from '../types/script';

const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');
const SCENE_TIMEOUT = Number(process.env.CODEX_SCENE_TIMEOUT_MS) || 120_000;
const CODEX_MODEL = process.env.CODEX_MODEL || 'gpt-5';
const CODEX_REASONING_EFFORT = (process.env.CODEX_REASONING_EFFORT || 'medium') as 'low' | 'medium' | 'high';

// ─── Remotion skill loader ──────────────────────────────────────────────────
// Reads the remotion-best-practices skill files from disk (all relevant .md rules)
// and caches the result. Falls back to embedded summary if skill directory not found.

const SKILL_DIR = process.env.REMOTION_SKILL_DIR
  || path.join(process.env.HOME || process.env.USERPROFILE || '', '.agents', 'skills', 'remotion-best-practices', 'rules');

// Only load rules relevant to scene component generation (skip 3d, ffmpeg, captions, maps, lottie, gifs, etc.)
const RELEVANT_RULES = [
  'animations', 'timing', 'compositions', 'sequencing', 'audio', 'assets',
  'fonts', 'images', 'text-animations', 'transitions', 'light-leaks',
  'measuring-dom-nodes', 'measuring-text', 'trimming',
];

let _cachedSkillContent: string | null = null;

function loadRemotionSkill(): string {
  if (_cachedSkillContent !== null) return _cachedSkillContent;

  try {
    if (fs.existsSync(SKILL_DIR)) {
      const parts: string[] = [];
      // Load SKILL.md overview first
      const overviewPath = path.join(SKILL_DIR, '..', 'SKILL.md');
      if (fs.existsSync(overviewPath)) {
        parts.push(fs.readFileSync(overviewPath, 'utf-8'));
      }
      // Load each relevant rule file
      for (const rule of RELEVANT_RULES) {
        const rulePath = path.join(SKILL_DIR, `${rule}.md`);
        if (fs.existsSync(rulePath)) {
          parts.push(`\n---\n# Rule: ${rule}\n${fs.readFileSync(rulePath, 'utf-8')}`);
        }
      }
      if (parts.length > 0) {
        _cachedSkillContent = parts.join('\n');
        console.log(`[codex] loaded remotion skill: ${parts.length} rule files from ${SKILL_DIR}`);
        return _cachedSkillContent;
      }
    }
  } catch (err) {
    console.warn(`[codex] failed to load remotion skill from ${SKILL_DIR}: ${(err as Error).message}`);
  }

  // Fallback: embedded summary
  console.log('[codex] using embedded remotion skill fallback');
  _cachedSkillContent = EMBEDDED_REMOTION_SKILL;
  return _cachedSkillContent;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const BANNED_PATTERNS = [
  /Math\.random\s*\(/,
  /require\s*\(\s*['"]child_process['"]\s*\)/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /import\s*\(\s*['"]child_process['"]\s*\)/,
  /\bprocess\.env\b/,
  /\bfs\.\w/,
];

function validateScene(code: string): { valid: boolean; reason?: string } {
  for (const pat of BANNED_PATTERNS) {
    if (pat.test(code)) {
      return { valid: false, reason: `Banned pattern: ${pat.source}` };
    }
  }
  if (!code.includes('export const')) {
    return { valid: false, reason: 'Missing export const' };
  }
  if (!code.includes('useCurrentFrame') && !code.includes('useVideoConfig')) {
    return { valid: false, reason: 'Missing Remotion hooks' };
  }
  return { valid: true };
}

// ─── Embedded fallback (used when skill directory not found) ─────────────────

const EMBEDDED_REMOTION_SKILL = `# Remotion Best Practices — Developer Instructions

You are an expert Remotion video scene developer. Follow these rules rigorously.

## Core Animation Rules
- ALL animations MUST be driven by \`useCurrentFrame()\` hook
- Write animation timings in relation to durationInFrames (proportional): const CUE = dur * 0.15
- CSS transitions/animations are FORBIDDEN — they will not render correctly
- Tailwind animation class names are FORBIDDEN — they will not render correctly

## Interpolation & Timing
- \`interpolate(frame, [inputRange], [outputRange], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\`
- Values are NOT clamped by default — always add extrapolation options
- Easing: \`Easing.inOut(Easing.quad)\`, \`Easing.bezier(0.8, 0.22, 0.96, 0.65)\`

## Spring Animations
\`\`\`tsx
const scale = spring({ frame, fps, config: { damping: 200 } }); // smooth, no bounce
const snappy = spring({ frame, fps, config: { damping: 20, stiffness: 200 } }); // snappy
const bouncy = spring({ frame, fps, config: { damping: 8 } }); // bouncy entrance
\`\`\`
- Use \`delay\` parameter or subtract from frame: \`spring({ frame: frame - CUE, fps, ... })\`
- Combine with interpolate: \`const rotation = interpolate(springProgress, [0, 1], [0, 360])\`

## In/Out animations
\`\`\`tsx
const inAnim = spring({ frame, fps });
const outAnim = spring({ frame, fps, durationInFrames: 1 * fps, delay: durationInFrames - 1 * fps });
const scale = inAnim - outAnim;
\`\`\`

## AbsoluteFill
- Use \`<AbsoluteFill>\` as top-level wrapper — absolutely-positioned full container
- Children inside are absolutely positioned by default

## Audio
- Use \`<Audio>\` from \`@remotion/media\` — NOT native \`<audio>\`
- Reference audio: \`<Audio src={staticFile('audio/voiceover/scene_0.mp3')} />\`
- Volume callback: \`volume={(f) => interpolate(f, [0, 30], [0, 1], { extrapolateRight: 'clamp' })}\`
- Loop: \`<Audio src={...} loop />\`

## Images
- Use \`staticFile()\` for public folder assets: \`staticFile('images/scene_0.png')\`
- For background images in CSS: use \`backgroundImage: \\\`url(\\\${staticFile(...)})\\\`\`
- The \`<Img>\` component from remotion ensures loading before render

## Fonts
- Import from project: \`import { FONT, MONO_FONT } from '../../font'\`
- Use fontFamily in style objects

## Text Animations
- Typewriter: slice string by character based on frame
- Word-by-word reveal: split text, show words one by one based on frame timing
- Character stagger: map characters with individual delays

## Sequencing
- \`<Sequence from={delay} durationInFrames={dur}>\` to delay elements
- Inside a Sequence, \`useCurrentFrame()\` returns LOCAL frame (starts from 0)
- Use \`layout="none"\` to prevent absolute wrapping

## Transitions (TransitionSeries)
- Import: \`import { TransitionSeries, linearTiming } from '@remotion/transitions'\`
- Types: \`fade()\`, \`slide({ direction: 'from-right' })\`, \`wipe()\`, \`flip()\`, \`clockWipe({ width, height })\`
- Transitions OVERLAP adjacent scenes — total duration is shorter

## TypeScript Strict Mode
- ALWAYS use \`as const\` for: position, textAlign, flexDirection, textTransform, whiteSpace, flexWrap, overflow
- Example: \`position: 'absolute' as const\`

## Deterministic Rendering
- NEVER use Math.random() — causes non-deterministic frames
- For pseudo-random noise: \`((Math.sin(i * 127.1 + frame * 311.7) * 43758.5453) % 1 + 1) % 1\`
- NEVER use Date.now() or other non-deterministic values
`;

// ─── Scene-specific system prompt ───────────────────────────────────────────

function buildDeveloperInstructions(): string {
  const skill = loadRemotionSkill();
  return `${skill}

# Scene Component Contract

You generate a single React/Remotion scene component for a video ad.

## AVAILABLE IMPORTS (use ONLY these — do NOT invent paths):
- import React from 'react';
- import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing, AbsoluteFill, staticFile, Sequence } from 'remotion';
- import { Audio } from '@remotion/media';
- import { FONT, MONO_FONT } from '../../font';
- import { NoiseOverlay } from '../../shared/NoiseOverlay';
- import { SceneCounter } from '../../shared/SceneCounter';
- import { useSceneLayout } from '../../shared/useSceneLayout';
  // returns { isPortrait, width, height, outerPadding, innerGap, cardGap, headingSize, displaySize, bodySize, labelSize, direction, maxListItems, maxContentWidth }
- import { useVisualVariant } from '../../shared/useVisualVariant';
  // hook: (variantId, accentColor) => variant object with .av property for accent variants
- import { VariantBackground } from '../../shared/VariantBackground';
  // props: { variant, accentColor }
- import { ShimmerOverlay } from '../../shared/ShimmerOverlay';
  // props: { color, periodFrames, opacity, width? }
- import { KineticText } from '../../shared/KineticText';
  // props: { text, startFrame, fps, type='slide-up'|'blur-in'|'scale-in', staggerFrames, style }
- import { WordByWord } from '../../shared/WordByWord';
  // props: { text, frame, fps, startFrame, staggerFrames, style, wordStyle }
- import type { SharedSceneProps } from '../../types';

## COMPONENT SIGNATURE (MUST follow exactly):
\`\`\`tsx
export const CodexScene: React.FC<SharedSceneProps> = ({
  accentColor, bgColor, showImage, audioPath, sceneIndex, sceneTotal, variantId,
  brandName, tagline, ctaText, ctaUrl, surfaceColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const variant = useVisualVariant(variantId, accentColor);
  const av = variant.av;  // { solid, glow, strong, border, bg }
  const layout = useSceneLayout();
  // ... your scene code
};
\`\`\`

## PROPORTIONAL TIMING PATTERN (MUST use):
- All cues use dur * fraction: \`const CUE_TITLE = dur * 0.08;\` \`const CUE_CARD = dur * 0.28;\`
- NEVER use fps * N for timing — always dur * fraction
- Exit animation: \`const exitOp = interpolate(frame, [dur*0.88, dur*0.88+10], [1, 0], { extrapolateLeft:'clamp', extrapolateRight:'clamp' });\`
- Entry spring: \`spring({ frame: frame - CUE, fps, config: { damping: 200 } })\`
- Opacity fade-in: \`interpolate(frame - CUE, [0, 18], [0, 1], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })\`

## MANDATORY JSX STRUCTURE (every scene MUST have all of these):
1. \`<AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>\`
2. \`{showImage && (<><AbsoluteFill style={{ backgroundImage: \\\`url(\\\${staticFile(\\\`images/scene_\\\${sceneIndex}.png\\\`)})\\\`, backgroundSize:'cover', backgroundPosition:'center' }} /><AbsoluteFill style={{ backgroundColor:'rgba(0,0,0,0.78)' }} /></>)}\`
3. \`<VariantBackground variant={variant} accentColor={accentColor} />\`
4. \`<NoiseOverlay />\`
5. ... your content with opacity: exitOp ...
6. \`<SceneCounter current={sceneIndex + 1} total={sceneTotal} />\`
7. \`{audioPath && <Audio src={staticFile(audioPath)} />}\`
8. \`</AbsoluteFill>\`

## STRICT RULES:
1. NEVER use Math.random() — for pseudo-random: ((Math.sin(i*127.1+frame*311.7)*43758.5453)%1+1)%1
2. Use 'as const' for: position, textAlign, flexDirection, textTransform, whiteSpace, flexWrap, overflow
3. Embed the scene's content (text, data, numbers) directly as constants in the component
4. Use layout.isPortrait for responsive design (portrait = 9:16, landscape = 16:9)
5. Use av.glow, av.strong, av.border, av.bg for accent-derived colors
6. Maximum creativity in visual design — be bold with layouts, animations, typography
7. Use spring() for entrance animations, interpolate() for progress/exit animations
8. Use <Sequence> for staggered element entrances when appropriate
9. Use variant.mirrorLayout to optionally flip layout direction

## OUTPUT: Return ONLY raw TypeScript/React code. No markdown code fences, no explanation, no comments about the code.`;
}

// ─── Per-scene generation ────────────────────────────────────────────────────

function buildScenePrompt(scene: any, index: number, script: VideoScript): string {
  return `Generate scene ${index} for a "${script.brandName}" video ad.

SCENE DATA TO EMBED IN THE COMPONENT:
${JSON.stringify(scene.props, null, 2)}

BRAND CONTEXT:
- Brand: ${script.brandName}
- Tagline: ${script.tagline}
- Accent Color: ${script.accentColor}
- Background Color: ${script.bgColor}
- Surface Color: ${script.surfaceColor}
- CTA: ${script.ctaText} → ${script.ctaUrl}
- Scene type hint: "${scene.type}" (for visual inspiration — create something unique and stunning)
- Scene ${index + 1} of ${script.scenes.length}

Create a visually stunning, cinematic scene component. Use creative layouts, animated reveals with spring physics, glowing accent highlights, bold typography with stagger effects. The component MUST be named "CodexScene" and follow the SharedSceneProps contract exactly.`;
}

async function generateSceneCode(scene: any, index: number, script: VideoScript): Promise<string> {
  const userPrompt = buildScenePrompt(scene, index, script);

  const client = new OpenAI();
  const devInstructions = buildDeveloperInstructions();
  const response = await client.responses.create({
    model: CODEX_MODEL,
    reasoning: { effort: CODEX_REASONING_EFFORT },
    input: [
      { role: 'developer', content: devInstructions },
      { role: 'user', content: userPrompt },
    ],
  });

  return response.output_text ?? '';
}

// ─── Clean AI output ─────────────────────────────────────────────────────────

function cleanCode(raw: string): string {
  let code = raw.trim();
  // Strip markdown code fences if present
  if (code.startsWith('```')) {
    code = code.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
  }
  return code.trim();
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface CodexResult {
  codexDir: string;
  entryFile: string;
  sceneCount: number;
  fallbackScenes: number[];
}

export async function generateCodexScenes(
  script: VideoScript,
  videoId: string,
): Promise<CodexResult> {
  const codexDir = path.join(REMOTION_ROOT, 'src', `codex_${videoId}`);
  fs.mkdirSync(codexDir, { recursive: true });

  const sceneCount = script.scenes.length;
  const fallbackScenes: number[] = [];

  // Generate each scene sequentially (to avoid API rate limits)
  for (let i = 0; i < sceneCount; i++) {
    const scene = script.scenes[i];
    console.log(`[codex] generating scene ${i + 1}/${sceneCount} (hint: ${scene.type}) via ${CODEX_MODEL} reasoning=${CODEX_REASONING_EFFORT}...`);

    try {
      const rawCode = await Promise.race([
        generateSceneCode(scene, i, script),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Scene generation timeout')), SCENE_TIMEOUT)
        ),
      ]);

      const code = cleanCode(rawCode);
      const validation = validateScene(code);

      if (!validation.valid) {
        console.warn(`[codex] scene ${i} validation failed: ${validation.reason} — fallback`);
        fallbackScenes.push(i);
        continue;
      }

      // Rename export: CodexScene → Scene_N
      const renamed = code.replace(/export\s+const\s+CodexScene/, `export const Scene_${i}`);
      fs.writeFileSync(path.join(codexDir, `Scene_${i}.tsx`), renamed);
      console.log(`[codex] scene ${i} OK`);
    } catch (err) {
      console.warn(`[codex] scene ${i} failed: ${(err as Error).message} — fallback`);
      fallbackScenes.push(i);
    }
  }

  // If ALL scenes failed, throw to trigger full prefab fallback
  if (fallbackScenes.length === sceneCount) {
    fs.rmSync(codexDir, { recursive: true, force: true });
    throw new Error('All CODEX scenes failed — falling back to prefab mode');
  }

  // Write CodexComposition.tsx
  fs.writeFileSync(
    path.join(codexDir, 'CodexComposition.tsx'),
    buildComposition(sceneCount, fallbackScenes),
  );

  // Write CodexRoot.tsx (Remotion entry point)
  fs.writeFileSync(path.join(codexDir, 'CodexRoot.tsx'), buildRoot());

  console.log(`[codex] done — ${sceneCount - fallbackScenes.length}/${sceneCount} custom scenes, ${fallbackScenes.length} fallbacks`);

  return {
    codexDir,
    entryFile: `src/codex_${videoId}/CodexRoot.tsx`,
    sceneCount,
    fallbackScenes,
  };
}

export function cleanupCodex(codexDir: string): void {
  try {
    fs.rmSync(codexDir, { recursive: true, force: true });
    console.log('[codex] cleanup complete');
  } catch { /* ignore */ }
}

// ─── Generated file builders ─────────────────────────────────────────────────

function buildComposition(sceneCount: number, fallbackScenes: number[]): string {
  const sceneImports: string[] = [];
  const entries: string[] = [];

  for (let i = 0; i < sceneCount; i++) {
    if (!fallbackScenes.includes(i)) {
      sceneImports.push(`import { Scene_${i} } from './Scene_${i}';`);
      entries.push(`  ${i}: Scene_${i},`);
    }
  }

  return `// Auto-generated CODEX composition — do not edit
import React from 'react';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { flip } from '@remotion/transitions/flip';
import { TRANSITION_FRAMES } from '../constants';
import { SCENE_REGISTRY } from '../sceneRegistry';
import type { AgentForgeAdProps, SharedSceneProps } from '../types';
${sceneImports.join('\n')}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CODEX_SCENES: Record<number, React.FC<any>> = {
${entries.join('\n')}
};

export const CodexComposition: React.FC<AgentForgeAdProps> = ({
  scenes, sceneDurations, brandName, tagline, ctaText, ctaUrl,
  accentColor, bgColor, surfaceColor, hasVoiceover,
}) => {
  const { width, height } = useVideoConfig();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TRANSITIONS: any[] = [
    slide({ direction: 'from-right' }),
    wipe({ direction: 'from-left' }),
    fade(),
    slide({ direction: 'from-bottom' }),
    clockWipe({ width, height }),
    flip(),
  ];

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
          // Use codex scene if available, otherwise fall back to prefab registry
          const Component = CODEX_SCENES[i] ?? SCENE_REGISTRY[scene.type];
          if (!Component) return null;

          const shared: SharedSceneProps = {
            accentColor,
            bgColor:      bgColor      ?? '#050d1a',
            surfaceColor: surfaceColor ?? '#0a1628',
            showImage:    scene.showImage ?? true,
            brandName, tagline, ctaText, ctaUrl,
            audioPath:    hasVoiceover ? \`audio/voiceover/scene_\${i}.mp3\` : '',
            sceneIndex:   i,
            sceneTotal:   scenes.length,
            variantId:    (scene as any).variantId ?? 0,
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
`;
}

function buildRoot(): string {
  return `// Auto-generated CODEX root — do not edit
import { Composition } from 'remotion';
import { CodexComposition } from './CodexComposition';
import { calculateMetadata } from '../calculateMetadata';
import { FPS } from '../constants';
import type { AgentForgeAdProps } from '../types';

const DEFAULT_PROPS: AgentForgeAdProps = {
  sceneDurations: [180],
  accentColor: '#3b82f6',
  bgColor: '#050d1a',
  surfaceColor: '#0a1628',
  brandName: 'Brand',
  tagline: 'Tagline',
  ctaText: 'Learn More',
  ctaUrl: 'example.com',
  aspectRatio: '16:9',
  hasVoiceover: true,
  scenes: [{ type: 'pain_hook', showImage: true, props: { voiceover: '', headline: '', sub: '', painPoints: ['', '', ''] } }],
};

export const RemotionRoot = () => (
  <Composition
    id="CodexAd"
    component={CodexComposition}
    durationInFrames={300}
    fps={FPS}
    width={1920}
    height={1080}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={calculateMetadata}
  />
);
`;
}
