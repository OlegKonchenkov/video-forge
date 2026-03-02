# Video Quality Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix script quality (GPT-5.2, language/B2B detection, word-merge), add responsive 16:9/9:16 layouts via `useSceneLayout()`, and make Gemini image generation resilient.

**Architecture:** Worker changes (Tasks 1–5) are independent of Remotion changes (Tasks 6–16). Thread `language` and `aspectRatio` through the pipeline. All 15 Remotion scenes use a shared `useSceneLayout()` hook to derive responsive layout tokens from `useVideoConfig()`.

**Tech Stack:** Node.js worker (TypeScript), OpenAI `gpt-5.2`, ElevenLabs, Gemini 2.5 Flash Image, Remotion 4, Next.js 14

**Verification command (no tests, TypeScript is the test):**
- Worker: `cd apps/worker && npx tsc --noEmit`
- Remotion: `cd agentforge-video && npx tsc --noEmit`

---

## Task 1: Worker + Remotion types — add `language` and `aspectRatio`

**Files:**
- Modify: `apps/worker/src/types/script.ts`
- Modify: `agentforge-video/src/types.ts`

### Step 1: Add fields to `VideoScript`

Edit `apps/worker/src/types/script.ts` — add two fields to the `VideoScript` interface:

```ts
export interface VideoScript {
  brandName:   string
  tagline:     string
  ctaText:     string
  ctaUrl:      string
  accentColor: string
  language:    string            // ← NEW: 'it', 'en', 'de', etc.
  scenes:      SceneConfig[]
}
```

### Step 2: Add `aspectRatio` to Remotion props

Edit `agentforge-video/src/types.ts` — add to `AgentForgeAdProps`:

```ts
export type AgentForgeAdProps = {
  sceneDurations: number[];
  brandName:      string;
  tagline:        string;
  ctaText:        string;
  ctaUrl:         string;
  accentColor:    string;
  aspectRatio:    '16:9' | '9:16';   // ← NEW
  scenes:         SceneConfig[];
};
```

### Step 3: TypeScript check

```bash
cd apps/worker && npx tsc --noEmit
cd agentforge-video && npx tsc --noEmit
```

Expected: errors only about `aspectRatio` being unset in Root.tsx defaultProps — that's fixed in Task 8.

### Step 4: Commit

```bash
git add apps/worker/src/types/script.ts agentforge-video/src/types.ts
git commit -m "feat: add language + aspectRatio to VideoScript and AgentForgeAdProps types"
```

---

## Task 2: Scraper — language detection, subpage crawl, businessType

**Files:**
- Rewrite: `apps/worker/src/jobs/scraper.ts`

### Step 1: Write the new scraper

Full replacement of `apps/worker/src/jobs/scraper.ts`:

```ts
// apps/worker/src/jobs/scraper.ts
import axios from 'axios';

export interface ScrapeResult {
  text:          string
  brandImageUrl: string | null
  accentColor:   string | null
  language:      string                    // ← NEW
  businessType:  'b2b' | 'b2c' | 'mixed'  // ← NEW
}

const B2B_SIGNALS = [
  'engineering', 'procurement', 'enterprise', 'contractor', 'b2b',
  'services for', 'wholesale', 'distributor', 'industrial', 'impianti',
  'progettazione', 'appalti', 'fornitori', 'committenti',
];
const B2C_SIGNALS = [
  'shop', 'buy now', 'cart', 'checkout', 'order online',
  'personal', 'family', 'acquista', 'negozio',
];

function detectLanguage(html: string): string {
  const m = html.match(/<html[^>]+lang=["']([a-z]{2}(-[A-Z]{2})?)["']/i);
  if (m) return m[1].split('-')[0].toLowerCase();
  const m2 = html.match(/<meta[^>]+http-equiv=["']content-language["'][^>]+content=["']([a-z]{2})["']/i);
  if (m2) return m2[1].toLowerCase();
  return 'en';
}

function detectBusinessType(text: string): 'b2b' | 'b2c' | 'mixed' {
  const lower = text.toLowerCase();
  const b2bScore = B2B_SIGNALS.filter(s => lower.includes(s)).length;
  const b2cScore = B2C_SIGNALS.filter(s => lower.includes(s)).length;
  if (b2bScore > b2cScore + 1) return 'b2b';
  if (b2cScore > b2bScore + 1) return 'b2c';
  return 'mixed';
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
      timeout: 10000,
    });
    return (data as string)
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

function extractSubpageLinks(html: string, baseUrl: string): string[] {
  const PRIORITY_PATHS = [
    '/services', '/about', '/solutions',
    '/prodotti', '/servizi', '/chi-siamo', '/lavoriamo',
  ];
  const origin = new URL(baseUrl).origin;
  const found: string[] = [];
  for (const path of PRIORITY_PATHS) {
    const full = origin + path;
    if (
      html.includes(`href="${path}"`) || html.includes(`href='${path}'`) ||
      html.includes(`href="${full}"`)  || html.includes(`href='${full}'`)
    ) {
      found.push(full);
    }
    if (found.length >= 3) break;
  }
  return found;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
      timeout: 15000,
    });

    const html = data as string;

    // og:image
    const ogMatch  = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                  || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const brandImageUrl = ogMatch ? ogMatch[1] : null;

    // theme-color
    const themeMatch = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,6})["']/i)
                    || html.match(/<meta[^>]+content=["'](#[0-9a-fA-F]{3,6})["'][^>]+name=["']theme-color["']/i);
    const accentColor = themeMatch ? themeMatch[1] : null;

    const language = detectLanguage(html);

    // Homepage text
    const homeText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Follow subpage links (up to 3)
    const subUrls   = extractSubpageLinks(html, url);
    const subTexts: string[] = [];
    for (const subUrl of subUrls) {
      const t = await fetchPageText(subUrl);
      if (t) subTexts.push(t.slice(0, 2000));
    }

    const allText     = [homeText, ...subTexts].join(' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
    const businessType = detectBusinessType(allText);

    return { text: allText, brandImageUrl, accentColor, language, businessType };
  } catch {
    throw new Error(`Failed to scrape URL: ${url}`);
  }
}
```

### Step 2: TypeScript check

```bash
cd apps/worker && npx tsc --noEmit
```

Expected: errors in pipeline.ts about missing `language`/`businessType` args — fixed in Task 5.

### Step 3: Commit

```bash
git add apps/worker/src/jobs/scraper.ts
git commit -m "feat: scraper adds language detection, 3-subpage crawl, businessType"
```

---

## Task 3: Scriptgen — GPT-5.2, language, word-merge rule, B2B/B2C hints

**Files:**
- Rewrite: `apps/worker/src/jobs/scriptgen.ts`

### Step 1: Write the new scriptgen

Full replacement of `apps/worker/src/jobs/scriptgen.ts`:

```ts
// apps/worker/src/jobs/scriptgen.ts
import OpenAI from 'openai';
import type { VideoScript } from '../types/script';

const client = new OpenAI(); // reads OPENAI_API_KEY from env

const SYSTEM = `You are an expert video ad scriptwriter. Analyse business content and output a
dynamic 5-7 scene video advertisement script. Choose the best scene types from the catalogue
below to match the business. Always respond with valid JSON matching the exact schema. No extra keys.`;

const SCENE_CATALOGUE = `
AVAILABLE SCENE TYPES (pick 5-7 that best tell this business's story):

1. "pain_hook" — Opens with the customer's key frustration
   props: { voiceover, headline, sub, painPoints: [str, str, str] }

2. "inbox_chaos" — Visual overload: a flood of urgent tasks/emails
   props: { voiceover, items: [{subject, from, time, urgent?}]×4, punchWords: [str, str, str] }

3. "cost_counter" — Shocking cost-of-inaction with animated numbers
   props: { voiceover, intro, stat1: {value:number, unit, label}, stat2: {value:number, unit, label} }

4. "brand_reveal" — Cinematic reveal of the brand name (no extra props needed)
   props: { voiceover }

5. "feature_list" — The solution with 3 key features
   props: { voiceover, headlineLines: [str,str,str,str], sub, features: [{icon,title,detail,status}]×3 }

6. "stats_grid" — 3 impressive metrics in large display numbers
   props: { voiceover, title, sub, stats: [{value:str, label, sub}]×3 }

7. "cta" — Final call-to-action with urgency
   props: { voiceover, headline, accentLine, sub }

8. "testimonial" — A powerful customer quote
   props: { voiceover, quote, name, role, company? }

9. "before_after" — Side-by-side contrast of old vs new state
   props: { voiceover, beforeLabel, beforePoints: [str,str,str], afterLabel, afterPoints: [str,str,str] }

10. "how_it_works" — 3-step process explanation
    props: { voiceover, title, steps: [{number,icon,title,description}]×3 }

11. "product_showcase" — Full-screen product/service visual
    props: { voiceover, productName, tagline, price? }

12. "offer_countdown" — Limited-time offer with urgency bar
    props: { voiceover, badge, offer, benefit, urgency }

13. "map_location" — Location reveal for local businesses
    props: { voiceover, address, city, hours, phone? }

14. "team_intro" — Team members with avatar cards
    props: { voiceover, title, members: [{name,role,initials}]×2-4 }

15. "comparison" — Side-by-side vs competitor table
    props: { voiceover, competitorLabel, brandLabel, features: [{label, competitor:bool, brand:bool}]×4-6 }

SELECTION RULES:
- Always end with "cta" as the last scene
- Always include "brand_reveal" for strong brand identity
- Choose scenes that tell a compelling story arc: problem → solution → proof → CTA
- For local businesses: prefer "map_location" + "team_intro"
- For SaaS/tech: prefer "comparison" + "how_it_works"
- For e-commerce: prefer "product_showcase" + "offer_countdown"
- For service businesses: prefer "testimonial" + "before_after"
`;

const B2B_SCENE_HINT = `B2B audience detected — prefer: how_it_works, feature_list, stats_grid, comparison, testimonial, brand_reveal, cta. Avoid consumer-focused scenes like pain_hook, inbox_chaos, offer_countdown.`;
const B2C_SCENE_HINT = `B2C audience detected — prefer: pain_hook, inbox_chaos, offer_countdown, before_after, product_showcase, cta. Use emotional, direct-to-consumer language.`;

function buildPrompt(
  sourceText: string,
  inputType: string,
  language: string,
  businessType: 'b2b' | 'b2c' | 'mixed',
  knownAccentColor: string | null,
): string {
  const colorHint = knownAccentColor
    ? `Use this exact hex color as accentColor: "${knownAccentColor}"`
    : `Pick a strong brand accent color (hex) that matches the brand personality`;

  const audienceHint = businessType === 'b2b' ? B2B_SCENE_HINT
    : businessType === 'b2c' ? B2C_SCENE_HINT
    : 'Mixed audience — choose scenes that work for both business and consumer contexts.';

  return `Analyse this ${inputType} content and create a 5-7 scene video ad script.

SOURCE CONTENT:
${sourceText.slice(0, 7000)}

AUDIENCE: ${audienceHint}

${SCENE_CATALOGUE}

Return a JSON object with this EXACT structure:
{
  "brandName": "Company/product name from content",
  "tagline": "Compelling one-line tagline (max 6 words)",
  "ctaText": "CTA button text matching the business type",
  "ctaUrl": "Website URL from content or infer from brand",
  "accentColor": "#hex — ${colorHint}",
  "language": "${language}",
  "scenes": [
    { "type": "<scene_type>", "props": { /* matching schema above */ } },
    ...
  ]
}

COPY RULES:
- CRITICAL: Write ALL copy fields (voiceover, headline, sub, etc.) in ${language.toUpperCase()}. Use natural, conversational ${language.toUpperCase()}.
- CRITICAL: Use correct spacing between ALL words in every text field. NEVER concatenate adjacent words. Example: "Outdated Energy" NOT "OutdatedEnergy".
- All voiceovers: 15-25 words, conversational, read naturally aloud in ${language.toUpperCase()}
- Extract real stats/numbers from content where possible; otherwise invent plausible industry-specific ones
- All copy must be specific to THIS business — never generic placeholder text
- headlineLines[3] in feature_list must be one punchy word + period ("Automaticamente." / "Instantly." / "Effortlessly.")
- punchWords in inbox_chaos: short (1-3 words each), punchy, end with period
- comparison: brandLabel should be the actual brand name; show clear advantage
- ctaText: match the action ("Prenota una Demo" for SaaS in Italian, "Richiedi un Preventivo" for services in Italian, etc.)`;
}

export async function generateScript(
  sourceText:      string,
  inputType:       string,
  language:        string = 'en',
  businessType:    'b2b' | 'b2c' | 'mixed' = 'mixed',
  knownAccentColor: string | null = null,
): Promise<VideoScript> {
  const response = await client.chat.completions.create({
    model: 'gpt-5.2',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: buildPrompt(sourceText, inputType, language, businessType, knownAccentColor) },
    ],
    max_tokens: 4000,
    temperature: 0.7,
  });

  const text = response.choices[0].message.content!;
  try {
    const parsed = JSON.parse(text) as VideoScript;
    // Ensure language is set even if GPT omits it
    if (!parsed.language) parsed.language = language;
    return parsed;
  } catch {
    throw new Error(`GPT returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
```

### Step 2: TypeScript check

```bash
cd apps/worker && npx tsc --noEmit
```

Expected: errors in pipeline.ts about updated `generateScript` signature — fixed in Task 5.

### Step 3: Commit

```bash
git add apps/worker/src/jobs/scriptgen.ts
git commit -m "feat: scriptgen upgrades to gpt-5.2, adds language param + word-merge rule + B2B/B2C hints"
```

---

## Task 4: Images — retry ×3, gradient placeholder, og:image fallback, error logging

**Files:**
- Rewrite: `apps/worker/src/jobs/images.ts`

### Step 1: Write the new images.ts

Full replacement of `apps/worker/src/jobs/images.ts`:

```ts
// apps/worker/src/jobs/images.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type { SceneConfig } from '../types/script';

const SCENE_PROMPTS: Record<string, (brand: string, hint: string) => string> = {
  pain_hook:        (brand, hint) => `dark cinematic: overwhelmed frustrated person in ${brand} business context, ${hint}, film noir style`,
  inbox_chaos:      (brand, hint) => `chaotic digital inbox overload flooding with ${brand} tasks, ${hint}, dark moody neon background`,
  cost_counter:     (brand, hint) => `burning money wasted time visualization for ${brand} business, ${hint}, minimalist dark background red accents`,
  brand_reveal:     (brand, hint) => `elegant premium brand identity: ${brand} company atmosphere, ${hint}, dark luxury background with bokeh`,
  feature_list:     (brand, hint) => `futuristic AI automation dashboard interface for ${brand}, ${hint}, glowing blue panels dark background`,
  stats_grid:       (brand, hint) => `${brand} growth metrics celebration success charts, ${hint}, dark background with golden light`,
  cta:              (brand, hint) => `cinematic call to action for ${brand}, confident decisive moment, ${hint}, sleek dark background glowing elements`,
  testimonial:      (brand, hint) => `authentic happy ${brand} customer success story, ${hint}, warm cinematic portrait lighting dark background`,
  before_after:     (brand, hint) => `striking visual contrast: chaos vs order transformation for ${brand}, ${hint}, split dark background`,
  how_it_works:     (brand, hint) => `clean process diagram visualization for ${brand} workflow, ${hint}, dark background with glowing step indicators`,
  product_showcase: (brand, hint) => `professional hero product shot for ${brand}, ${hint}, studio quality dramatic lighting dark background`,
  offer_countdown:  (brand, hint) => `urgent limited offer for ${brand}, ${hint}, dark background with warm gold accent countdown energy`,
  map_location:     (brand, hint) => `${brand} premium physical location exterior, ${hint}, cinematic evening lighting professional photography`,
  team_intro:       (brand, hint) => `professional ${brand} team portrait group, ${hint}, warm cinematic lighting corporate photography`,
  comparison:       (brand, hint) => `${brand} winning comparison competitive advantage visual, ${hint}, clean dark background with accent highlights`,
};

const FALLBACK_PROMPT = (brand: string, hint: string) =>
  `professional cinematic business scene for ${brand} video advertisement, ${hint}, dark premium background`;

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// CRC32 for PNG chunk integrity
function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) {
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : (crc >>> 1);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function writeGradientPlaceholder(outPath: string, accentColor: string): void {
  const hex = accentColor.replace(/^#/, '');
  const r = parseInt(hex.slice(0, 2), 16) || 59;
  const g = parseInt(hex.slice(2, 4), 16) || 130;
  const b = parseInt(hex.slice(4, 6), 16) || 246;

  // 1×1 RGBA PNG with accent color at ~15% opacity
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const scanline = Buffer.from([0x00, r, g, b, 40]); // filter=0, RGBA, alpha=40/255≈15%
  const idat = zlib.deflateSync(scanline);
  const png = Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(outPath, png);
  console.log(`[images] using gradient placeholder (${accentColor})`);
}

async function downloadImage(imageUrl: string, outPath: string): Promise<boolean> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
    });
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('image')) return false;
    fs.writeFileSync(outPath, Buffer.from(response.data));
    return true;
  } catch {
    return false;
  }
}

async function generateWithGemini(prompt: string, outPath: string, sceneIndex: number): Promise<boolean> {
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
        {
          contents: [{ parts: [{ text: `Generate a professional cinematic 16:9 image for a video advertisement: ${prompt}` }] }],
          generationConfig: { responseModalities: ['IMAGE'], candidateCount: 1 },
        },
        {
          params: { key: process.env.GEMINI_API_KEY },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const imageData = response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!imageData) return false;
      fs.writeFileSync(outPath, Buffer.from(imageData, 'base64'));
      return true;
    } catch (err: any) {
      const status    = err?.response?.status ?? 0;
      const errorBody = JSON.stringify(err?.response?.data ?? '').slice(0, 200);
      console.log(`[images] scene_${sceneIndex}: Gemini failed (HTTP ${status}, attempt ${attempt + 1}/3) - ${errorBody}`);
      if (attempt < 2) await sleep(delays[attempt]);
    }
  }
  return false;
}

export async function generateImages(
  scenes:        SceneConfig[],
  workDir:       string,
  brandName:     string,
  brandImageUrl: string | null,
  accentColor:   string = '#3b82f6',
): Promise<string[]> {
  fs.mkdirSync(path.join(workDir, 'images'), { recursive: true });
  const outPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const outPath  = path.join(workDir, 'images', `scene_${i}.png`);
    const scene    = scenes[i];
    const hint     = scene.props.voiceover.slice(0, 60);
    const promptFn = SCENE_PROMPTS[scene.type] ?? FALLBACK_PROMPT;
    const prompt   = promptFn(brandName, hint);

    let ok = false;

    // Scene 0: try og:image first
    if (i === 0 && brandImageUrl) {
      console.log(`[images] scene_0: trying brand og:image`);
      ok = await downloadImage(brandImageUrl, outPath);
    }

    // Gemini with retry (3 attempts + backoff)
    if (!ok) {
      console.log(`[images] scene_${i} (${scene.type}): generating with Gemini`);
      ok = await generateWithGemini(prompt, outPath, i);
    }

    // Fallback: use og:image for any failed scene
    if (!ok && brandImageUrl && i > 0) {
      console.log(`[images] scene_${i}: falling back to brand og:image`);
      ok = await downloadImage(brandImageUrl, outPath);
    }

    // Last resort: gradient placeholder
    if (!ok) writeGradientPlaceholder(outPath, accentColor);

    outPaths.push(outPath);
    if (i < scenes.length - 1) await sleep(500);
  }

  return outPaths;
}
```

### Step 2: TypeScript check

```bash
cd apps/worker && npx tsc --noEmit
```

Expected: errors in pipeline.ts about extra `accentColor` arg — fixed in Task 5.

### Step 3: Commit

```bash
git add apps/worker/src/jobs/images.ts
git commit -m "feat: images — Gemini retry x3, gradient placeholder, og:image fallback, error logging"
```

---

## Task 5: Pipeline + Render — thread `language`, `businessType`, `aspectRatio`

**Files:**
- Modify: `apps/worker/src/jobs/pipeline.ts`
- Modify: `apps/worker/src/jobs/render.ts`

### Step 1: Update pipeline.ts

Full replacement of `apps/worker/src/jobs/pipeline.ts`:

```ts
// apps/worker/src/jobs/pipeline.ts
import { supabase } from '../lib/supabase';
import { scrapeUrl } from './scraper';
import { parsePdf, parsePpt } from './parser';
import { generateScript } from './scriptgen';
import { generateVoiceovers } from './tts';
import { generateImages } from './images';
import { renderVideo } from './render';
import { uploadVideo } from './upload';

async function updateStatus(videoId: string, status: string, progress: number, currentStep: string) {
  await supabase.from('videos').update({
    status, progress, current_step: currentStep, updated_at: new Date().toISOString(),
  }).eq('id', videoId);
}

export async function runVideoPipeline(job: any) {
  const { videoId, inputType, inputData } = job.data;
  // aspectRatio comes from the web UI; default to 16:9 for backwards compatibility
  const aspectRatio: '16:9' | '9:16' = job.data.aspectRatio === '9:16' ? '9:16' : '16:9';
  const workDir = `/tmp/videoforge/${videoId}`;

  try {
    await updateStatus(videoId, 'processing', 5, 'Extracting content...');

    let sourceText    = '';
    let brandImageUrl: string | null = null;
    let accentColor:   string | null = null;
    let language      = 'en';
    let businessType: 'b2b' | 'b2c' | 'mixed' = 'mixed';

    if (inputType === 'url') {
      const result  = await scrapeUrl(inputData.url);
      sourceText    = result.text;
      brandImageUrl = result.brandImageUrl;
      accentColor   = result.accentColor;
      language      = result.language;
      businessType  = result.businessType;
    } else if (inputType === 'pdf') {
      sourceText = await parsePdf(inputData.fileName);
    } else if (inputType === 'ppt') {
      sourceText = await parsePpt(inputData.fileName);
    } else {
      sourceText = inputData.text;
    }

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    const script = await generateScript(sourceText, inputType, language, businessType, accentColor);

    await updateStatus(videoId, 'processing', 25, 'Recording voiceover...');

    const voiceovers = script.scenes.map((s) => s.props.voiceover);
    const audioPaths = await generateVoiceovers(voiceovers, workDir);

    await updateStatus(videoId, 'processing', 45, 'Generating visuals...');

    const imagePaths = await generateImages(
      script.scenes, workDir, script.brandName, brandImageUrl, script.accentColor,
    );

    await updateStatus(videoId, 'processing', 60, 'Rendering video...');

    const mp4Path = await renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio });

    await updateStatus(videoId, 'processing', 85, 'Uploading...');

    const outputUrl = await uploadVideo(mp4Path, videoId);

    await supabase.from('videos').update({
      status: 'complete', progress: 100, output_url: outputUrl,
      current_step: 'Done', updated_at: new Date().toISOString(),
    }).eq('id', videoId);

  } catch (err: unknown) {
    const error = err as Error;
    await supabase.from('videos').update({
      status: 'failed', error_msg: error.message, updated_at: new Date().toISOString(),
    }).eq('id', videoId);
    throw err;
  }
}
```

### Step 2: Update render.ts

Full replacement of `apps/worker/src/jobs/render.ts`:

```ts
// apps/worker/src/jobs/render.ts
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { VideoScript } from '../types/script';

const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');

export async function renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio }: {
  videoId:     string;
  script:      VideoScript;
  audioPaths:  string[];
  imagePaths:  string[];
  workDir:     string;
  aspectRatio: '16:9' | '9:16';
}): Promise<string> {
  const outPath = path.join(workDir, 'output.mp4');
  fs.mkdirSync(workDir, { recursive: true });

  const remotionPublic = path.join(REMOTION_ROOT, 'public');
  fs.mkdirSync(path.join(remotionPublic, 'audio/voiceover'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'images'), { recursive: true });

  audioPaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `audio/voiceover/scene_${i}.mp3`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  imagePaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `images/scene_${i}.png`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  const propsPath = path.join(workDir, 'props.json');
  const remotionProps = {
    brandName:      script.brandName,
    tagline:        script.tagline,
    ctaText:        script.ctaText,
    ctaUrl:         script.ctaUrl,
    accentColor:    script.accentColor,
    aspectRatio,                                              // ← NEW
    sceneDurations: Array(script.scenes.length).fill(150),   // overwritten by calculateMetadata
    scenes:         script.scenes,
  };
  fs.writeFileSync(propsPath, JSON.stringify(remotionProps));

  execSync(
    `npx remotion render AgentForgeAd "${outPath}" --codec h264 --props "${propsPath}"`,
    { cwd: REMOTION_ROOT, stdio: 'pipe', timeout: 300_000 }
  );

  return outPath;
}
```

### Step 3: TypeScript check — both packages should be clean

```bash
cd apps/worker && npx tsc --noEmit
```

Expected: zero errors.

### Step 4: Commit

```bash
git add apps/worker/src/jobs/pipeline.ts apps/worker/src/jobs/render.ts
git commit -m "feat: pipeline threads language + businessType + aspectRatio through to render"
```

---

## Task 6: Remotion constants — remove WIDTH/HEIGHT

**Files:**
- Modify: `agentforge-video/src/constants.ts`

### Step 1: Strip WIDTH, HEIGHT, SCENES, TOTAL_FRAMES

Replace `agentforge-video/src/constants.ts` with:

```ts
export const FPS = 30;
export const TRANSITION_FRAMES = 15;

export const COLORS = {
  bg:         '#050d1a',
  bgCard:     '#0a1628',
  accent:     '#3b82f6',
  accentGlow: '#60a5fa',
  cyan:       '#06b6d4',
  white:      '#ffffff',
  gray:       '#94a3b8',
  danger:     '#ef4444',
};
```

### Step 2: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

Expected: errors in Root.tsx and AgentForgeAd.tsx about missing WIDTH/HEIGHT imports — fixed in Task 8.

### Step 3: No commit yet — task 7+8 first.

---

## Task 7: calculateMetadata — return dynamic width/height

**Files:**
- Modify: `agentforge-video/src/calculateMetadata.ts`

### Step 1: Add dynamic dimensions

Replace `agentforge-video/src/calculateMetadata.ts` with:

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

  const aspectRatio = props.aspectRatio ?? '16:9';
  const width  = aspectRatio === '9:16' ? 1080 : 1920;
  const height = aspectRatio === '9:16' ? 1920 : 1080;

  return {
    durationInFrames: Math.max(totalFrames, 30),
    width,
    height,
    props: { ...props, sceneDurations },
  };
};
```

### Step 2: No commit yet — continue to Task 8.

---

## Task 8: Root.tsx + AgentForgeAd.tsx — remove WIDTH/HEIGHT, add aspectRatio

**Files:**
- Modify: `agentforge-video/src/Root.tsx`
- Modify: `agentforge-video/src/AgentForgeAd.tsx`

### Step 1: Update Root.tsx

Replace `agentforge-video/src/Root.tsx` with:

```tsx
import { Composition } from 'remotion';
import { AgentForgeAd } from './AgentForgeAd';
import { calculateMetadata } from './calculateMetadata';
import { FPS } from './constants';
import type { AgentForgeAdProps } from './types';

const DEFAULT_PROPS: AgentForgeAdProps = {
  sceneDurations: [180, 180, 150, 120, 210],
  accentColor:    '#3b82f6',
  aspectRatio:    '16:9',        // ← NEW (default)
  brandName:      'AgentForge',
  tagline:        'AI Automation for Growing Businesses',
  ctaText:        'Book a Free Call',
  ctaUrl:         'agentforge.ai/start',
  scenes: [
    {
      type: 'pain_hook',
      props: {
        voiceover:   '',
        headline:    'Your team is drowning in busywork.',
        sub:         'Every day your best people waste hours on tasks that don\'t grow the business.',
        painPoints:  ['Manual data entry', 'Endless follow-ups', 'Repetitive reporting'],
      },
    },
    {
      type: 'feature_list',
      props: {
        voiceover:     '',
        headlineLines: ['We build', 'custom AI tools', 'that handle it all.', 'Automatically.'],
        sub:           'No setup. No learning curve. Fully managed.',
        features: [
          { icon: '📧', title: 'AI Email Manager',    detail: 'Auto-sorted, drafted & sent',      status: '47 handled' },
          { icon: '📊', title: 'AI Data Assistant',   detail: 'Updated in real-time, zero entry', status: 'Synced live' },
          { icon: '🔔', title: 'AI Follow-Up Agent',  detail: 'No lead ever forgotten again',     status: '12 sent today' },
        ],
      },
    },
    {
      type: 'stats_grid',
      props: {
        voiceover: '',
        title:     'Average results after 30 days',
        sub:       'Across 50+ business clients',
        stats: [
          { value: '28hrs',  label: 'Saved per week',    sub: 'Per team average' },
          { value: '5 days', label: 'To go live',        sub: 'From first call' },
          { value: '$5.6K',  label: 'Monthly ROI',       sub: 'Average return' },
        ],
      },
    },
    { type: 'brand_reveal', props: { voiceover: '' } },
    {
      type: 'cta',
      props: {
        voiceover:  '',
        headline:   'Stop paying people to do',
        accentLine: 'what AI does better.',
        sub:        'Book your free 15-minute call today.',
      },
    },
  ],
};

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeAd"
    component={AgentForgeAd}
    durationInFrames={DEFAULT_PROPS.sceneDurations.reduce((s, d) => s + d, 0) - (DEFAULT_PROPS.scenes.length - 1) * 15}
    fps={FPS}
    width={1920}   // static fallback; calculateMetadata overrides for 9:16
    height={1080}  // static fallback
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={calculateMetadata}
  />
);
```

### Step 2: Update AgentForgeAd.tsx — move TRANSITIONS inside component, use useVideoConfig

Replace `agentforge-video/src/AgentForgeAd.tsx` with:

```tsx
// agentforge-video/src/AgentForgeAd.tsx
import React from 'react';
import { AbsoluteFill, staticFile, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions';
import { fade }      from '@remotion/transitions/fade';
import { slide }     from '@remotion/transitions/slide';
import { wipe }      from '@remotion/transitions/wipe';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { flip }      from '@remotion/transitions/flip';
import { TRANSITION_FRAMES } from './constants';
import { SCENE_REGISTRY } from './sceneRegistry';
import type { AgentForgeAdProps, SharedSceneProps } from './types';

export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  scenes,
  sceneDurations,
  brandName,
  tagline,
  ctaText,
  ctaUrl,
  accentColor,
}) => {
  const { width, height } = useVideoConfig();  // ← live dimensions from calculateMetadata
  const tf = TRANSITION_FRAMES;
  const totalFrames = sceneDurations.reduce((s, d) => s + d, 0) - (scenes.length - 1) * tf;

  // Defined inside component so clockWipe gets live width/height
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TRANSITIONS: TransitionPresentation<any>[] = [
    slide({ direction: 'from-right' }),
    wipe({ direction: 'from-left' }),
    fade(),
    slide({ direction: 'from-bottom' }),
    clockWipe({ width, height }),
    flip(),
  ];

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

### Step 3: TypeScript check — Remotion package should be clean

```bash
cd agentforge-video && npx tsc --noEmit
```

Expected: zero errors (may have residual scene errors if scenes still import WIDTH/HEIGHT — those are fixed in Tasks 10-15).

### Step 4: Commit

```bash
git add agentforge-video/src/constants.ts agentforge-video/src/calculateMetadata.ts agentforge-video/src/Root.tsx agentforge-video/src/AgentForgeAd.tsx
git commit -m "feat: Remotion aspect ratio system — dynamic width/height from calculateMetadata"
```

---

## Task 9: Create `useSceneLayout.ts` hook

**Files:**
- Create: `agentforge-video/src/shared/useSceneLayout.ts`

### Step 1: Write the hook

Create `agentforge-video/src/shared/useSceneLayout.ts`:

```ts
// agentforge-video/src/shared/useSceneLayout.ts
import { useVideoConfig } from 'remotion';

export interface SceneLayout {
  isPortrait:      boolean;
  width:           number;
  height:          number;
  // Typography
  displaySize:     number;   // Bebas Neue / DISPLAY_FONT headlines
  headingSize:     number;   // DM Sans bold headings
  bodySize:        number;   // DM Sans body text
  labelSize:       number;   // Mono labels / badges
  // Spacing
  outerPadding:    number;   // left/right padding of AbsoluteFill content
  innerGap:        number;   // gap between major sections
  cardGap:         number;   // gap between cards in a row/column
  // Layout
  direction:       'row' | 'column';
  maxContentWidth: number;
}

export function useSceneLayout(): SceneLayout {
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;

  if (isPortrait) {
    return {
      isPortrait:      true,
      width,  height,
      displaySize:     72,
      headingSize:     40,
      bodySize:        20,
      labelSize:       13,
      outerPadding:    48,
      innerGap:        24,
      cardGap:         16,
      direction:       'column',
      maxContentWidth: 984,
    };
  }

  return {
    isPortrait:      false,
    width,  height,
    displaySize:     96,
    headingSize:     48,
    bodySize:        22,
    labelSize:       14,
    outerPadding:    80,
    innerGap:        32,
    cardGap:         24,
    direction:       'row',
    maxContentWidth: 1760,
  };
}
```

### Step 2: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

Expected: zero errors (hook is not yet imported anywhere).

### Step 3: Commit

```bash
git add agentforge-video/src/shared/useSceneLayout.ts
git commit -m "feat: add useSceneLayout() hook — layout tokens for responsive 16:9 ↔ 9:16"
```

---

## Task 10: Scene batch A — centered scenes (BrandReveal, CTA, Testimonial, ProductShowcase, OfferCountdown)

These scenes are already column-based; they just need font/padding tokens from `useSceneLayout`.

**Files:**
- Modify: `agentforge-video/src/scenes/SceneBrandReveal.tsx`
- Modify: `agentforge-video/src/scenes/SceneCTA.tsx`
- Modify: `agentforge-video/src/scenes/SceneTestimonial.tsx`
- Modify: `agentforge-video/src/scenes/SceneProductShowcase.tsx`
- Modify: `agentforge-video/src/scenes/SceneOfferCountdown.tsx`

### Step 1: Apply the standard migration to each scene

**Pattern for all 5 scenes — add these 2 lines at the top of the component body:**

```ts
import { useSceneLayout } from '../shared/useSceneLayout';
// ...inside component:
const layout = useSceneLayout();
```

Then replace the following hardcoded values:

| Old value | Replace with |
|-----------|-------------|
| `padding: '0 80px'` | `padding: \`0 ${layout.outerPadding}px\`` |
| `padding: '48px 80px'` | `padding: \`48px ${layout.outerPadding}px\`` |
| `padding: '0 100px'` | `padding: \`0 ${layout.outerPadding + 20}px\`` |
| `padding: '0 120px'` | `padding: \`0 ${layout.outerPadding + 40}px\`` |
| `fontSize: 48` (heading) | `layout.headingSize` |
| `fontSize: 22` / `fontSize: 26` / `fontSize: 28` (body) | `layout.bodySize` |
| `fontSize: 14` / `fontSize: 16` (label/mono) | `layout.labelSize` |
| `gap: 60` / `gap: 48` | `layout.innerGap * 2` or `layout.innerGap` |

**SceneBrandReveal** — specific changes:
- Line 46: `padding: '0 80px'` → `padding: \`0 ${layout.outerPadding}px\``
- Line 39: fontSize 100-180 (dynamic brand name) stays dynamic — no change
- Line 74: `fontSize: 28` tagline → `layout.bodySize + 8` (keeps tagline slightly larger)

**SceneCTA** — specific changes:
- Line 63: `padding: '0 100px'` → `padding: \`0 ${layout.outerPadding + 20}px\``
- Line 67: `fontSize: 64` headline → `layout.headingSize + 16`
- Line 74: `fontSize: 64` accent line → `layout.headingSize + 16`
- Line 81: `fontSize: 26` sub → `layout.bodySize + 4`
- Line 92: `fontSize: 28` CTA button → `layout.bodySize + 6`

**SceneTestimonial** — specific changes:
- Line 53: `padding: '0 120px'` → `padding: \`0 ${layout.outerPadding + 40}px\``
- Line 63: `fontSize: 44` quote → `layout.headingSize - 4`
- Line 78: `fontSize: 24` author name → `layout.bodySize + 4`
- Line 80: `fontSize: 18` author role → `layout.labelSize + 4`

**SceneProductShowcase** — specific changes:
- Line 56: `padding: '0 80px 80px'` → `padding: \`0 ${layout.outerPadding}px ${layout.outerPadding}px\``
- Line 60: `fontSize: 84` product name → `layout.displaySize - 12`
- Line 70: `fontSize: 30` tagline → `layout.bodySize + 8`
- Line 83: `fontSize: 28` price → `layout.bodySize + 6`

**SceneOfferCountdown** — specific changes:
- Line 46: `padding: '0 100px'` → `padding: \`0 ${layout.outerPadding + 20}px\``
- Line 62: `fontSize: 68` offer → `layout.headingSize + 20`
- Line 70: `fontSize: 28` benefit → `layout.bodySize + 6`
- Line 78 progress bar: `maxWidth: 600` → `maxWidth: layout.maxContentWidth * 0.38`

### Step 2: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

### Step 3: Commit

```bash
git add agentforge-video/src/scenes/SceneBrandReveal.tsx agentforge-video/src/scenes/SceneCTA.tsx agentforge-video/src/scenes/SceneTestimonial.tsx agentforge-video/src/scenes/SceneProductShowcase.tsx agentforge-video/src/scenes/SceneOfferCountdown.tsx
git commit -m "feat: scene batch A — BrandReveal/CTA/Testimonial/ProductShowcase/OfferCountdown use useSceneLayout"
```

---

## Task 11: Scene batch B — column scenes (InboxChaos, CostCounter)

These are already vertically stacked; they need font/padding tokens.

**Files:**
- Modify: `agentforge-video/src/scenes/SceneInboxChaos.tsx`
- Modify: `agentforge-video/src/scenes/SceneCostCounter.tsx`

### Step 1: Apply migration

Add import + `const layout = useSceneLayout()` to both.

**SceneInboxChaos** — changes:
- Line 33: `padding: '0 180px'` → `padding: \`0 ${layout.outerPadding * 2}px\``
- Line 91: `paddingBottom: 90` → `paddingBottom: layout.outerPadding`
- Line 93: `gap: 48` → `layout.innerGap * 1.5`
- Line 100: `fontSize: 68` punch words → `layout.headingSize + 20`
- Line 70: `fontSize: 22` subject → `layout.bodySize`

**SceneCostCounter** — specific changes:
- Line 69: `padding: '0 100px'` → `padding: \`0 ${layout.outerPadding + 20}px\``
- Line 72: `fontSize: 32` intro → `layout.bodySize + 10`
- Line 42: `fontSize: 28` stat label → `layout.bodySize + 6`
- The two stats use `flexDirection: 'row'` inside a flex container.
  In portrait: change to `flexDirection: layout.direction`
  The separator line between the two stats should change:
  - Landscape: `width: 1, height: 140` (vertical separator)
  - Portrait: `height: 1, width: 140` (horizontal separator, and the container is already column)

Specific change for CostCounter layout:
```tsx
// The stats row — make responsive
<div style={{ display: 'flex', flexDirection: layout.direction, gap: layout.direction === 'row' ? 100 : 40, alignItems: 'center' }}>
  <Stat {...stat1} cue={CUE_STAT1} frame={frame} fps={fps} accentColor={accentColor} />
  <div style={layout.direction === 'row'
    ? { width: 1, height: 140, background: `linear-gradient(to bottom, transparent, rgba(148,163,184,0.2), transparent)` }
    : { height: 1, width: 140, background: `linear-gradient(to right, transparent, rgba(148,163,184,0.2), transparent)` }
  } />
  <Stat {...stat2} cue={CUE_STAT2} frame={frame} fps={fps} accentColor={accentColor} />
</div>
```

Also in the `Stat` component sub-component, reduce `fontSize: 160` to responsive:
```tsx
<span style={{ fontSize: layout.isPortrait ? 120 : 160, ... }}>
```

Wait, the `Stat` sub-component doesn't have access to layout. Pass it as a prop or call `useSceneLayout` inside `Stat` too. Simpler: pass `isPortrait` as a prop:
```tsx
const Stat: React.FC<{...; isPortrait: boolean}> = ({ ..., isPortrait }) => {
  const bigFontSize = isPortrait ? 120 : 160;
  ...
  <span style={{ fontSize: bigFontSize, ... }}>
```

### Step 2: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

### Step 3: Commit

```bash
git add agentforge-video/src/scenes/SceneInboxChaos.tsx agentforge-video/src/scenes/SceneCostCounter.tsx
git commit -m "feat: scene batch B — InboxChaos/CostCounter use useSceneLayout"
```

---

## Task 12: Scene batch C — split layouts (PainHook, FeatureList, MapLocation)

These use a horizontal split (left text / right cards) in landscape. In portrait they must stack vertically.

**Files:**
- Modify: `agentforge-video/src/scenes/ScenePainHook.tsx`
- Modify: `agentforge-video/src/scenes/SceneFeatureList.tsx`
- Modify: `agentforge-video/src/scenes/SceneMapLocation.tsx`

### Step 1: ScenePainHook — replace split with responsive

Key change — the main content wrapper and left/right split:

**Before:**
```tsx
<AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '0 80px', overflow: 'hidden' }}>
  {/* Left: text — 54% */}
  <div style={{ width: '54%', display: 'flex', flexDirection: 'column', gap: 26 }}>
  ...
  {/* Right: pain cards */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 64, ... }}>
```

**After:**
```tsx
<AbsoluteFill style={{ display: 'flex', flexDirection: layout.direction, alignItems: layout.isPortrait ? 'stretch' : 'center', padding: `0 ${layout.outerPadding}px`, overflow: 'hidden', gap: layout.innerGap }}>
  {/* Text section */}
  <div style={{ width: layout.isPortrait ? '100%' : '54%', display: 'flex', flexDirection: 'column', gap: 26 }}>
  ...
  {/* Pain cards */}
  <div style={{ flex: layout.isPortrait ? 'none' : 1, display: 'flex', flexDirection: 'column', gap: layout.cardGap, paddingLeft: layout.isPortrait ? 0 : 64, opacity: exitOp }}>
```

Also update font sizes:
- `fontSize: 92` (headline WordByWord `wordStyle`) → `fontSize: layout.displaySize - 4`
- `fontSize: 27` (sub) → `layout.bodySize`
- `fontSize: 24` (card text) → `layout.bodySize`

### Step 2: SceneFeatureList — responsive split

**Before (line 35):**
```tsx
<AbsoluteFill style={{ display: 'flex', alignItems: 'center', padding: '48px 80px', gap: 60, overflow: 'hidden' }}>
  {/* Left: headline — width: 480 */}
  <div style={{ width: 480, flexShrink: 0, ... }}>
  {/* Right: cards */}
  <div style={{ flex: 1, ... }}>
```

**After:**
```tsx
<AbsoluteFill style={{ display: 'flex', flexDirection: layout.direction, alignItems: layout.isPortrait ? 'stretch' : 'center', padding: `${layout.outerPadding * 0.6}px ${layout.outerPadding}px`, gap: layout.innerGap, overflow: 'hidden' }}>
  {/* Headline section */}
  <div style={{ width: layout.isPortrait ? '100%' : 480, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
  {/* Feature cards */}
  <div style={{ flex: layout.isPortrait ? 'none' : 1, display: 'flex', flexDirection: 'column', gap: layout.cardGap }}>
```

Font sizes:
- `fontSize: 56` (headlineLines WordByWord) → `fontSize: layout.headingSize + 8`
- `fontSize: 22` (sub) → `layout.bodySize`
- `fontSize: 22` (feature title) → `layout.bodySize`

### Step 3: SceneMapLocation — responsive split

**Before (line 55):**
```tsx
{/* Pin — left 55% */}
<AbsoluteFill style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
  <div style={{ width: '55%', ...pin... }}>
  {/* Info card — right side */}
  <div style={{ flex: 1, padding: '0 60px 0 0', ... }}>
```

**After:** In portrait, stack pin above info card:
```tsx
<AbsoluteFill style={{ display: 'flex', flexDirection: layout.direction, alignItems: 'center', justifyContent: layout.isPortrait ? 'center' : 'flex-start', padding: `${layout.outerPadding}px`, gap: layout.innerGap, pointerEvents: 'none' }}>
  {/* Pin */}
  <div style={{ width: layout.isPortrait ? '100%' : '55%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const, minHeight: layout.isPortrait ? 200 : undefined }}>
    {/* ripples + pin — unchanged */}
  </div>
  {/* Info card */}
  <div style={{ flex: layout.isPortrait ? 'none' : 1, width: layout.isPortrait ? '100%' : undefined, padding: layout.isPortrait ? '0' : '0 60px 0 0', opacity: infoOp, transform: `translateY(${infoY}px)` }}>
```

Font sizes in MapLocation:
- `fontSize: 44` city → `layout.headingSize - 4`
- `fontSize: 22` address → `layout.bodySize`
- `fontSize: 20` hours/phone → `layout.bodySize - 2`

### Step 4: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

### Step 5: Commit

```bash
git add agentforge-video/src/scenes/ScenePainHook.tsx agentforge-video/src/scenes/SceneFeatureList.tsx agentforge-video/src/scenes/SceneMapLocation.tsx
git commit -m "feat: scene batch C — PainHook/FeatureList/MapLocation use useSceneLayout responsive split"
```

---

## Task 13: Scene batch D — row-of-cards (StatsGrid, TeamIntro)

In landscape: cards in a row. In portrait: cards stacked in a column.

**Files:**
- Modify: `agentforge-video/src/scenes/SceneStatsGrid.tsx`
- Modify: `agentforge-video/src/scenes/SceneTeamIntro.tsx`

### Step 1: SceneStatsGrid

Add import + `const layout = useSceneLayout()`.

**StatCard** sub-component needs `layout` context. Simplest: pass `isPortrait` prop:
```ts
const StatCard: React.FC<{ ...; isPortrait: boolean }> = ({ ..., isPortrait }) => {
  // fontSize: 100 → isPortrait ? 72 : 100
```

Main layout — the cards row:
```tsx
{/* Title */}
<div style={{ opacity: titleOp, transform: `translateY(${titleY}px)`, textAlign: 'center' as const }}>
  <div style={{ fontSize: layout.headingSize + 4, fontWeight: '800', color: '#f1f5f9', fontFamily: FONT, letterSpacing: '-1.5px' }}>{title}</div>
  <div style={{ fontSize: layout.bodySize, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, marginTop: 8 }}>{sub}</div>
</div>
{/* Cards — row in landscape, column in portrait */}
<div style={{ display: 'flex', flexDirection: layout.direction, gap: layout.cardGap, width: '100%' }}>
  {stats.slice(0, 3).map((s, i) => (
    <StatCard key={i} {...s} cue={cardCues[i]} frame={frame} fps={fps} accentColor={accentColor} isPortrait={layout.isPortrait} />
  ))}
</div>
```

Outer padding:
```tsx
<AbsoluteFill style={{ ..., padding: `0 ${layout.outerPadding}px`, gap: layout.innerGap }}>
```

### Step 2: SceneTeamIntro

Add import + `const layout = useSceneLayout()`.

The member cards already use `flexWrap: 'wrap'` + `justifyContent: 'center'`, so they naturally stack in portrait. Just update:
- Title font: `fontSize: 48` → `layout.headingSize`
- Padding: `padding: '0 80px'` → `padding: \`0 ${layout.outerPadding}px\``
- Cards gap: `gap: 28` → `layout.cardGap`
- Member card `width: 200` → `width: layout.isPortrait ? 160 : 200`

### Step 3: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

### Step 4: Commit

```bash
git add agentforge-video/src/scenes/SceneStatsGrid.tsx agentforge-video/src/scenes/SceneTeamIntro.tsx
git commit -m "feat: scene batch D — StatsGrid/TeamIntro use useSceneLayout for responsive cards"
```

---

## Task 14: Scene batch E — special cases (BeforeAfter, HowItWorks)

These have directional animations that need to flip between landscape and portrait.

**Files:**
- Modify: `agentforge-video/src/scenes/SceneBeforeAfter.tsx`
- Modify: `agentforge-video/src/scenes/SceneHowItWorks.tsx`

### Step 1: SceneBeforeAfter — horizontal → vertical in portrait

In landscape: `Before | Divider | After` (row)
In portrait: `Before` on top, `After` below (column with horizontal line)

Key layout change:

```tsx
<AbsoluteFill style={{ display: 'flex', flexDirection: layout.direction, alignItems: layout.isPortrait ? 'stretch' : 'center', justifyContent: 'center', padding: `0 ${layout.outerPadding}px`, gap: 0 }}>
  {/* Before section */}
  <div style={{ flex: 1, padding: layout.isPortrait ? `0 0 ${layout.innerGap}px 0` : '0 48px 0 0' }}>
    ...labels + PointList unchanged...
  </div>

  {/* Divider — vertical in landscape, horizontal in portrait */}
  {layout.isPortrait
    ? <div style={{ height: 1, width: dividerH, background: `linear-gradient(to right, transparent, ${av.border}, transparent)` }} />
    : <div style={{ width: 1, height: dividerH, background: `linear-gradient(to bottom, transparent, ${av.border}, transparent)`, flexShrink: 0 }} />
  }

  {/* After section */}
  <div style={{ flex: 1, padding: layout.isPortrait ? `${layout.innerGap}px 0 0 0` : '0 0 0 48px' }}>
    ...labels + PointList unchanged...
  </div>
</AbsoluteFill>
```

Also update PointList to use `layout.bodySize`:
- `fontSize: 20` point text → `layout.bodySize`
- `fontSize: 14` labels → `layout.labelSize`

The `dividerH` `interpolate(...[0, 320])` — in portrait use height of before section (approx `height * 0.35`):
```ts
const dividerH = interpolate(
  spring({ frame: frame - CUE_DIVIDER, fps, config: { damping: 200 } }),
  [0, 1], [0, layout.isPortrait ? layout.width * 0.6 : 320],
);
```

### Step 2: SceneHowItWorks — horizontal steps → vertical in portrait

In landscape: `Step1 → Step2 → Step3` (row with horizontal connectors)
In portrait: `Step1 ↓ Step2 ↓ Step3` (column with vertical connectors)

Key layout change:

```tsx
{/* Steps container */}
<div style={{ display: 'flex', flexDirection: layout.direction, alignItems: layout.isPortrait ? 'center' : 'flex-start', width: '100%', justifyContent: 'center', gap: layout.isPortrait ? layout.innerGap : 0 }}>
  {displaySteps.map((step, i) => {
    ...
    return (
      <React.Fragment key={i}>
        <div style={{ opacity: op, transform: `translateY(${y}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: layout.isPortrait ? '100%' : 240, maxWidth: layout.isPortrait ? 400 : undefined }}>
          {/* step circle, icon, title, description — unchanged */}
        </div>

        {/* Connector between steps */}
        {i < displaySteps.length - 1 && (
          layout.isPortrait
            ? (
              // Vertical connector line (draws downward)
              <div style={{
                width: 2,
                height: i === 0 ? connector1W * 40 : connector2W * 40,
                background: `linear-gradient(to bottom, ${av.strong}, ${av.border})`,
              }} />
            ) : (
              // Horizontal connector line (draws rightward)
              <div style={{
                flex: 1, height: 2, marginTop: 39,
                background: `linear-gradient(90deg, ${av.strong}, ${av.border})`,
                transform: `scaleX(${i === 0 ? connector1W : connector2W})`,
                transformOrigin: 'left',
              }} />
            )
        )}
      </React.Fragment>
    );
  })}
</div>
```

For the vertical connector height: use a fixed value proportional to innerGap:
```ts
// In portrait: connector animates height from 0 → innerGap
const connector1H = interpolate(frame - stepCues[1], [0, 20], [0, layout.innerGap], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const connector2H = interpolate(frame - stepCues[2], [0, 20], [0, layout.innerGap], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
```

Font sizes:
- Title `fontSize: 48` → `layout.headingSize`
- Step title `fontSize: 22` → `layout.bodySize`
- Step description `fontSize: 16` → `layout.labelSize + 2`

Outer padding: `padding: '0 80px'` → `padding: \`0 ${layout.outerPadding}px\``

### Step 3: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

### Step 4: Commit

```bash
git add agentforge-video/src/scenes/SceneBeforeAfter.tsx agentforge-video/src/scenes/SceneHowItWorks.tsx
git commit -m "feat: scene batch E — BeforeAfter/HowItWorks responsive directional layout"
```

---

## Task 15: Scene batch F — Comparison

In portrait: compact table, slightly smaller fonts, hide sub-labels if needed.

**Files:**
- Modify: `agentforge-video/src/scenes/SceneComparison.tsx`

### Step 1: Apply migration

Add import + `const layout = useSceneLayout()`.

Key changes:
```tsx
{/* Outer wrapper */}
<AbsoluteFill style={{ ..., padding: `0 ${layout.outerPadding}px`, gap: 0 }}>
  <div style={{ width: '100%', maxWidth: layout.isPortrait ? layout.maxContentWidth : 860 }}>
    {/* Header row */}
    ...
    {/* Competitor header width */}
    <div style={{ width: layout.isPortrait ? 140 : 180, ... }}>
    {/* Brand header width */}
    <div style={{ width: layout.isPortrait ? 160 : 200, ... }}>

    {/* Feature label font */}
    <span style={{ fontSize: layout.bodySize, ... }}>

    {/* Cell check icon */}
    <div style={{ width: layout.isPortrait ? 28 : 32, height: layout.isPortrait ? 28 : 32, ... }}>
    <span style={{ fontSize: layout.isPortrait ? 15 : 18, ... }}>
```

Header font:
- `fontSize: 16` labels → `layout.labelSize + 2`

Row padding:
- `padding: '16px 0'` → `padding: \`${layout.isPortrait ? 10 : 16}px 0\``

### Step 2: TypeScript check

```bash
cd agentforge-video && npx tsc --noEmit
```

Expected: zero errors across all 15 scenes.

### Step 3: Commit

```bash
git add agentforge-video/src/scenes/SceneComparison.tsx
git commit -m "feat: scene batch F — Comparison uses useSceneLayout for responsive table"
```

---

## Task 16: Web UI — add 16:9 / 9:16 aspect ratio toggle

The toggle appears in Step 2 of the new video form (the "Your Content" step), between the title field and the input type-specific field.

**Files:**
- Modify: `apps/web/app/(app)/videos/new/page.tsx`

### Step 1: Add `aspectRatio` state and the toggle UI

The diff (showing only new/changed code):

**Add state variable** (line ~24, after `const [title, setTitle] = useState('');`):
```tsx
const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
```

**Add toggle UI** in Step 2, after the Video Title `<div>` and before the URL/File/Text input:
```tsx
{/* Aspect Ratio toggle */}
<div>
  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
    Format
  </label>
  <div className="flex gap-3">
    {(['16:9', '9:16'] as const).map((ar) => (
      <button
        key={ar}
        type="button"
        onClick={() => setAspectRatio(ar)}
        className={`flex-1 py-3 border font-display tracking-wider text-sm transition-colors ${
          aspectRatio === ar
            ? 'border-film-amber bg-film-amber/10 text-film-amber'
            : 'border-film-border text-film-gray hover:border-film-amber/30'
        }`}
      >
        {ar === '16:9' ? '▬  Landscape 16:9' : '▪  Portrait 9:16'}
      </button>
    ))}
  </div>
  <div className="text-xs text-film-gray font-sans mt-1">
    {aspectRatio === '16:9' ? 'YouTube, LinkedIn, website embeds' : 'Instagram Reels, TikTok, Stories'}
  </div>
</div>
```

**Update the review step** — add `aspectRatio` to the summary table:
```tsx
{ label: 'Format',       value: aspectRatio === '16:9' ? 'Landscape 16:9' : 'Portrait 9:16' },
```
(insert this row after the `'Title'` row)

**Update the worker POST body** to include `aspectRatio`:
```tsx
body: JSON.stringify({ videoId: video.id, userId: user!.id, inputType, inputData, aspectRatio }),
```

### Step 2: TypeScript check

```bash
cd apps/web && npx tsc --noEmit
```

Expected: zero errors.

### Step 3: Final TypeScript check — everything together

```bash
cd apps/worker && npx tsc --noEmit
cd agentforge-video && npx tsc --noEmit
```

Both expected: zero errors.

### Step 4: Commit

```bash
git add apps/web/app/\(app\)/videos/new/page.tsx
git commit -m "feat: web UI 16:9/9:16 aspect ratio toggle in new video form"
```

### Step 5: Push

```bash
git push
```

---

## Verification after all 16 tasks

**1. Test a landscape render (default):**
```bash
cd agentforge-video
npx remotion render AgentForgeAd out/test-16-9.mp4 --codec h264
```
Expected: renders ~30s video, all scenes visible, no empty black backgrounds.

**2. Test a portrait render:**
```bash
npx remotion render AgentForgeAd out/test-9-16.mp4 --codec h264 --props '{"aspectRatio":"9:16","brandName":"Test","tagline":"Test tagline","ctaText":"Get Started","ctaUrl":"test.com","accentColor":"#3b82f6","sceneDurations":[150,150,120],"scenes":[{"type":"pain_hook","props":{"voiceover":"","headline":"Test headline","sub":"Test subtitle","painPoints":["Point one","Point two","Point three"]}},{"type":"stats_grid","props":{"voiceover":"","title":"Results","sub":"Our clients","stats":[{"value":"99%","label":"Uptime","sub":"Always on"},{"value":"5min","label":"Setup","sub":"Fast start"},{"value":"10x","label":"ROI","sub":"Growth"}]}},{"type":"cta","props":{"voiceover":"","headline":"Ready to start?","accentLine":"Get started now.","sub":"Join us today."}}]}'
```
Expected: 1080×1920 video, all scenes stack vertically, readable text.

**3. Deploy to VPS:**
```bash
git pull && docker compose build --no-cache && docker compose up -d
```

---

## Change map summary (22 files)

| File | Task | Change |
|------|------|--------|
| `apps/worker/src/types/script.ts` | 1 | + `language`, ~~aspectRatio~~ |
| `agentforge-video/src/types.ts` | 1 | + `aspectRatio` to `AgentForgeAdProps` |
| `apps/worker/src/jobs/scraper.ts` | 2 | language detect, subpage crawl, businessType |
| `apps/worker/src/jobs/scriptgen.ts` | 3 | gpt-5.2, language param, word-merge, B2B/B2C |
| `apps/worker/src/jobs/images.ts` | 4 | retry ×3, gradient placeholder, og:image fallback |
| `apps/worker/src/jobs/pipeline.ts` | 5 | thread language + aspectRatio |
| `apps/worker/src/jobs/render.ts` | 5 | pass aspectRatio to remotionProps |
| `agentforge-video/src/constants.ts` | 6 | remove WIDTH/HEIGHT/SCENES/TOTAL_FRAMES |
| `agentforge-video/src/calculateMetadata.ts` | 7 | return dynamic width/height |
| `agentforge-video/src/Root.tsx` | 8 | + aspectRatio in defaultProps |
| `agentforge-video/src/AgentForgeAd.tsx` | 8 | TRANSITIONS inside component, useVideoConfig |
| `agentforge-video/src/shared/useSceneLayout.ts` | 9 | **NEW** hook |
| `agentforge-video/src/scenes/SceneBrandReveal.tsx` | 10 | layout tokens |
| `agentforge-video/src/scenes/SceneCTA.tsx` | 10 | layout tokens |
| `agentforge-video/src/scenes/SceneTestimonial.tsx` | 10 | layout tokens |
| `agentforge-video/src/scenes/SceneProductShowcase.tsx` | 10 | layout tokens |
| `agentforge-video/src/scenes/SceneOfferCountdown.tsx` | 10 | layout tokens |
| `agentforge-video/src/scenes/SceneInboxChaos.tsx` | 11 | layout tokens |
| `agentforge-video/src/scenes/SceneCostCounter.tsx` | 11 | layout tokens + responsive stats row |
| `agentforge-video/src/scenes/ScenePainHook.tsx` | 12 | responsive split layout |
| `agentforge-video/src/scenes/SceneFeatureList.tsx` | 12 | responsive split layout |
| `agentforge-video/src/scenes/SceneMapLocation.tsx` | 12 | responsive split layout |
| `agentforge-video/src/scenes/SceneStatsGrid.tsx` | 13 | responsive card row → column |
| `agentforge-video/src/scenes/SceneTeamIntro.tsx` | 13 | responsive card row → column |
| `agentforge-video/src/scenes/SceneBeforeAfter.tsx` | 14 | responsive Before/After direction |
| `agentforge-video/src/scenes/SceneHowItWorks.tsx` | 14 | responsive step connectors |
| `agentforge-video/src/scenes/SceneComparison.tsx` | 15 | responsive compact table |
| `apps/web/app/(app)/videos/new/page.tsx` | 16 | 16:9 / 9:16 toggle |
