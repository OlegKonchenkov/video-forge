# Video Quality V2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Brand-matched color themes, selective image backgrounds, 4 new scene types, GPT variety improvements, and portrait screen maximization.

**Architecture:** CSS color mining in scraper → palette flows through scriptgen → bgColor/surfaceColor/showImage carried in scene props → Remotion scenes render brand-accurate visuals. New scenes expand the 19-type catalogue. Portrait sizes flip from "compressed" to "bold & vertical".

**Tech Stack:** TypeScript, Remotion 4, Node.js worker, OpenAI GPT-5.2, Gemini image gen.

**Key constraint:** Both `apps/worker/src/types/script.ts` and `agentforge-video/src/types.ts` must be kept in sync — they mirror each other.

---

## Task 1: CSS Color Mining + BrandPalette type

**Files:**
- Modify: `apps/worker/src/jobs/scraper.ts`

**Step 1: Add BrandPalette interface and helpers above `scrapeUrl`**

Add after the existing imports block at the top of `scraper.ts`:

```ts
export interface BrandPalette {
  bg:      string;   // primary background hex
  surface: string;   // card/panel background hex
  accent:  string;   // brand accent hex
  text:    string;   // primary text hex
  isDark:  boolean;  // luminance(bg) < 0.5
}

function hexToRgbPalette(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgbPalette(hex);
  if (!rgb) return 0;
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function normalizeHex(hex: string): string | null {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  if (isNaN(parseInt(full, 16))) return null;
  return '#' + full.toLowerCase();
}

export function extractBrandPalette(html: string): BrandPalette | null {
  // Extract all hex colors from <style> blocks and inline style="" attributes
  const styleBlocks: string[] = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) styleBlocks.push(m[1]);
  for (const m of html.matchAll(/style="([^"]*)"/gi)) styleBlocks.push(m[1]);
  const combined = styleBlocks.join(' ');

  const freq = new Map<string, number>();
  for (const m of combined.matchAll(/#[0-9a-fA-F]{3,6}\b/g)) {
    const n = normalizeHex(m[0]);
    if (n) freq.set(n, (freq.get(n) || 0) + 1);
  }
  if (freq.size < 2) return null;

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  // Skip near-white (#f8f8f8 and above) and near-black for accent detection
  const darks  = sorted.filter(([h]) => relativeLuminance(h) < 0.15);
  const mids   = sorted.filter(([h]) => { const l = relativeLuminance(h); return l >= 0.1 && l <= 0.6; });
  const lights = sorted.filter(([h]) => relativeLuminance(h) > 0.7);

  const bg      = darks[0]?.[0]  ?? sorted[0][0];
  const surface = darks[1]?.[0]  ?? mids[0]?.[0] ?? bg;
  const accent  = mids[0]?.[0]   ?? lights[0]?.[0] ?? '#3b82f6';
  const bgLum   = relativeLuminance(bg);
  const isDark  = bgLum < 0.5;
  const text    = isDark ? '#f1f5f9' : '#0f172a';

  console.log(`[scraper] palette: bg=${bg} accent=${accent} isDark=${isDark} (from ${freq.size} colors)`);
  return { bg, surface, accent, text, isDark };
}
```

**Step 2: Update `ScrapeResult` to include palette**

Change the interface:
```ts
export interface ScrapeResult {
  text:          string
  brandImageUrl: string | null
  imageUrls:     string[]
  accentColor:   string | null
  palette:       BrandPalette | null   // ← ADD THIS
  language:      string
  businessType:  'b2b' | 'b2c' | 'mixed'
}
```

**Step 3: Call `extractBrandPalette` in `scrapeUrl` and return it**

After `const accentColor = themeMatch ? themeMatch[1] : null;` add:
```ts
const palette = extractBrandPalette(html);
```

Update the return statement to include `palette`:
```ts
return { text, brandImageUrl, imageUrls, accentColor, palette, language, businessType };
```

**Step 4: TypeScript check**

```bash
cd apps/worker && npx tsc --noEmit
```
Expected: zero errors.

**Step 5: Commit**
```bash
git add apps/worker/src/jobs/scraper.ts
git commit -m "feat(scraper): CSS color mining → BrandPalette extraction"
```

---

## Task 2: Extend Both Type Files (bgColor, surfaceColor, showImage, 4 new scenes)

**Files:**
- Modify: `apps/worker/src/types/script.ts`
- Modify: `agentforge-video/src/types.ts`

**Step 1: Update `apps/worker/src/types/script.ts`**

Add 4 new prop interfaces after `SceneComparisonProps`:

```ts
export interface SceneBigStatProps {
  voiceover: string
  value:     string   // e.g. "847" or "1,247" or "98%"
  unit:      string   // e.g. "MW" or "clients"
  label:     string   // e.g. "installed capacity"
  sub:       string   // e.g. "powering 400,000 homes"
}

export interface SceneMissionStatementProps {
  voiceover: string
  statement: string                   // full brand statement
  values:    [string, string, string] // 3 core values
}

export interface SceneSocialProofProps {
  voiceover: string
  title:     string
  badges:    Array<{ label: string; value: string }>  // 3-4 items
}

export interface SceneTimelineProps {
  voiceover: string
  title:     string
  events:    Array<{ year: string; label: string }>   // 3-4 items
}
```

Add `showImage: boolean` to each union member in `SceneConfig` AND add 4 new members:

```ts
export type SceneConfig =
  | { type: 'pain_hook';           showImage: boolean; props: ScenePainHookProps }
  | { type: 'inbox_chaos';         showImage: boolean; props: SceneInboxChaosProps }
  | { type: 'cost_counter';        showImage: boolean; props: SceneCostCounterProps }
  | { type: 'brand_reveal';        showImage: boolean; props: SceneBrandRevealProps }
  | { type: 'feature_list';        showImage: boolean; props: SceneFeatureListProps }
  | { type: 'stats_grid';          showImage: boolean; props: SceneStatsGridProps }
  | { type: 'cta';                 showImage: boolean; props: SceneCTAProps }
  | { type: 'testimonial';         showImage: boolean; props: SceneTestimonialProps }
  | { type: 'before_after';        showImage: boolean; props: SceneBeforeAfterProps }
  | { type: 'how_it_works';        showImage: boolean; props: SceneHowItWorksProps }
  | { type: 'product_showcase';    showImage: boolean; props: SceneProductShowcaseProps }
  | { type: 'offer_countdown';     showImage: boolean; props: SceneOfferCountdownProps }
  | { type: 'map_location';        showImage: boolean; props: SceneMapLocationProps }
  | { type: 'team_intro';          showImage: boolean; props: SceneTeamIntroProps }
  | { type: 'comparison';          showImage: boolean; props: SceneComparisonProps }
  | { type: 'big_stat';            showImage: boolean; props: SceneBigStatProps }
  | { type: 'mission_statement';   showImage: boolean; props: SceneMissionStatementProps }
  | { type: 'social_proof';        showImage: boolean; props: SceneSocialProofProps }
  | { type: 'timeline';            showImage: boolean; props: SceneTimelineProps }
```

Add `bgColor` and `surfaceColor` to `VideoScript`:
```ts
export interface VideoScript {
  brandName:    string
  tagline:      string
  ctaText:      string
  ctaUrl:       string
  accentColor:  string
  bgColor:      string   // ← ADD
  surfaceColor: string   // ← ADD
  language:     string
  scenes:       SceneConfig[]
}
```

**Step 2: Mirror all changes in `agentforge-video/src/types.ts`**

Add the same 4 new prop interfaces. Update `SceneConfig` union with `showImage: boolean` and 4 new members (same as above). Update `SharedSceneProps`:

```ts
export interface SharedSceneProps {
  accentColor:  string;
  bgColor:      string;      // ← ADD
  surfaceColor: string;      // ← ADD
  showImage:    boolean;     // ← ADD
  brandName:    string;
  tagline:      string;
  ctaText:      string;
  ctaUrl:       string;
  audioPath:    string;
  sceneIndex:   number;
  sceneTotal:   number;
}
```

Update `AgentForgeAdProps`:
```ts
export type AgentForgeAdProps = {
  sceneDurations: number[];
  brandName:      string;
  tagline:        string;
  ctaText:        string;
  ctaUrl:         string;
  accentColor:    string;
  bgColor:        string;      // ← ADD
  surfaceColor:   string;      // ← ADD
  aspectRatio:    '16:9' | '9:16';
  hasVoiceover:   boolean;
  scenes:         SceneConfig[];
};
```

**Step 3: TypeScript check**
```bash
cd agentforge-video && npx tsc --noEmit
cd ../apps/worker && npx tsc --noEmit
```
Expected: errors about missing props in scenes — those will be fixed in Tasks 4–8.

**Step 4: Commit**
```bash
git add agentforge-video/src/types.ts apps/worker/src/types/script.ts
git commit -m "feat(types): add bgColor, surfaceColor, showImage, 4 new scene types"
```

---

## Task 3: colorUtils.ts + useSceneLayout.ts Updates

**Files:**
- Modify: `agentforge-video/src/shared/colorUtils.ts`
- Modify: `agentforge-video/src/shared/useSceneLayout.ts`

**Step 1: Add `themeVariants` to colorUtils.ts**

Add after the existing `accentVariants` function:

```ts
export interface ThemeVariants {
  bg:          string;   // scene background color
  surface:     string;   // card / panel background
  overlay:     string;   // image overlay rgba (for showImage:true scenes)
  textPrimary: string;   // main text color
  textMuted:   string;   // secondary/muted text color
  accent:      AccentVariants;
}

export function themeVariants(
  bgColor:      string,
  surfaceColor: string,
  accentColor:  string,
): ThemeVariants {
  const bgLum  = relativeLuminance(bgColor);
  const isDark = bgLum < 0.5;
  return {
    bg:          bgColor,
    surface:     surfaceColor,
    overlay:     isDark
      ? 'rgba(0,0,0,0.50)'
      : `rgba(${hexToRgb(bgColor).r},${hexToRgb(bgColor).g},${hexToRgb(bgColor).b},0.60)`,
    textPrimary: isDark ? '#f1f5f9' : '#0f172a',
    textMuted:   isDark ? 'rgba(148,163,184,0.75)' : 'rgba(71,85,105,0.85)',
    accent:      accentVariants(accentColor),
  };
}

// Needed by themeVariants — add this private helper inside colorUtils.ts
function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex.replace('#','').length === 3
    ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3')
    : hex);
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
```

**Step 2: Update `useSceneLayout.ts` — portrait sizes UP, add textColor**

Replace the entire function body:

```ts
export interface SceneLayout {
  isPortrait:      boolean;
  width:           number;
  height:          number;
  displaySize:     number;
  headingSize:     number;
  bodySize:        number;
  labelSize:       number;
  outerPadding:    number;
  innerGap:        number;
  cardGap:         number;
  direction:       'row' | 'column';
  maxContentWidth: number;
  // Portrait item caps
  maxListItems:    number;   // max items to show per list in portrait
}

export function useSceneLayout(): SceneLayout {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  return {
    isPortrait,
    width,
    height,
    // Portrait (9:16): BIGGER — use the 1920px vertical space!
    displaySize:     isPortrait ? 100 : 96,
    headingSize:     isPortrait ? 54  : 56,
    bodySize:        isPortrait ? 26  : 28,
    labelSize:       isPortrait ? 15  : 16,
    outerPadding:    isPortrait ? 72  : 80,
    innerGap:        isPortrait ? 56  : 40,
    cardGap:         isPortrait ? 24  : 28,
    direction:       isPortrait ? 'column' : 'row',
    maxContentWidth: isPortrait ? width - 144 : 1200,
    maxListItems:    isPortrait ? 2 : 3,
  };
}
```

**Step 3: Commit**
```bash
git add agentforge-video/src/shared/colorUtils.ts agentforge-video/src/shared/useSceneLayout.ts
git commit -m "feat(remotion): themeVariants helper + portrait screen maximization"
```

---

## Task 4: Update scriptgen.ts (palette, seed, loose rules, 4 new scenes, temperature)

**Files:**
- Modify: `apps/worker/src/jobs/scriptgen.ts`

**Step 1: Update function signature to accept `BrandPalette | null`**

Change:
```ts
import type { BrandPalette } from './scraper';
```
Add this import at the top.

Change `generateScript` signature:
```ts
export async function generateScript(
  sourceText:       string,
  inputType:        string,
  language:         string = 'en',
  businessType:     string = 'mixed',
  knownAccentColor: string | null = null,
  brandPalette:     BrandPalette | null = null,  // ← ADD
): Promise<VideoScript>
```

**Step 2: Add 4 new scenes to `SCENE_CATALOGUE`**

Append after scene 15 (`comparison`):

```
16. "big_stat" — One enormous animated number, full screen impact
    props: { voiceover, value: str (e.g. "847" or "1,247+"), unit: str (e.g. "MW"), label: str, sub: str }
    USE FOR: established companies with impressive numbers (years, clients, MW, revenue, units)
    showImage: true by default

17. "mission_statement" — Brand values manifesto, words reveal one by one
    props: { voiceover, statement: str (one powerful sentence, max 12 words), values: [str, str, str] }
    USE FOR: brands with a clear sustainability/innovation/quality mission
    showImage: true by default

18. "social_proof" — Trust wall: credentials, awards, certifications
    props: { voiceover, title: str, badges: [{label: str, value: str}]×3-4 }
    USE FOR: companies where trust signals differentiate (ISO, years in business, client count, awards)
    showImage: false by default

19. "timeline" — Company milestones, animated left-to-right/top-to-bottom
    props: { voiceover, title: str, events: [{year: str, label: str}]×3-4 }
    USE FOR: established companies (10+ years) with a history worth showing
    showImage: false by default
```

**Step 3: Update `SELECTION_RULES` to be looser**

Replace the rigid block:
```
SELECTION RULES:
- Always end with "cta" as the last scene
- Always include "brand_reveal" for strong brand identity
- Choose scenes that tell a compelling story arc: problem → solution → proof → CTA
- For local businesses: prefer "map_location" + "team_intro"
- For SaaS/tech: prefer "comparison" + "how_it_works"
- For e-commerce: prefer "product_showcase" + "offer_countdown"
- For service businesses: prefer "testimonial" + "before_after"
- For B2B: prefer "how_it_works" + "stats_grid" + "comparison"; avoid "offer_countdown"
- For B2C: prefer "product_showcase" + "offer_countdown" + "testimonial"
```

With:
```
SELECTION RULES:
- Always end with "cta" as the last scene
- Choose scenes that tell the most compelling story ARC for THIS specific business: problem → solution → proof → CTA
- VARY your selection: the same business type should produce different scene combinations each run (use the variation seed above)
- These are SUGGESTIONS not requirements — pick what best tells THIS brand's story:
  - Local businesses: map_location, team_intro are strong choices
  - SaaS/tech: comparison, how_it_works are strong choices
  - E-commerce: product_showcase, offer_countdown are strong choices
  - Service businesses: testimonial, before_after are strong choices
  - B2B companies: how_it_works, stats_grid, big_stat, social_proof are strong choices; avoid offer_countdown
  - B2C brands: product_showcase, offer_countdown, testimonial are strong choices
  - Established companies (10+ years): timeline, big_stat, mission_statement are strong choices
- brand_reveal is optional: include it when brand recognition is important, skip it for unknown startups needing more content scenes
```

**Step 4: Update `buildPrompt` to include palette and seed**

Change the function signature:
```ts
function buildPrompt(
  sourceText:       string,
  inputType:        string,
  language:         string,
  businessType:     string,
  knownAccentColor: string | null,
  brandPalette:     BrandPalette | null,
  seed:             string,
): string
```

Add after `const b2bHint = ...`:
```ts
const paletteHint = brandPalette
  ? `BRAND PALETTE (extracted from website CSS):
- Background: ${brandPalette.bg} (${brandPalette.isDark ? 'dark' : 'light'} theme)
- Surface: ${brandPalette.surface}
- Accent: ${brandPalette.accent}
Use bgColor close to "${brandPalette.bg}" (can darken/lighten slightly for cinematic feel).
Use accentColor matching or complementing "${brandPalette.accent}".`
  : knownAccentColor
    ? `Use this exact hex color as accentColor: "${knownAccentColor}". For bgColor pick a deep dark that complements this accent.`
    : `Pick a strong brand accent color (hex) that matches the brand personality. For bgColor pick a deep dark version of it.`;
```

Update the return prompt to include seed and palette hint, and update the JSON schema:
```ts
return `VARIATION SEED: ${seed} — use this to vary your scene selection even for the same URL.

Analyse this ${inputType} content and create a 5-7 scene video ad script.

SOURCE CONTENT:
${sourceText.slice(0, 7000)}

${SCENE_CATALOGUE}

${SELECTION_RULES}

${b2bHint}

${langInstruction}

${paletteHint}

Return a JSON object with this EXACT structure:
{
  "brandName": "Company/product name from content",
  "tagline": "Compelling one-line tagline (max 6 words)",
  "ctaText": "CTA button text matching the business type",
  "ctaUrl": "Website URL from content or infer from brand",
  "accentColor": "#hex — brand accent color",
  "bgColor": "#hex — scene background, deep/dark version matching brand palette",
  "surfaceColor": "#hex — card/panel background, slightly lighter than bgColor",
  "language": "${language}",
  "scenes": [
    { "type": "<scene_type>", "showImage": true/false, "props": { /* matching schema above */ } },
    ...
  ]
}

COPY RULES:
...same as existing copy rules...
`
```

**Step 5: Update `generateScript` call to pass seed and palette**

```ts
export async function generateScript(
  sourceText: string, inputType: string, language = 'en',
  businessType = 'mixed', knownAccentColor: string | null = null,
  brandPalette: BrandPalette | null = null,
): Promise<VideoScript> {
  const seed = Math.random().toString(36).slice(2, 8);
  const response = await client.chat.completions.create({
    model: 'gpt-5.2',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: buildPrompt(sourceText, inputType, language, businessType, knownAccentColor, brandPalette, seed) },
    ],
    max_completion_tokens: 4500,  // slightly larger for new scenes
    temperature: 0.9,             // was 0.7 — more variety
  });
  // ... rest unchanged
}
```

**Step 6: Ensure GPT output has bgColor/surfaceColor defaults if missing**

After `JSON.parse(text)`, add:
```ts
const script = JSON.parse(text) as VideoScript;
// Defensive defaults if GPT omitted new fields
if (!script.bgColor)      script.bgColor      = '#050d1a';
if (!script.surfaceColor) script.surfaceColor = '#0a1628';
for (const scene of script.scenes) {
  if (typeof (scene as any).showImage === 'undefined') {
    (scene as any).showImage = true;
  }
}
return script;
```

**Step 7: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```

**Step 8: Commit**
```bash
git add apps/worker/src/jobs/scriptgen.ts
git commit -m "feat(scriptgen): brand palette input, scene variety seed, 4 new scenes, temperature 0.9"
```

---

## Task 5: Update images.ts (skip generation for showImage:false scenes)

**Files:**
- Modify: `apps/worker/src/jobs/images.ts`

**Step 1: Add 4 new scene prompts to `SCENE_PROMPTS`**

Add after the existing entries in `SCENE_PROMPTS`:
```ts
  big_stat:          (brand, hint) => `enormous glowing number visualization for ${brand} achievement, ${hint}, dark dramatic background with light rays`,
  mission_statement: (brand, hint) => `cinematic brand vision for ${brand}, inspiring atmospheric environment, ${hint}, dark premium background`,
  social_proof:      (brand, hint) => `${brand} trust credibility professional achievement wall, ${hint}, clean dark background gold accents`,
  timeline:          (brand, hint) => `${brand} company history timeline journey milestones, ${hint}, dark background with glowing path`,
```

**Step 2: Update `generateImages` signature to accept `showImageFlags`**

Change function signature:
```ts
export async function generateImages(
  scenes:          SceneConfig[],
  workDir:         string,
  brandName:       string,
  brandImageUrl:   string | null,
  accentColor:     string = '#3b82f6',
  imageUrls:       string[] = [],
  showImageFlags:  boolean[] = [],   // ← ADD: one per scene
): Promise<string[]>
```

**Step 3: Skip generation for scenes where `showImageFlags[i] === false`**

In the main loop, replace the block that starts `let ok = false;` with:

```ts
// Skip image generation entirely if this scene doesn't show a background image
if (showImageFlags[i] === false) {
  outPaths.push('');  // empty string — scene won't use it
  continue;
}

let ok = false;
// ... rest of existing logic unchanged ...
```

**Step 4: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```

**Step 5: Commit**
```bash
git add apps/worker/src/jobs/images.ts
git commit -m "feat(images): skip Gemini generation for showImage:false scenes + 4 new prompts"
```

---

## Task 6: Update pipeline.ts + render.ts (wire new fields end-to-end)

**Files:**
- Modify: `apps/worker/src/jobs/pipeline.ts`
- Modify: `apps/worker/src/jobs/render.ts`

**Step 1: Update `pipeline.ts` — pass palette to scriptgen and showImageFlags to generateImages**

In `runVideoPipeline`, update the scriptgen call:
```ts
const script = await generateScript(
  sourceText, inputType, language, businessType, accentColor,
  result.palette ?? null,   // ← ADD: pass extracted BrandPalette
);
```
(Note: `result` is the `ScrapeResult`, and `result.palette` is the new field. For non-URL inputs, pass `null`.)

Build `showImageFlags` before `generateImages`:
```ts
const showImageFlags = script.scenes.map(s => s.showImage ?? true);
```

Update `generateImages` call:
```ts
const imagePaths = await generateImages(
  script.scenes, workDir, script.brandName, brandImageUrl, script.accentColor,
  imageUrls,
  showImageFlags,   // ← ADD
);
```

**Step 2: Update `render.ts` — accept and forward bgColor, surfaceColor**

Change `renderVideo` params type:
```ts
export async function renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio, hasVoiceover, musicId, businessType }: {
  // ... existing ...
}): Promise<string>
```
No change needed here — `script.bgColor` and `script.surfaceColor` are already on the `VideoScript` object. Just update `remotionProps`:

```ts
const remotionProps = {
  brandName:      script.brandName,
  tagline:        script.tagline,
  ctaText:        script.ctaText,
  ctaUrl:         script.ctaUrl,
  accentColor:    script.accentColor,
  bgColor:        script.bgColor      ?? '#050d1a',    // ← ADD
  surfaceColor:   script.surfaceColor ?? '#0a1628',    // ← ADD
  aspectRatio,
  hasVoiceover,
  sceneDurations: Array(script.scenes.length).fill(150),
  scenes:         script.scenes,
};
```

**Step 3: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```
Expected: zero errors.

**Step 4: Commit**
```bash
git add apps/worker/src/jobs/pipeline.ts apps/worker/src/jobs/render.ts
git commit -m "feat(pipeline): wire bgColor, surfaceColor, showImageFlags end-to-end"
```

---

## Task 7: Update AgentForgeAd.tsx (pass bgColor, surfaceColor, showImage to shared props)

**Files:**
- Modify: `agentforge-video/src/AgentForgeAd.tsx`

**Step 1: Destructure new props**

Change:
```ts
export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  scenes, sceneDurations, brandName, tagline, ctaText, ctaUrl,
  accentColor, hasVoiceover,
}) => {
```
To:
```ts
export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  scenes, sceneDurations, brandName, tagline, ctaText, ctaUrl,
  accentColor, bgColor, surfaceColor, hasVoiceover,
}) => {
```

**Step 2: Add new fields to `shared`**

Change the `shared` object:
```ts
const shared: SharedSceneProps = {
  accentColor,
  bgColor,            // ← ADD
  surfaceColor,       // ← ADD
  showImage: scene.showImage ?? true,   // ← ADD (extracted per scene)
  brandName,
  tagline,
  ctaText,
  ctaUrl,
  audioPath:  hasVoiceover ? `audio/voiceover/scene_${i}.mp3` : '',
  sceneIndex: i,
  sceneTotal: scenes.length,
};
```

**Step 3: TypeScript check**
```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: errors about scene components missing bgColor/surfaceColor/showImage — fixed in Tasks 8-9.

**Step 4: Commit**
```bash
git add agentforge-video/src/AgentForgeAd.tsx
git commit -m "feat(remotion): pass bgColor, surfaceColor, showImage through shared props"
```

---

## Task 8: Update All 15 Existing Scene Files

**Files (all in `agentforge-video/src/scenes/`):**
`SceneBrandReveal.tsx`, `SceneInboxChaos.tsx`, `SceneCostCounter.tsx`, `SceneFeatureList.tsx`,
`ScenePainHook.tsx`, `SceneStatsGrid.tsx`, `SceneCTA.tsx`, `SceneTestimonial.tsx`,
`SceneBeforeAfter.tsx`, `SceneHowItWorks.tsx`, `SceneProductShowcase.tsx`, `SceneOfferCountdown.tsx`,
`SceneMapLocation.tsx`, `SceneTeamIntro.tsx`, `SceneComparison.tsx`

**Pattern to apply to EVERY scene — 5 mechanical changes:**

**Change 1: Add new props to destructuring**

Every scene has a line like:
```ts
export const SceneXxx: React.FC<SceneXxxProps & SharedSceneProps> = ({
  ..., accentColor, audioPath, sceneIndex, sceneTotal,
}) => {
```
Add `bgColor, surfaceColor, showImage` to the destructuring:
```ts
export const SceneXxx: React.FC<SceneXxxProps & SharedSceneProps> = ({
  ..., accentColor, bgColor, surfaceColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
```

**Change 2: Replace hardcoded background color**

```ts
// BEFORE:
<AbsoluteFill style={{ backgroundColor: '#050d1a', overflow: 'hidden' }}>
// AFTER:
<AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
```

**Change 3: Guard the image layer with `showImage`**

```ts
// BEFORE:
{/* Scene background image */}
<AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
{/* Dark overlay */}
<AbsoluteFill style={{ backgroundColor: 'rgba(5,13,26,0.75)' }} />

// AFTER:
{showImage && (
  <>
    <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
    <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
  </>
)}
```

**Change 4: Replace `accentVariants` usage with `themeVariants` (optional, can use av directly)**

Each scene already calls `const av = accentVariants(accentColor)`. Leave this as-is for accent colors. The bgColor change (Change 2) handles the main visual difference.

**Change 5: Portrait item caps for list-heavy scenes**

Only for these scenes — use `layout.maxListItems`:

- **SceneFeatureList**: `const displayFeatures = features.slice(0, layout.maxListItems)`; render `displayFeatures` instead of `features`
- **SceneHowItWorks**: `const displaySteps = steps.slice(0, layout.maxListItems)` (already does `slice(0,3)` — change to `slice(0, layout.maxListItems)`)
- **SceneStatsGrid**: `const displayStats = stats.slice(0, layout.maxListItems)`; render `displayStats`
- **SceneBeforeAfter**: `const displayBefore = beforePoints.slice(0, layout.maxListItems)` and same for after; render these
- **SceneComparison**: `const displayFeatures = features.slice(0, layout.isPortrait ? 4 : 6)` — cap at 4 in portrait

**Execution order (do in batches of 3-4 to avoid errors):**

Batch A: `SceneBrandReveal`, `ScenePainHook`, `SceneCTA`, `SceneTestimonial`
Batch B: `SceneInboxChaos`, `SceneCostCounter`, `SceneFeatureList`, `SceneStatsGrid`
Batch C: `SceneBeforeAfter`, `SceneHowItWorks`, `SceneProductShowcase`, `SceneOfferCountdown`
Batch D: `SceneMapLocation`, `SceneTeamIntro`, `SceneComparison`

**After each batch: TypeScript check**
```bash
cd agentforge-video && npx tsc --noEmit
```

**Commit after all 15:**
```bash
git add agentforge-video/src/scenes/
git commit -m "feat(scenes): brand bgColor, selective showImage, portrait item caps across all 15 scenes"
```

---

## Task 9: Create SceneBigStat.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneBigStat.tsx`

```tsx
// agentforge-video/src/scenes/SceneBigStat.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants, themeVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneBigStatProps, SharedSceneProps } from '../types';

export const SceneBigStat: React.FC<SceneBigStatProps & SharedSceneProps> = ({
  value, unit, label, sub,
  accentColor, bgColor, surfaceColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av  = accentVariants(accentColor);
  const tv  = themeVariants(bgColor, surfaceColor, accentColor);
  const layout = useSceneLayout();

  const CUE_VALUE = dur * 0.05;
  const CUE_UNIT  = dur * 0.45;
  const CUE_LABEL = dur * 0.55;
  const CUE_SUB   = dur * 0.65;

  // Parse numeric part of value for count-up animation
  const numStr    = value.replace(/[^0-9.]/g, '');
  const numericVal = parseFloat(numStr) || 0;
  const prefix    = value.slice(0, value.search(/[0-9]/));
  const afterNum  = value.slice(value.search(/[0-9]/) + numStr.length);

  const counted = Math.floor(interpolate(frame - CUE_VALUE, [0, dur * 0.5], [0, numericVal], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));
  const displayValue = `${prefix}${counted.toLocaleString()}${afterNum}`;

  const valueOp = interpolate(frame - CUE_VALUE, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const unitOp  = interpolate(frame - CUE_UNIT,  [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelOp = interpolate(frame - CUE_LABEL, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOp   = interpolate(frame - CUE_SUB,   [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const labelY  = interpolate(spring({ frame: frame - CUE_LABEL, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  // Value font: fills ~55% of screen height in portrait, fixed in landscape
  const valueFontSize = layout.isPortrait
    ? Math.min(Math.round(layout.height * 0.22), 200)
    : Math.round(layout.displaySize * 1.6);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
        </>
      )}
      {/* Radial glow centered */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${av.glow} 0%, transparent 65%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.isPortrait ? 16 : 12,
      }}>
        {/* Big animated number */}
        <div style={{ opacity: valueOp }}>
          <span style={{
            fontSize: valueFontSize,
            fontFamily: DISPLAY_FONT,
            fontWeight: '900',
            color: accentColor,
            lineHeight: 1,
            letterSpacing: '-2px',
          }}>
            {displayValue}
          </span>
        </div>

        {/* Unit */}
        {frame >= CUE_UNIT && (
          <div style={{
            opacity: unitOp,
            fontSize: layout.headingSize * 0.9,
            fontFamily: DISPLAY_FONT,
            color: tv.textPrimary,
            letterSpacing: '4px',
            textTransform: 'uppercase' as const,
          }}>
            {unit}
          </div>
        )}

        {/* Accent divider */}
        <div style={{ width: 80, height: 3, background: accentColor, borderRadius: 2, opacity: unitOp }} />

        {/* Label */}
        {frame >= CUE_LABEL && (
          <div style={{
            opacity: labelOp,
            transform: `translateY(${labelY}px)`,
            fontSize: layout.bodySize,
            fontFamily: FONT,
            color: tv.textMuted,
            textAlign: 'center' as const,
            maxWidth: layout.maxContentWidth,
          }}>
            {label}
          </div>
        )}

        {/* Sub */}
        {frame >= CUE_SUB && (
          <div style={{
            opacity: subOp,
            fontSize: layout.labelSize + 2,
            fontFamily: FONT,
            color: tv.textMuted,
            textAlign: 'center' as const,
          }}>
            {sub}
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
```

**Commit:**
```bash
git add agentforge-video/src/scenes/SceneBigStat.tsx
git commit -m "feat(scenes): add SceneBigStat — full-screen animated count-up"
```

---

## Task 10: Create SceneMissionStatement.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneMissionStatement.tsx`

```tsx
// agentforge-video/src/scenes/SceneMissionStatement.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants, themeVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneMissionStatementProps, SharedSceneProps } from '../types';

export const SceneMissionStatement: React.FC<SceneMissionStatementProps & SharedSceneProps> = ({
  statement, values,
  accentColor, bgColor, surfaceColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av  = accentVariants(accentColor);
  const tv  = themeVariants(bgColor, surfaceColor, accentColor);
  const layout = useSceneLayout();

  const words = statement.split(' ');
  const wordsPerFrame = Math.max(1, Math.ceil(words.length / (dur * 0.55)));

  // Each word fades in sequentially
  const visibleWords = Math.floor(interpolate(frame, [dur * 0.05, dur * 0.60], [0, words.length], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));

  const valuesCue = dur * 0.65;
  const valueFontSize = layout.isPortrait ? layout.bodySize - 2 : layout.bodySize;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
        </>
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${av.bg} 0%, transparent 65%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
      }}>
        {/* Statement — word-by-word reveal */}
        <div style={{
          textAlign: 'center' as const,
          maxWidth: layout.maxContentWidth,
          lineHeight: 1.35,
        }}>
          {words.map((word, i) => (
            <span
              key={i}
              style={{
                fontSize: layout.headingSize,
                fontFamily: DISPLAY_FONT,
                color: i < visibleWords ? tv.textPrimary : 'transparent',
                transition: 'color 0.1s',
                marginRight: '0.3em',
                // Accent color for key words (every 4th word gets accent treatment)
                ...(i < visibleWords && i % 4 === 1 ? { color: accentColor } : {}),
              }}
            >
              {word}
            </span>
          ))}
        </div>

        {/* Accent divider */}
        <div style={{
          width: interpolate(frame, [dur * 0.55, dur * 0.65], [0, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          height: 3, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }} />

        {/* Values pills */}
        {frame >= valuesCue && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: layout.cardGap, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
            {values.map((v, i) => {
              const pillOp = interpolate(frame - valuesCue - i * 8, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const pillY  = interpolate(spring({ frame: frame - valuesCue - i * 8, fps, config: { damping: 200 } }), [0, 1], [20, 0]);
              return (
                <div key={i} style={{
                  opacity: pillOp, transform: `translateY(${pillY}px)`,
                  background: av.bg, border: `1px solid ${av.border}`,
                  borderRadius: 999, padding: `${layout.isPortrait ? 10 : 12}px ${layout.isPortrait ? 20 : 28}px`,
                }}>
                  <span style={{ fontSize: valueFontSize, fontFamily: FONT, color: accentColor, fontWeight: '600' }}>{v}</span>
                </div>
              );
            })}
          </div>
        )}
      </AbsoluteFill>

      <SceneCounter current={sceneIndex + 1} total={sceneTotal} />
      {audioPath && <Audio src={staticFile(audioPath)} />}
    </AbsoluteFill>
  );
};
```

**Commit:**
```bash
git add agentforge-video/src/scenes/SceneMissionStatement.tsx
git commit -m "feat(scenes): add SceneMissionStatement — word-by-word brand statement reveal"
```

---

## Task 11: Create SceneSocialProof.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneSocialProof.tsx`

```tsx
// agentforge-video/src/scenes/SceneSocialProof.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants, themeVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneSocialProofProps, SharedSceneProps } from '../types';

export const SceneSocialProof: React.FC<SceneSocialProofProps & SharedSceneProps> = ({
  title, badges,
  accentColor, bgColor, surfaceColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av  = accentVariants(accentColor);
  const tv  = themeVariants(bgColor, surfaceColor, accentColor);
  const layout = useSceneLayout();

  const CUE_TITLE  = 0;
  const CUE_BADGES = dur * 0.25;

  const titleOp = interpolate(frame, [CUE_TITLE, CUE_TITLE + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const displayBadges = badges.slice(0, 4);
  // In portrait, 2-column grid; in landscape, 2 or 4 columns
  const gridCols = layout.isPortrait ? 2 : Math.min(displayBadges.length, 4);

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
        </>
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 0%, ${av.bg} 0%, transparent 60%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: tv.textPrimary, fontFamily: FONT, letterSpacing: '-1px' }}>
            {title}
          </div>
        </div>

        {/* Badge grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: layout.cardGap,
          width: '100%',
          maxWidth: layout.maxContentWidth,
        }}>
          {displayBadges.map((badge, i) => {
            const cue = CUE_BADGES + i * 6;
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y   = interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [30, 0]);
            const cardH = layout.isPortrait ? 160 : 140;
            return (
              <div key={i} style={{
                opacity: op, transform: `translateY(${y}px)`,
                background: av.bg, border: `1px solid ${av.border}`,
                borderRadius: 16, padding: layout.cardGap,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, height: cardH,
                boxShadow: `0 0 32px ${av.glow}`,
              }}>
                <div style={{ fontSize: layout.displaySize * 0.6, fontFamily: DISPLAY_FONT, color: accentColor, fontWeight: '900', lineHeight: 1 }}>
                  {badge.value}
                </div>
                <div style={{ fontSize: layout.labelSize + 1, fontFamily: FONT, color: tv.textMuted, textAlign: 'center' as const, lineHeight: 1.3 }}>
                  {badge.label}
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

**Commit:**
```bash
git add agentforge-video/src/scenes/SceneSocialProof.tsx
git commit -m "feat(scenes): add SceneSocialProof — trust badge grid with stagger animation"
```

---

## Task 12: Create SceneTimeline.tsx

**Files:**
- Create: `agentforge-video/src/scenes/SceneTimeline.tsx`

```tsx
// agentforge-video/src/scenes/SceneTimeline.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { FONT, DISPLAY_FONT } from '../font';
import { NoiseOverlay } from '../shared/NoiseOverlay';
import { SceneCounter } from '../shared/SceneCounter';
import { accentVariants, themeVariants } from '../shared/colorUtils';
import { useSceneLayout } from '../shared/useSceneLayout';
import type { SceneTimelineProps, SharedSceneProps } from '../types';

export const SceneTimeline: React.FC<SceneTimelineProps & SharedSceneProps> = ({
  title, events,
  accentColor, bgColor, surfaceColor, showImage, audioPath, sceneIndex, sceneTotal,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  const av   = accentVariants(accentColor);
  const tv   = themeVariants(bgColor, surfaceColor, accentColor);
  const layout = useSceneLayout();

  const CUE_TITLE   = 0;
  const CUE_LINE    = dur * 0.18;
  const CUE_EVENTS  = dur * 0.22;

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [20, 0]);

  const displayEvents = events.slice(0, layout.isPortrait ? 4 : 4);
  const eventSpacing  = dur * 0.14;

  // Connector line grows from 0 to full
  const lineProgress = interpolate(frame - CUE_LINE, [0, dur * 0.5], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: 'hidden' }}>
      {showImage && (
        <>
          <AbsoluteFill style={{ backgroundImage: `url(${staticFile(`images/scene_${sceneIndex}.png`)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.50)' }} />
        </>
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 10%, ${av.bg} 0%, transparent 55%)` }} />
      <NoiseOverlay />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${layout.outerPadding}px`,
        gap: layout.innerGap,
      }}>
        {/* Title */}
        <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
          <div style={{ fontSize: layout.headingSize, fontWeight: '800', color: tv.textPrimary, fontFamily: FONT }}>
            {title}
          </div>
        </div>

        {/* Timeline track + events */}
        <div style={{
          position: 'relative' as const,
          display: 'flex',
          flexDirection: layout.direction,
          alignItems: layout.isPortrait ? 'flex-start' : 'center',
          width: '100%',
          maxWidth: layout.maxContentWidth,
          gap: layout.isPortrait ? 0 : layout.cardGap * 2,
        }}>
          {/* Growing connector line */}
          {layout.isPortrait ? (
            <div style={{
              position: 'absolute' as const,
              left: 24, top: 0,
              width: 3,
              height: `${lineProgress * 100}%`,
              background: `linear-gradient(to bottom, ${accentColor}, ${av.border})`,
            }} />
          ) : (
            <div style={{
              position: 'absolute' as const,
              top: '50%', left: 0,
              height: 3,
              width: `${lineProgress * 100}%`,
              background: `linear-gradient(to right, ${accentColor}, ${av.border})`,
              transform: 'translateY(-50%)',
            }} />
          )}

          {/* Event nodes */}
          {displayEvents.map((event, i) => {
            const cue = CUE_EVENTS + i * eventSpacing;
            const op  = interpolate(frame - cue, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const dotScale = spring({ frame: frame - cue, fps, config: { damping: 200 } });

            return (
              <div key={i} style={{
                opacity: op,
                display: 'flex',
                flexDirection: layout.isPortrait ? 'row' : 'column',
                alignItems: layout.isPortrait ? 'flex-start' : 'center',
                gap: layout.isPortrait ? 20 : 12,
                flex: layout.isPortrait ? undefined : 1,
                paddingLeft: layout.isPortrait ? 56 : 0,
                paddingBottom: layout.isPortrait ? layout.cardGap : 0,
              }}>
                {/* Dot */}
                <div style={{
                  position: layout.isPortrait ? 'absolute' as const : 'relative' as const,
                  left: layout.isPortrait ? 12 : undefined,
                  width: 28, height: 28, borderRadius: '50%',
                  background: accentColor,
                  transform: `scale(${dotScale})`,
                  boxShadow: `0 0 16px ${av.glow}`,
                  flexShrink: 0,
                }} />
                {/* Text */}
                <div style={{ textAlign: layout.isPortrait ? 'left' as const : 'center' as const }}>
                  <div style={{ fontSize: layout.labelSize + 3, fontFamily: DISPLAY_FONT, color: accentColor, fontWeight: '700' }}>
                    {event.year}
                  </div>
                  <div style={{ fontSize: layout.labelSize + 1, fontFamily: FONT, color: tv.textMuted, lineHeight: 1.4 }}>
                    {event.label}
                  </div>
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

**Commit:**
```bash
git add agentforge-video/src/scenes/SceneTimeline.tsx
git commit -m "feat(scenes): add SceneTimeline — animated milestone timeline, portrait + landscape"
```

---

## Task 13: Register New Scenes + TypeScript Clean

**Files:**
- Modify: `agentforge-video/src/sceneRegistry.ts`

**Step 1: Add 4 imports**

```ts
import { SceneBigStat }          from './scenes/SceneBigStat';
import { SceneMissionStatement } from './scenes/SceneMissionStatement';
import { SceneSocialProof }      from './scenes/SceneSocialProof';
import { SceneTimeline }         from './scenes/SceneTimeline';
```

**Step 2: Add 4 entries to `SCENE_REGISTRY`**

```ts
big_stat:          SceneBigStat,
mission_statement: SceneMissionStatement,
social_proof:      SceneSocialProof,
timeline:          SceneTimeline,
```

**Step 3: Full TypeScript check across all packages**

```bash
cd agentforge-video && npx tsc --noEmit
cd ../apps/worker && npx tsc --noEmit
```
Expected: zero errors in both.

**Step 4: Commit**
```bash
git add agentforge-video/src/sceneRegistry.ts
git commit -m "feat(remotion): register 4 new scene types in sceneRegistry"
```

---

## Task 14: Final Check, Push, Deploy

**Step 1: Full TypeScript check**
```bash
cd agentforge-video && npx tsc --noEmit && echo "remotion OK"
cd ../apps/worker && npx tsc --noEmit && echo "worker OK"
cd ../apps/web && npx tsc --noEmit && echo "web OK"
```

**Step 2: Quick render test (optional but recommended)**
```bash
cd agentforge-video && npx remotion render AgentForgeAd out/test-v2.mp4 --codec h264
```
If it renders without errors, the Remotion side is clean.

**Step 3: Push**
```bash
git push
```

**Step 4: Deploy on VPS**
```bash
# On VPS:
cd /path/to/repo && git pull && pm2 restart worker
```
