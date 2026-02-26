# Dynamic Video Generation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.
> **Remotion tasks:** invoke `remotion-best-practices` skill before editing any scene file.

**Goal:** Make every generated video unique — dynamic text, stats, brand identity, and images — driven entirely by the user's input (URL / PDF / PPT / prompt).

**Architecture:** GPT-4o generates a structured `VideoScript` JSON from scraped content. That JSON flows through the pipeline as-is and is passed to Remotion via `--props`. Each scene component reads its content from props instead of hardcoded strings.

**Tech Stack:** OpenAI GPT-4o (JSON mode), ElevenLabs TTS, Gemini image gen, Remotion `--props`, TypeScript strict

---

## Task 1: Install OpenAI SDK on Worker

**Files:**
- Modify: `apps/worker/package.json`

**Step 1: Install the package**
```bash
cd apps/worker && npm install openai
```

**Step 2: Verify**
```bash
ls node_modules/openai
```
Expected: directory exists.

**Step 3: Commit**
```bash
cd ../.. && git add apps/worker/package.json apps/worker/package-lock.json
git commit -m "chore(worker): add openai sdk"
```

---

## Task 2: Create Worker Script Types

**Files:**
- Create: `apps/worker/src/types/script.ts`

**Step 1: Write the file**

```typescript
// apps/worker/src/types/script.ts

export interface ScenePain {
  voiceover:   string
  headline:    string
  sub:         string
  painPoints:  [string, string, string]
}

export interface SceneChaos {
  voiceover:  string
  items: Array<{ subject: string; from: string; time: string; urgent?: boolean }>
  punchWords: [string, string, string]
}

export interface SceneCost {
  voiceover: string
  intro:     string
  stat1:     { value: number; unit: string; label: string }
  stat2:     { value: number; unit: string; label: string }
}

export interface SceneBrand {
  voiceover: string
}

export interface SceneSolution {
  voiceover:     string
  headlineLines: [string, string, string, string]
  sub:           string
  features:      Array<{ icon: string; title: string; detail: string; status: string }>
}

export interface SceneStats {
  voiceover: string
  title:     string
  sub:       string
  stats:     Array<{ value: string; label: string; sub: string }>
}

export interface SceneCTA {
  voiceover:  string
  headline:   string
  accentLine: string
  sub:        string
}

export interface VideoScript {
  brandName: string
  tagline:   string
  ctaText:   string
  ctaUrl:    string
  scenes: [ScenePain, SceneChaos, SceneCost, SceneBrand, SceneSolution, SceneStats, SceneCTA]
}
```

**Step 2: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```
Expected: zero errors.

**Step 3: Commit**
```bash
cd ../.. && git add apps/worker/src/types && git commit -m "feat(worker): VideoScript type definition"
```

---

## Task 3: Rewrite scriptgen.ts — OpenAI GPT-4o

**Files:**
- Modify: `apps/worker/src/jobs/scriptgen.ts`

**Step 1: Replace the entire file**

```typescript
// apps/worker/src/jobs/scriptgen.ts
import OpenAI from 'openai';
import type { VideoScript } from '../types/script';

const client = new OpenAI(); // reads OPENAI_API_KEY from env

const SYSTEM = `You are an expert video ad scriptwriter and marketing strategist.
Analyse business content and output a 7-scene video advertisement script.
Always respond with valid JSON matching the EXACT schema given. No extra keys.`;

function buildPrompt(sourceText: string, inputType: string): string {
  return `Analyse this ${inputType} content and create a complete 7-scene video ad script.

SOURCE CONTENT:
${sourceText.slice(0, 4000)}

Return a JSON object with this EXACT structure (fill every field, no nulls):
{
  "brandName": "Company/product name from content",
  "tagline": "Compelling one-line tagline (max 6 words)",
  "ctaText": "CTA button text e.g. 'Book a Free Demo'",
  "ctaUrl": "Website URL from content or guess from brand name",
  "scenes": [
    {
      "voiceover": "15-25 word narration for scene 1 (pain hook, grabs attention)",
      "headline": "5-8 word punchy display headline about the pain",
      "sub": "1-2 supporting sentences expanding the pain point",
      "painPoints": ["Specific pain 1", "Specific pain 2", "Specific pain 3"]
    },
    {
      "voiceover": "15-25 word narration for scene 2 (amplify chaos, makes it visceral)",
      "items": [
        {"subject": "Relevant realistic task/email subject", "from": "sender@domain.com", "time": "09:14", "urgent": true},
        {"subject": "Another relevant task", "from": "ops@thisbusiness.com", "time": "10:32", "urgent": false},
        {"subject": "Third relevant problem", "from": "team@thisbusiness.com", "time": "11:15", "urgent": true},
        {"subject": "Fourth relevant issue", "from": "admin@thisbusiness.com", "time": "14:22", "urgent": false}
      ],
      "punchWords": ["One word.", "Two words.", "Three word."]
    },
    {
      "voiceover": "15-25 word narration for scene 3 (cost of problem, shocking numbers)",
      "intro": "That's what [this type of business] loses every year",
      "stat1": {"value": 25, "unit": "hrs", "label": "wasted per week"},
      "stat2": {"value": 32000, "unit": "€", "label": "lost per year"}
    },
    {
      "voiceover": "15-25 word narration for scene 4 (brand introduction, turning point)"
    },
    {
      "voiceover": "15-25 word narration for scene 5 (solution, what the product does)",
      "headlineLines": ["First line about the solution", "second line here", "third compelling line", "Automatically."],
      "sub": "One short line: setup time + key differentiator (e.g. 'No setup. Fully managed.')",
      "features": [
        {"icon": "📧", "title": "Specific feature name 1", "detail": "One line: exactly what it does", "status": "47 handled"},
        {"icon": "📊", "title": "Specific feature name 2", "detail": "One line: exactly what it does", "status": "Synced live"},
        {"icon": "🔔", "title": "Specific feature name 3", "detail": "One line: exactly what it does", "status": "Running now"}
      ]
    },
    {
      "voiceover": "15-25 word narration for scene 6 (social proof, real-feeling results)",
      "title": "Average results after 30 days",
      "sub": "Across 50+ [this type of business] clients",
      "stats": [
        {"value": "28hrs", "label": "Saved per week", "sub": "Per team average"},
        {"value": "5 days", "label": "To go live", "sub": "From first call"},
        {"value": "$5.6K", "label": "Monthly ROI", "sub": "Average return"}
      ]
    },
    {
      "voiceover": "15-25 word narration for scene 7 (call to action, urgency + offer)",
      "headline": "Stop losing [customers/patients/clients] to",
      "accentLine": "[the specific problem this brand solves].",
      "sub": "Book your free 15-minute call today."
    }
  ]
}

RULES:
- Extract real numbers/stats from the content where possible
- If no real stats found, invent plausible ones for this industry (not too round, not too precise)
- Make ALL copy specific to this business type — never generic
- Voiceovers must flow naturally read aloud (conversational, not corporate)
- headlineLines[3] in scene 5 must be one punchy word + period ("Automatically." / "Instantly." / "Effortlessly.")
- punchWords in scene 2 must be short (1-3 words each) and punchy
- ctaText matches the business ("Book a Demo" for SaaS, "Book Appointment" for clinics, etc.)`;
}

export async function generateScript(sourceText: string, inputType: string): Promise<VideoScript> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: buildPrompt(sourceText, inputType) },
    ],
    max_tokens: 3000,
    temperature: 0.7,
  });

  const text = response.choices[0].message.content!;
  try {
    return JSON.parse(text) as VideoScript;
  } catch {
    throw new Error(`GPT returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
```

**Step 2: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```

**Step 3: Commit**
```bash
cd ../.. && git add apps/worker/src/jobs/scriptgen.ts
git commit -m "feat(worker): switch to GPT-4o with structured VideoScript output"
```

---

## Task 4: Enhance scraper.ts — also return brand image URL

**Files:**
- Modify: `apps/worker/src/jobs/scraper.ts`

**Step 1: Replace the entire file**

```typescript
// apps/worker/src/jobs/scraper.ts
import axios from 'axios';

export interface ScrapeResult {
  text:      string
  brandImageUrl: string | null  // og:image or first large hero image
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
      timeout: 15000,
    });

    const html = data as string;

    // Extract og:image
    const ogMatch  = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                  || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const brandImageUrl = ogMatch ? ogMatch[1] : null;

    // Strip HTML to plain text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);

    return { text, brandImageUrl };
  } catch {
    throw new Error(`Failed to scrape URL: ${url}`);
  }
}
```

**Step 2: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```

**Step 3: Commit**
```bash
cd ../.. && git add apps/worker/src/jobs/scraper.ts
git commit -m "feat(worker): scraper returns brand og:image alongside text"
```

---

## Task 5: Update images.ts — dynamic prompts + brand image for scene 1

**Files:**
- Modify: `apps/worker/src/jobs/images.ts`

**Step 1: Replace the entire file**

```typescript
// apps/worker/src/jobs/images.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Scene-specific cinematic prompt templates
const SCENE_TEMPLATES = [
  (brand: string, hint: string) => `dark cinematic background: frustrated person overwhelmed in ${brand} business context, ${hint}, film noir style`,
  (brand: string, hint: string) => `chaotic digital overload: inbox flooding with ${brand} related tasks, ${hint}, dark moody background`,
  (brand: string, hint: string) => `burning money and wasted time visualization for ${brand}, ${hint}, minimalist dark background with red accents`,
  (brand: string, hint: string) => `elegant brand identity reveal: professional ${brand} company atmosphere, ${hint}, dark premium background`,
  (brand: string, hint: string) => `futuristic AI automation dashboard for ${brand}, ${hint}, blue glowing interface, dark background`,
  (brand: string, hint: string) => `${brand} team celebrating results, growth charts, success metrics, ${hint}, cinematic lighting`,
  (brand: string, hint: string) => `professional CTA scene for ${brand}, ${hint}, sleek dark background with glowing elements`,
];

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

async function generateWithGemini(prompt: string, outPath: string): Promise<boolean> {
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
  } catch {
    return false;
  }
}

function writePlaceholder(outPath: string, sceneNum: number) {
  const pngHeader = Buffer.from([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
    0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41,0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,
    0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC,0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,
    0x44,0xAE,0x42,0x60,0x82,
  ]);
  fs.writeFileSync(outPath, pngHeader);
  console.log(`[images] Scene ${sceneNum}: using placeholder`);
}

export async function generateImages(
  voiceovers: string[],
  workDir: string,
  brandName: string,
  brandImageUrl: string | null,
): Promise<string[]> {
  fs.mkdirSync(path.join(workDir, 'images'), { recursive: true });
  const outPaths: string[] = [];

  for (let i = 0; i < voiceovers.length; i++) {
    const outPath = path.join(workDir, 'images', `scene${i + 1}.png`);
    const hint    = voiceovers[i].slice(0, 60);
    const prompt  = SCENE_TEMPLATES[i]?.(brandName, hint) ?? `professional business scene for ${brandName}`;

    let ok = false;

    // Scene 1 (hero): try the scraped brand image first
    if (i === 0 && brandImageUrl) {
      console.log(`[images] Scene 1: trying brand og:image`);
      ok = await downloadImage(brandImageUrl, outPath);
    }

    // Gemini generation
    if (!ok) {
      console.log(`[images] Scene ${i + 1}: generating with Gemini`);
      ok = await generateWithGemini(prompt, outPath);
    }

    if (!ok) writePlaceholder(outPath, i + 1);

    outPaths.push(outPath);
    if (i < voiceovers.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  return outPaths;
}
```

**Step 2: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```

**Step 3: Commit**
```bash
cd ../.. && git add apps/worker/src/jobs/images.ts
git commit -m "feat(worker): dynamic Gemini image prompts + brand image for scene 1"
```

---

## Task 6: Update pipeline.ts — thread VideoScript end-to-end

**Files:**
- Modify: `apps/worker/src/jobs/pipeline.ts`

**Step 1: Replace the entire file**

```typescript
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
  const workDir = `/tmp/videoforge/${videoId}`;

  try {
    await updateStatus(videoId, 'processing', 5, 'Extracting content...');

    // 1. Extract text (and brand image URL for website input)
    let sourceText = '';
    let brandImageUrl: string | null = null;

    if (inputType === 'url') {
      const result = await scrapeUrl(inputData.url);
      sourceText   = result.text;
      brandImageUrl = result.brandImageUrl;
    } else if (inputType === 'pdf') {
      sourceText = await parsePdf(inputData.fileName);
    } else if (inputType === 'ppt') {
      sourceText = await parsePpt(inputData.fileName);
    } else {
      sourceText = inputData.text;
    }

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    // 2. Generate structured script via GPT-4o
    const script = await generateScript(sourceText, inputType);

    await updateStatus(videoId, 'processing', 25, 'Recording voiceover...');

    // 3. ElevenLabs TTS — pass only the voiceover strings
    const voiceovers  = script.scenes.map((s) => s.voiceover);
    const audioPaths  = await generateVoiceovers(voiceovers, workDir);

    await updateStatus(videoId, 'processing', 45, 'Generating visuals...');

    // 4. Gemini images — use voiceovers as context + brand image for scene 1
    const imagePaths = await generateImages(voiceovers, workDir, script.brandName, brandImageUrl);

    await updateStatus(videoId, 'processing', 60, 'Rendering video...');

    // 5. Remotion render — pass full script as props
    const mp4Path = await renderVideo({ videoId, script, audioPaths, imagePaths, workDir });

    await updateStatus(videoId, 'processing', 85, 'Uploading...');

    // 6. Upload to Supabase Storage
    const outputUrl = await uploadVideo(mp4Path, videoId);

    // 7. Mark complete
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

**Step 2: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```

**Step 3: Commit**
```bash
cd ../.. && git add apps/worker/src/jobs/pipeline.ts
git commit -m "feat(worker): thread VideoScript from GPT through entire pipeline"
```

---

## Task 7: Update render.ts — pass --props JSON to Remotion

**Files:**
- Modify: `apps/worker/src/jobs/render.ts`

**Step 1: Replace the entire file**

```typescript
// apps/worker/src/jobs/render.ts
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { VideoScript } from '../types/script';

const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');

export async function renderVideo({ videoId, script, audioPaths, imagePaths, workDir }: {
  videoId:    string;
  script:     VideoScript;
  audioPaths: string[];
  imagePaths: string[];
  workDir:    string;
}): Promise<string> {
  const outPath = path.join(workDir, 'output.mp4');
  fs.mkdirSync(workDir, { recursive: true });

  const remotionPublic = path.join(REMOTION_ROOT, 'public');
  fs.mkdirSync(path.join(remotionPublic, 'audio/voiceover'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'images'), { recursive: true });

  // Copy voiceover audio files
  audioPaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `audio/voiceover/scene${i + 1}.mp3`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Copy background images
  const bgNames = ['bg-hero', 'bg-chaos', 'bg-cost', 'bg-logo', 'bg-solution', 'bg-stats', 'bg-cta'];
  imagePaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `images/${bgNames[i] ?? `scene${i + 1}`}.png`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Write props to a temp file (avoids shell command-length limits)
  const propsPath = path.join(workDir, 'props.json');
  const remotionProps = {
    brandName: script.brandName,
    tagline:   script.tagline,
    ctaText:   script.ctaText,
    ctaUrl:    script.ctaUrl,
    scenes:    script.scenes,
  };
  fs.writeFileSync(propsPath, JSON.stringify(remotionProps));

  execSync(
    `npx remotion render AgentForgeAd "${outPath}" --codec h264 --props "${propsPath}"`,
    { cwd: REMOTION_ROOT, stdio: 'pipe', timeout: 300_000 }
  );

  return outPath;
}
```

**Step 2: TypeScript check**
```bash
cd apps/worker && npx tsc --noEmit
```

**Step 3: Commit**
```bash
cd ../.. && git add apps/worker/src/jobs/render.ts
git commit -m "feat(worker): pass VideoScript as --props JSON to Remotion render"
```

---

## Task 8: Update Remotion types.ts

**Files:**
- Modify: `agentforge-video/src/types.ts`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/types.ts

export interface ScenePainProps {
  voiceover:  string
  headline:   string
  sub:        string
  painPoints: [string, string, string]
}

export interface SceneChaosProps {
  voiceover:  string
  items:      Array<{ subject: string; from: string; time: string; urgent?: boolean }>
  punchWords: [string, string, string]
}

export interface SceneCostProps {
  voiceover: string
  intro:     string
  stat1:     { value: number; unit: string; label: string }
  stat2:     { value: number; unit: string; label: string }
}

export interface SceneBrandProps {
  voiceover: string
}

export interface SceneSolutionProps {
  voiceover:     string
  headlineLines: [string, string, string, string]
  sub:           string
  features:      Array<{ icon: string; title: string; detail: string; status: string }>
}

export interface SceneStatsProps {
  voiceover: string
  title:     string
  sub:       string
  stats:     Array<{ value: string; label: string; sub: string }>
}

export interface SceneCTAProps {
  voiceover:  string
  headline:   string
  accentLine: string
  sub:        string
}

export type AgentForgeAdProps = {
  sceneDurations: number[]
  brandName:      string
  tagline:        string
  ctaText:        string
  ctaUrl:         string
  scenes: [
    ScenePainProps,
    SceneChaosProps,
    SceneCostProps,
    SceneBrandProps,
    SceneSolutionProps,
    SceneStatsProps,
    SceneCTAProps,
  ]
}
```

**Step 2: TypeScript check**
```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: errors about scenes receiving wrong props — that's fine, fixed in tasks 9–16.

**Step 3: Commit**
```bash
cd .. && git add agentforge-video/src/types.ts
git commit -m "feat(remotion): full AgentForgeAdProps with per-scene types"
```

---

## Task 9: Update AgentForgeAd.tsx — pass props to all scenes

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/AgentForgeAd.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/AgentForgeAd.tsx
import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { clockWipe } from '@remotion/transitions/clock-wipe';
import { TRANSITION_FRAMES, WIDTH, HEIGHT } from './constants';
import type { AgentForgeAdProps } from './types';
import { Scene1Pain } from './scenes/Scene1Pain';
import { Scene2Chaos } from './scenes/Scene2Chaos';
import { Scene3Cost } from './scenes/Scene3Cost';
import { Scene4Logo } from './scenes/Scene4Logo';
import { Scene5Solution } from './scenes/Scene5Solution';
import { Scene6Stats } from './scenes/Scene6Stats';
import { Scene7CTA } from './scenes/Scene7CTA';

const DEFAULT_DURATIONS = [210, 270, 180, 90, 360, 330, 240];

export const AgentForgeAd: React.FC<AgentForgeAdProps> = ({
  sceneDurations = DEFAULT_DURATIONS,
  brandName,
  tagline,
  ctaText,
  ctaUrl,
  scenes,
}) => {
  const [s1, s2, s3, s4, s5, s6, s7] = sceneDurations;
  const tf = TRANSITION_FRAMES;
  const totalFrames = s1 + s2 + s3 + s4 + s5 + s6 + s7 - 6 * tf;

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
        <TransitionSeries.Sequence durationInFrames={s1}>
          <Scene1Pain {...scenes[0]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s2}>
          <Scene2Chaos {...scenes[1]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-left' })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s3}>
          <Scene3Cost {...scenes[2]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s4}>
          <Scene4Logo brandName={brandName} tagline={tagline} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s5}>
          <Scene5Solution {...scenes[4]} brandName={brandName} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={clockWipe({ width: WIDTH, height: HEIGHT })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s6}>
          <Scene6Stats {...scenes[5]} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: tf })}
        />

        <TransitionSeries.Sequence durationInFrames={s7}>
          <Scene7CTA {...scenes[6]} brandName={brandName} ctaText={ctaText} ctaUrl={ctaUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
```

**Step 2: Commit**
```bash
cd agentforge-video && git add src/AgentForgeAd.tsx
cd .. && git commit -m "feat(remotion): AgentForgeAd passes dynamic props to all scenes"
```

---

## Task 10: Scene1Pain — dynamic headline, sub, painPoints

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/scenes/Scene1Pain.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/scenes/Scene1Pain.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';
import { EmailIcon, ClockIcon, ChartIcon } from '../icons';
import type { ScenePainProps } from '../types';

export const Scene1Pain: React.FC<ScenePainProps> = ({ headline, sub, painPoints }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_BG       = 0;
  const CUE_TAG      = dur * 0.03;
  const CUE_HEADLINE = dur * 0.12;
  const CUE_SUB      = dur * 0.36;
  const CUE_ICON1    = dur * 0.54;
  const CUE_ICON2    = dur * 0.64;
  const CUE_ICON3    = dur * 0.74;
  const EXIT_ICONS   = dur * 0.88;

  const bgOpacity      = interpolate(frame, [CUE_BG, CUE_BG + fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });
  const overlayOpacity = interpolate(frame, [0, fps], [0, 0.82], { extrapolateRight: 'clamp' });

  const tagOp = interpolate(frame - CUE_TAG, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const headlineProgress = spring({ frame: frame - CUE_HEADLINE, fps, config: { damping: 200 }, durationInFrames: 35 });
  const headlineY = interpolate(headlineProgress, [0, 1], [55, 0]);
  const headlineOp = interpolate(frame - CUE_HEADLINE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const subProgress = spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } });
  const subY  = interpolate(subProgress, [0, 1], [30, 0]);
  const subOp = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const icon1Scale = spring({ frame: frame - CUE_ICON1, fps, config: { damping: 15 } });
  const icon2Scale = spring({ frame: frame - CUE_ICON2, fps, config: { damping: 15 } });
  const icon3Scale = spring({ frame: frame - CUE_ICON3, fps, config: { damping: 15 } });
  const iconsProgress1 = spring({ frame: frame - CUE_ICON1, fps, config: { damping: 200 } });

  const iconsExitOp = interpolate(frame, [EXIT_ICONS, EXIT_ICONS + 10], [1, 0.35], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const iconDefs = [
    { icon: <EmailIcon size={44} color={COLORS.danger} frame={frame} fps={fps} />, label: painPoints[0], scale: icon1Scale },
    { icon: <ChartIcon size={44} color={COLORS.danger} progress={iconsProgress1} />, label: painPoints[1], scale: icon2Scale },
    { icon: <ClockIcon size={44} color={COLORS.danger} frame={frame} fps={fps} />, label: painPoints[2], scale: icon3Scale },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-hero.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOpacity }} />
      <AbsoluteFill style={{ background: `rgba(5,13,26,${overlayOpacity})` }} />
      <AbsoluteFill style={{ background: `linear-gradient(to right, rgba(239,68,68,0.18), transparent)`, opacity: bgOpacity }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 140px', gap: 40, overflow: 'hidden' }}>
        {/* Tag badge */}
        <div style={{
          opacity: tagOp, display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 100, padding: '8px 20px', width: 'fit-content',
        }}>
          <div style={{ width: 8, height: 8, background: COLORS.danger, borderRadius: '50%' }} />
          <span style={{ fontSize: 22, color: COLORS.danger, fontFamily: FONT, fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Sound familiar?
          </span>
        </div>

        {/* Headline — from props */}
        <div style={{ opacity: headlineOp, transform: `translateY(${headlineY}px)`, overflow: 'hidden' }}>
          <div style={{ fontSize: 88, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-2.5px', maxWidth: 1000 }}>
            {headline}
          </div>
        </div>

        {/* Subtitle — from props */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)` }}>
          <div style={{ fontSize: 30, color: 'rgba(148,163,184,0.9)', fontFamily: FONT, fontWeight: '400', maxWidth: 680, lineHeight: 1.5 }}>
            {sub}
          </div>
        </div>

        {/* Pain point icons — labels from props */}
        <div style={{ display: 'flex', gap: 28, marginTop: 8, opacity: iconsExitOp }}>
          {iconDefs.map(({ icon, label, scale }) => (
            <div key={label} style={{
              transform: `scale(${scale})`,
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
              borderRadius: 14, padding: '14px 24px',
            }}>
              {icon}
              <span style={{ fontSize: 24, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene1.mp3')} />
    </AbsoluteFill>
  );
};
```

**Step 2: TypeScript check + commit**
```bash
cd agentforge-video && npx tsc --noEmit
cd .. && git add agentforge-video/src/scenes/Scene1Pain.tsx
git commit -m "feat(remotion): Scene1Pain reads headline/sub/painPoints from props"
```

---

## Task 11: Scene2Chaos — dynamic inbox items + punchWords

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/scenes/Scene2Chaos.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/scenes/Scene2Chaos.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';
import type { SceneChaosProps } from '../types';

const EmailRow: React.FC<{ subject: string; from: string; time: string; delay: number; urgent?: boolean }> = ({
  subject, from, time, delay, urgent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const x       = interpolate(progress, [0, 1], [-300, 0]);
  const opacity = interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{
      transform: `translateX(${x}px)`, opacity,
      background: urgent ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12, padding: '16px 22px',
      display: 'flex', alignItems: 'center', gap: 14, overflow: 'hidden',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: urgent ? COLORS.danger : COLORS.accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, color: COLORS.white, fontFamily: FONT, fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{subject}</div>
        <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, marginTop: 2 }}>{from}</div>
      </div>
      <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, flexShrink: 0 }}>{time}</div>
      {urgent && <div style={{ background: COLORS.danger, borderRadius: 6, padding: '2px 10px', fontSize: 16, color: '#fff', fontFamily: FONT, fontWeight: '700', flexShrink: 0 }}>URGENT</div>}
    </div>
  );
};

export const Scene2Chaos: React.FC<SceneChaosProps> = ({ items, punchWords }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_HEADER = 0;
  const CUE_EMAIL1 = dur * 0.04;
  const CUE_EMAIL2 = dur * 0.17;
  const CUE_EMAIL3 = dur * 0.29;
  const CUE_EMAIL4 = dur * 0.40;
  const INBOX_DIM  = dur * 0.50;
  const CUE_TEXT1  = dur * 0.52;
  const CUE_TEXT2  = dur * 0.61;
  const CUE_EVERY  = dur * 0.68;
  const CUE_SINGLE = dur * 0.76;
  const CUE_DAY    = dur * 0.83;

  const headerOp = interpolate(frame, [CUE_HEADER, CUE_HEADER + 18], [0, 1], { extrapolateRight: 'clamp' });
  const headerY  = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [30, 0]);
  const badgeCount = Math.min(Math.floor(frame / 5), 63);
  const inboxDimOp = interpolate(frame, [INBOX_DIM, INBOX_DIM + 20], [1, 0.25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const textEntry = (cue: number) => ({
    op: interpolate(frame - cue, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    y:  interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [30, 0]),
  });

  const t1 = textEntry(CUE_TEXT1);
  const t2 = textEntry(CUE_TEXT2);
  const tE = textEntry(CUE_EVERY);
  const tS = textEntry(CUE_SINGLE);
  const tD = textEntry(CUE_DAY);

  const emailDelays = [CUE_EMAIL1, CUE_EMAIL2, CUE_EMAIL3, CUE_EMAIL4];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 25% 50%, rgba(239,68,68,0.07) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', padding: '60px 100px', gap: 70, alignItems: 'center', overflow: 'hidden' }}>
        {/* Left: inbox */}
        <div style={{ width: 820, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', opacity: inboxDimOp }}>
          <div style={{ opacity: headerOp, transform: `translateY(${headerY}px)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>INBOX</div>
            <div style={{ background: COLORS.danger, borderRadius: 100, padding: '4px 14px', fontSize: 22, color: '#fff', fontFamily: FONT, fontWeight: '800', minWidth: 44, textAlign: 'center' }}>
              {badgeCount}
            </div>
          </div>
          {items.slice(0, 4).map((e, i) => (
            <EmailRow key={i} subject={e.subject} from={e.from} time={e.time} urgent={e.urgent} delay={emailDelays[i]} />
          ))}
        </div>

        {/* Right: punchWords + Every. Single. Day. */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, overflow: 'hidden' }}>
          <div style={{ opacity: t1.op, transform: `translateY(${t1.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 60, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-1.5px' }}>{punchWords[0]}</div>
          </div>
          <div style={{ opacity: t2.op, transform: `translateY(${t2.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 60, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.1, letterSpacing: '-1.5px' }}>{punchWords[1]}</div>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', margin: '4px 0', opacity: t2.op }} />
          <div style={{ opacity: tE.op, transform: `translateY(${tE.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Every.</div>
          </div>
          <div style={{ opacity: tS.op, transform: `translateY(${tS.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Single.</div>
          </div>
          <div style={{ opacity: tD.op, transform: `translateY(${tD.y}px)`, overflow: 'hidden' }}>
            <div style={{ fontSize: 78, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1, letterSpacing: '-2px' }}>Day.</div>
          </div>
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene2.mp3')} />
    </AbsoluteFill>
  );
};
```

**Step 2: TypeScript check + commit**
```bash
cd agentforge-video && npx tsc --noEmit
cd .. && git add agentforge-video/src/scenes/Scene2Chaos.tsx
git commit -m "feat(remotion): Scene2Chaos reads dynamic inbox items and punchWords"
```

---

## Task 12: Scene3Cost — dynamic intro + counting stats

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/scenes/Scene3Cost.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/scenes/Scene3Cost.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';
import type { SceneCostProps } from '../types';

const BigStat: React.FC<{
  value: number; unit: string; label: string; cue: number; exitStart: number;
}> = ({ value, unit, label, cue, exitStart }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const countDuration = dur * 0.35;
  const progress  = interpolate(frame - cue, [0, countDuration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const displayed = Math.round(progress * value);

  const scaleIn  = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const entryOp  = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOp   = interpolate(frame, [exitStart, exitStart + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitScale = interpolate(frame, [exitStart, exitStart + 18], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: (t) => t * t,
  });

  return (
    <div style={{ opacity: entryOp * exitOp, transform: `scale(${scaleIn * exitScale})`, textAlign: 'center', overflow: 'hidden' }}>
      <div style={{ fontSize: 130, fontWeight: '800', color: COLORS.danger, fontFamily: FONT, lineHeight: 1, letterSpacing: '-4px' }}>
        {displayed.toLocaleString()}{unit}
      </div>
      <div style={{ fontSize: 28, color: COLORS.gray, fontFamily: FONT, fontWeight: '500', marginTop: 10, letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  );
};

export const Scene3Cost: React.FC<SceneCostProps> = ({ intro, stat1, stat2 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_TITLE  = 0;
  const CUE_STAT1  = dur * 0.08;
  const CUE_STAT2  = dur * 0.28;
  const EXIT_STATS = dur * 0.68;
  const CUE_GONE   = dur * 0.78;

  const titleOp      = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY       = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [40, 0]);
  const titleExitOp  = interpolate(frame, [EXIT_STATS, EXIT_STATS + 15], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dividerOp    = interpolate(frame - CUE_STAT1, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dividerExitOp = interpolate(frame, [EXIT_STATS, EXIT_STATS + 18], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const goneScale    = spring({ frame: frame - CUE_GONE, fps, config: { damping: 8, stiffness: 160 } });
  const goneOp       = interpolate(frame - CUE_GONE, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(239,68,68,0.14) 0%, transparent 65%)' }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 140px', gap: 56, overflow: 'hidden' }}>
        {/* Intro text — from props */}
        <div style={{ opacity: Math.min(titleOp, titleExitOp), transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
          <div style={{ fontSize: 36, color: COLORS.gray, fontFamily: FONT, fontWeight: '500', letterSpacing: '1px' }}>
            {intro}
          </div>
        </div>

        {/* Two counting stats — from props */}
        <div style={{ display: 'flex', gap: 100, alignItems: 'center', opacity: dividerOp * dividerExitOp }}>
          <BigStat value={stat1.value} unit={stat1.unit} label={stat1.label} cue={CUE_STAT1} exitStart={EXIT_STATS} />
          <div style={{ width: 1, height: 140, background: 'rgba(255,255,255,0.1)' }} />
          <BigStat value={stat2.value} unit={stat2.unit} label={stat2.label} cue={CUE_STAT2} exitStart={EXIT_STATS} />
        </div>

        {/* "Gone." — universal, always works */}
        <div style={{ opacity: goneOp, transform: `scale(${goneScale})`, fontSize: 128, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-4px', position: 'absolute' as const }}>
          Gone.
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene3.mp3')} />
    </AbsoluteFill>
  );
};
```

**Step 2: TypeScript check + commit**
```bash
cd agentforge-video && npx tsc --noEmit
cd .. && git add agentforge-video/src/scenes/Scene3Cost.tsx
git commit -m "feat(remotion): Scene3Cost reads dynamic intro and stat values from props"
```

---

## Task 13: Scene4Logo — dynamic brandName + tagline

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/scenes/Scene4Logo.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/scenes/Scene4Logo.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';

interface Scene4LogoProps {
  brandName: string
  tagline:   string
}

export const Scene4Logo: React.FC<Scene4LogoProps> = ({ brandName, tagline }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_ICON    = dur * 0.12;
  const CUE_NAME    = dur * 0.30;
  const CUE_TAGLINE = dur * 0.52;

  const glowProgress = interpolate(frame, [0, dur * 0.8], [0, 1], { extrapolateRight: 'clamp' });

  const iconScale = spring({ frame: frame - CUE_ICON, fps, config: { damping: 12, stiffness: 120 } });
  const iconOp    = interpolate(frame - CUE_ICON, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const nameProgress = spring({ frame: frame - CUE_NAME, fps, config: { damping: 14, stiffness: 140 } });
  const nameY  = interpolate(nameProgress, [0, 1], [30, 0]);
  const nameOp = interpolate(frame - CUE_NAME, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const taglineOp = interpolate(frame - CUE_TAGLINE, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const taglineY  = interpolate(spring({ frame: frame - CUE_TAGLINE, fps, config: { damping: 14 } }), [0, 1], [20, 0]);

  const ring1   = interpolate(frame % (fps * 2), [0, fps * 2], [0.7, 2.0]);
  const ring1Op = interpolate(frame % (fps * 2), [0, fps * 0.4, fps * 2], [0.5, 0.2, 0]);
  const ring2   = interpolate((frame + fps) % (fps * 2), [0, fps * 2], [0.7, 2.0]);
  const ring2Op = interpolate((frame + fps) % (fps * 2), [0, fps * 0.4, fps * 2], [0.5, 0.2, 0]);

  // Split brand name: last word gets accent colour
  const words    = brandName.trim().split(/\s+/);
  const lastWord = words.length > 1 ? words.pop()! : brandName;
  const firstPart = words.join(' ');

  // Scale font size to fit long brand names
  const fontSize = brandName.length > 14 ? 72 : brandName.length > 10 ? 86 : 100;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${glowProgress * 0.28}) 0%, transparent 55%)` }} />

      {/* Pulsing rings */}
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 260, height: 260, border: `1.5px solid rgba(59,130,246,${ring1Op * glowProgress})`, borderRadius: '50%', transform: `scale(${ring1})` }} />
        <div style={{ position: 'absolute', width: 260, height: 260, border: `1.5px solid rgba(59,130,246,${ring2Op * glowProgress})`, borderRadius: '50%', transform: `scale(${ring2})` }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, overflow: 'hidden' }}>
        {/* Icon */}
        <div style={{
          opacity: iconOp, transform: `scale(${iconScale})`,
          width: 110, height: 110,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
          borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 80px rgba(59,130,246,${glowProgress * 0.55}), 0 0 30px rgba(59,130,246,0.3)`,
        }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <path d="M28 8L42 22H34V40H22V22H14L28 8Z" fill="white" />
            <circle cx="28" cy="44" r="4" fill="white" opacity="0.6" />
          </svg>
        </div>

        {/* Brand name — last word in accent colour */}
        <div style={{ opacity: nameOp, transform: `translateY(${nameY}px)` }}>
          <div style={{ fontSize, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-3px', lineHeight: 1 }}>
            {firstPart && <span>{firstPart}</span>}
            <span style={{ color: COLORS.accent }}>{lastWord}</span>
          </div>
        </div>

        {/* Tagline — from props */}
        <div style={{ opacity: taglineOp, transform: `translateY(${taglineY}px)` }}>
          <div style={{ fontSize: 28, color: COLORS.gray, fontFamily: FONT, fontWeight: '400', letterSpacing: '3px', textTransform: 'uppercase' }}>
            {tagline}
          </div>
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene4.mp3')} />
    </AbsoluteFill>
  );
};
```

**Step 2: TypeScript check + commit**
```bash
cd agentforge-video && npx tsc --noEmit
cd .. && git add agentforge-video/src/scenes/Scene4Logo.tsx
git commit -m "feat(remotion): Scene4Logo reads dynamic brandName and tagline from props"
```

---

## Task 14: Scene5Solution — dynamic headlines + features

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/scenes/Scene5Solution.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/scenes/Scene5Solution.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';
import { CheckIcon } from '../icons';
import type { SceneSolutionProps } from '../types';

const AgentCard: React.FC<{
  icon: string; title: string; status: string; detail: string; cue: number; exitGlowStart: number;
}> = ({ icon, title, status, detail, cue, exitGlowStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress      = spring({ frame: frame - cue, fps, config: { damping: 200 } });
  const y             = interpolate(progress, [0, 1], [30, 0]);
  const opacity       = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dotPulse      = interpolate(frame % 50, [0, 25, 50], [0.7, 1, 0.7]);
  const checkProgress = interpolate(frame - cue - 15, [0, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowPulse     = interpolate(frame - exitGlowStart, [0, 12, 24], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity, transform: `translateY(${y}px)`,
      background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: 14, padding: '18px 24px',
      display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden',
      boxShadow: `0 0 ${glowPulse * 30}px rgba(34,197,94,${glowPulse})`,
    }}>
      <div style={{ fontSize: 34, flexShrink: 0, width: 44, textAlign: 'center' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: '700', color: COLORS.white, fontFamily: FONT, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: 19, color: COLORS.gray, fontFamily: FONT, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{detail}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <CheckIcon size={22} color="#22c55e" progress={checkProgress} />
        <div style={{ fontSize: 18, color: '#22c55e', fontFamily: FONT, fontWeight: '600', whiteSpace: 'nowrap' }}>{status}</div>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', transform: `scale(${dotPulse})`, boxShadow: '0 0 6px #22c55e', marginLeft: 4 }} />
      </div>
    </div>
  );
};

interface Scene5SolutionFullProps extends SceneSolutionProps {
  brandName: string
}

export const Scene5Solution: React.FC<Scene5SolutionFullProps> = ({
  headlineLines, sub, features,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_H1     = 0;
  const CUE_H2     = dur * 0.12;
  const CUE_H3     = dur * 0.24;
  const CUE_H4     = dur * 0.36;
  const CUE_SUB    = dur * 0.44;
  const CUE_HEADER = dur * 0.50;
  const CUE_CARD1  = dur * 0.54;
  const CUE_CARD2  = dur * 0.64;
  const CUE_CARD3  = dur * 0.74;
  const EXIT_GLOW  = dur * 0.90;

  const bgOp = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });

  const lineCues = [CUE_H1, CUE_H2, CUE_H3, CUE_H4];
  const subOp        = interpolate(frame - CUE_SUB, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dashHeaderOp = interpolate(frame - CUE_HEADER, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardCues = [CUE_CARD1, CUE_CARD2, CUE_CARD3];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-solution.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOp * 0.35 }} />
      <AbsoluteFill style={{ background: 'rgba(5,13,26,0.82)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 75% 30%, rgba(59,130,246,0.13) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', padding: '50px 100px', gap: 70, alignItems: 'center', overflow: 'hidden' }}>
        {/* Left: staggered headline lines */}
        <div style={{ width: 520, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden', flexShrink: 0 }}>
          {headlineLines.map((text, idx) => {
            const cue    = lineCues[idx];
            const isLast = idx === headlineLines.length - 1;
            const op = interpolate(frame - cue, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const y  = interpolate(spring({ frame: frame - cue, fps, config: { damping: 200 } }), [0, 1], [25, 0]);
            return (
              <div key={idx} style={{ opacity: op, transform: `translateY(${y}px)`, overflow: 'hidden' }}>
                <div style={{ fontSize: 58, fontWeight: '800', color: isLast ? COLORS.accent : COLORS.white, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-1.5px' }}>
                  {text}
                </div>
              </div>
            );
          })}
          <div style={{ opacity: subOp, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ fontSize: 24, color: COLORS.gray, fontFamily: FONT, lineHeight: 1.6, maxWidth: 480 }}>
              {sub}
            </div>
          </div>
        </div>

        {/* Right: feature cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          <div style={{ opacity: dashHeaderOp, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <div style={{ fontSize: 16, color: COLORS.gray, fontFamily: FONT, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>Live Dashboard</div>
          </div>
          {features.slice(0, 3).map((f, i) => (
            <AgentCard key={i} icon={f.icon} title={f.title} detail={f.detail} status={f.status} cue={cardCues[i]} exitGlowStart={EXIT_GLOW} />
          ))}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene5.mp3')} />
    </AbsoluteFill>
  );
};
```

**Step 2: TypeScript check + commit**
```bash
cd agentforge-video && npx tsc --noEmit
cd .. && git add agentforge-video/src/scenes/Scene5Solution.tsx
git commit -m "feat(remotion): Scene5Solution reads dynamic headlines and feature cards"
```

---

## Task 15: Scene6Stats — dynamic stat cards

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/scenes/Scene6Stats.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/scenes/Scene6Stats.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS } from '../constants';
import { FONT } from '../font';
import { ArrowUpIcon, ClockIcon, BrainIcon } from '../icons';
import type { SceneStatsProps } from '../types';

const CARD_ICONS = [
  (frame: number, fps: number) => <ClockIcon size={44} color={COLORS.accent} frame={frame} fps={fps} />,
  (frame: number, fps: number) => <BrainIcon size={44} color={COLORS.accent} frame={frame} fps={fps} />,
  (frame: number, _fps: number, progress: number) => <ArrowUpIcon size={44} color={COLORS.accent} progress={progress} />,
];

const StatCard: React.FC<{
  value: string; label: string; sub: string;
  icon: React.ReactNode; cue: number; glowStart: number;
}> = ({ value, label, sub, icon, cue, glowStart }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const scale     = spring({ frame: frame - cue, fps, config: { damping: 14, stiffness: 140 } });
  const opacity   = interpolate(frame - cue, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lineW     = interpolate(frame - cue - 15, [0, dur * 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowPulse = interpolate(frame - glowStart, [0, 15, 30], [0, 0.5, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      opacity, transform: `scale(${scale})`,
      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
      borderRadius: 20, padding: '44px 52px', flex: 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, overflow: 'hidden',
      boxShadow: `0 0 ${glowPulse * 60}px rgba(59,130,246,${glowPulse})`,
    }}>
      <div style={{ marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 100, fontWeight: '800', color: COLORS.accent, fontFamily: FONT, lineHeight: 1, letterSpacing: '-3px' }}>{value}</div>
      <div style={{ width: `${lineW * 60}px`, height: 2, background: COLORS.accent, borderRadius: 2, opacity: 0.5 }} />
      <div style={{ fontSize: 30, fontWeight: '700', color: COLORS.white, fontFamily: FONT, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 22, color: COLORS.gray, fontFamily: FONT, textAlign: 'center' }}>{sub}</div>
    </div>
  );
};

export const Scene6Stats: React.FC<SceneStatsProps> = ({ title, sub, stats }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_TITLE  = 0;
  const CUE_SUB    = dur * 0.08;
  const CUE_CARD1  = dur * 0.15;
  const CUE_CARD2  = dur * 0.32;
  const CUE_CARD3  = dur * 0.49;
  const GLOW_START = dur * 0.85;

  const titleOp  = interpolate(frame - CUE_TITLE, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const titleY   = interpolate(spring({ frame, fps, config: { damping: 200 } }), [0, 1], [35, 0]);
  const subOp    = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const progress1 = interpolate(frame - CUE_CARD1, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cardCues = [CUE_CARD1, CUE_CARD2, CUE_CARD3];
  const icons = [
    CARD_ICONS[0](frame, fps, 0),
    CARD_ICONS[1](frame, fps, 0),
    CARD_ICONS[2](frame, fps, progress1),
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 15%, rgba(59,130,246,0.18) 0%, transparent 55%)' }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 120px', gap: 48, overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
            <div style={{ fontSize: 58, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              {title}
            </div>
          </div>
          <div style={{ opacity: subOp, marginTop: 10 }}>
            <div style={{ fontSize: 26, color: COLORS.gray, fontFamily: FONT, fontWeight: '400' }}>{sub}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 32, width: '100%', overflow: 'hidden' }}>
          {stats.slice(0, 3).map((s, i) => (
            <StatCard key={i} value={s.value} label={s.label} sub={s.sub} icon={icons[i]} cue={cardCues[i]} glowStart={GLOW_START} />
          ))}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene6.mp3')} />
    </AbsoluteFill>
  );
};
```

**Step 2: TypeScript check + commit**
```bash
cd agentforge-video && npx tsc --noEmit
cd .. && git add agentforge-video/src/scenes/Scene6Stats.tsx
git commit -m "feat(remotion): Scene6Stats reads dynamic title/sub/stats from props"
```

---

## Task 16: Scene7CTA — dynamic brand + CTA text + URL

> **Invoke `remotion-best-practices` skill before this task.**

**Files:**
- Modify: `agentforge-video/src/scenes/Scene7CTA.tsx`

**Step 1: Replace the entire file**

```typescript
// agentforge-video/src/scenes/Scene7CTA.tsx
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Img, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { COLORS, WIDTH, HEIGHT } from '../constants';
import { FONT } from '../font';
import type { SceneCTAProps } from '../types';

interface Scene7CTAFullProps extends SceneCTAProps {
  brandName: string
  ctaText:   string
  ctaUrl:    string
}

export const Scene7CTA: React.FC<Scene7CTAFullProps> = ({
  brandName, ctaText, ctaUrl, headline, accentLine, sub,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();

  const CUE_LOGO    = dur * 0.02;
  const CUE_LINE1   = dur * 0.12;
  const CUE_LINE2   = dur * 0.28;
  const CUE_SUB     = dur * 0.42;
  const CUE_CTA     = dur * 0.54;
  const CUE_URL     = dur * 0.66;
  const FINAL_PULSE = dur * 0.88;

  const bgOp         = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  const glowProgress = interpolate(frame, [0, dur * 0.7], [0, 1], { extrapolateRight: 'clamp' });

  const logoScale = spring({ frame: frame - CUE_LOGO, fps, config: { damping: 200 } });
  const logoOp    = interpolate(frame - CUE_LOGO, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const line1Op = interpolate(frame - CUE_LINE1, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line1Y  = interpolate(spring({ frame: frame - CUE_LINE1, fps, config: { damping: 200 } }), [0, 1], [35, 0]);
  const line2Op = interpolate(frame - CUE_LINE2, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const line2Y  = interpolate(spring({ frame: frame - CUE_LINE2, fps, config: { damping: 200 } }), [0, 1], [30, 0]);
  const subOp   = interpolate(frame - CUE_SUB, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subY    = interpolate(spring({ frame: frame - CUE_SUB, fps, config: { damping: 200 } }), [0, 1], [25, 0]);

  const ctaScale = spring({ frame: frame - CUE_CTA, fps, config: { damping: 14, stiffness: 160 } });
  const ctaOp   = interpolate(frame - CUE_CTA, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const btnIdle  = interpolate(Math.max(0, frame - CUE_CTA - 30) % (fps * 2.2), [0, fps * 1.1, fps * 2.2], [1, 1.04, 1]);
  const finalPulse = interpolate(frame - FINAL_PULSE, [0, 8, 16], [1, 1.06, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const btnPulse = Math.max(btnIdle, finalPulse);

  const urlOp = interpolate(frame - CUE_URL, [0, 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Split brand name: last word in accent colour
  const words    = brandName.trim().split(/\s+/);
  const lastWord = words.length > 1 ? words.pop()! : brandName;
  const firstPart = words.join(' ');
  const nameFontSize = brandName.length > 14 ? 42 : brandName.length > 10 ? 48 : 56;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <Img src={staticFile('images/bg-cta.png')} style={{ width: WIDTH, height: HEIGHT, objectFit: 'cover', opacity: bgOp * 0.22 }} />
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.82)' }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, rgba(59,130,246,${glowProgress * 0.22}) 0%, transparent 60%)` }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 120px', gap: 32, overflow: 'hidden' }}>
        {/* Brand logo mark + name */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: 64, height: 64,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px rgba(59,130,246,${glowProgress * 0.45})`,
          }}>
            <svg width="34" height="34" viewBox="0 0 56 56" fill="none">
              <path d="M28 8L42 22H34V40H22V22H14L28 8Z" fill="white" />
              <circle cx="28" cy="44" r="4" fill="white" opacity="0.6" />
            </svg>
          </div>
          <div style={{ fontSize: nameFontSize, fontWeight: '800', color: COLORS.white, fontFamily: FONT, letterSpacing: '-2px', lineHeight: 1 }}>
            {firstPart && <span>{firstPart} </span>}
            <span style={{ color: COLORS.accent }}>{lastWord}</span>
          </div>
        </div>

        {/* Headline line 1 */}
        <div style={{ opacity: line1Op, transform: `translateY(${line1Y}px)`, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 80, fontWeight: '800', color: COLORS.white, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-2.5px', maxWidth: 1300 }}>
            {headline}
          </div>
        </div>

        {/* Headline line 2 — accent */}
        <div style={{ opacity: line2Op, transform: `translateY(${line2Y}px)`, textAlign: 'center', overflow: 'hidden', marginTop: -18 }}>
          <div style={{ fontSize: 80, fontWeight: '800', color: COLORS.accent, fontFamily: FONT, lineHeight: 1.15, letterSpacing: '-2.5px' }}>
            {accentLine}
          </div>
        </div>

        {/* Sub text */}
        <div style={{ opacity: subOp, transform: `translateY(${subY}px)`, textAlign: 'center', overflow: 'hidden' }}>
          <div style={{ fontSize: 32, color: COLORS.gray, fontFamily: FONT, fontWeight: '400' }}>{sub}</div>
        </div>

        {/* CTA button */}
        <div style={{
          opacity: ctaOp, transform: `scale(${ctaScale * btnPulse})`,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.cyan})`,
          borderRadius: 16, padding: '26px 80px',
          fontSize: 38, fontWeight: '700', color: '#fff', fontFamily: FONT,
          boxShadow: `0 0 70px rgba(59,130,246,${glowProgress * 0.45})`,
          letterSpacing: '-0.5px', whiteSpace: 'nowrap',
        }}>
          {ctaText} →
        </div>

        {/* URL */}
        <div style={{ opacity: urlOp, fontSize: 26, color: 'rgba(148,163,184,0.7)', fontFamily: FONT, letterSpacing: '1.5px' }}>
          {ctaUrl}
        </div>
      </AbsoluteFill>

      <Audio src={staticFile('audio/voiceover/scene7.mp3')} />
    </AbsoluteFill>
  );
};
```

**Step 2: TypeScript check + commit**
```bash
cd agentforge-video && npx tsc --noEmit
cd .. && git add agentforge-video/src/scenes/Scene7CTA.tsx
git commit -m "feat(remotion): Scene7CTA reads dynamic brand/ctaText/ctaUrl from props"
```

---

## Task 17: Update Root.tsx defaultProps

**Files:**
- Modify: `agentforge-video/src/Root.tsx`

**Step 1: Update defaultProps to match new type**

```typescript
// agentforge-video/src/Root.tsx
import { Composition } from 'remotion';
import { AgentForgeAd } from './AgentForgeAd';
import { calculateMetadata } from './calculateMetadata';
import { FPS, WIDTH, HEIGHT } from './constants';
import type { AgentForgeAdProps } from './types';

const DEFAULT_SCENE_DURATIONS = [210, 270, 180, 90, 360, 330, 240];

const DEFAULT_PROPS: AgentForgeAdProps = {
  sceneDurations: DEFAULT_SCENE_DURATIONS,
  brandName: 'YourBrand',
  tagline:   'Your Tagline Here',
  ctaText:   'Get Started',
  ctaUrl:    'yourdomain.com',
  scenes: [
    { voiceover: '', headline: 'Your team is drowning in busywork.', sub: 'Every day your best people waste hours on tasks that don\'t grow the business.', painPoints: ['Manual work', 'Data entry', 'Missed follow-ups'] },
    { voiceover: '', items: [{ subject: 'Invoice overdue — action required', from: 'billing@vendor.io', time: '09:14', urgent: true }, { subject: 'Report still not updated', from: 'ops@company.com', time: '10:32', urgent: false }, { subject: 'Client follow-up (3rd attempt)', from: 'client@bigco.com', time: '11:15', urgent: true }, { subject: 'Data entry backlog piling up', from: 'admin@company.com', time: '14:22', urgent: false }], punchWords: ['Emails.', 'Reports.', 'Follow-ups.'] },
    { voiceover: '', intro: "That's what your business wastes every year", stat1: { value: 25, unit: '+hrs', label: 'wasted per week' }, stat2: { value: 32000, unit: '€', label: 'lost per year' } },
    { voiceover: '' },
    { voiceover: '', headlineLines: ['We build', 'custom AI tools', 'that handle it all.', 'Automatically.'], sub: 'No setup. No learning curve. Fully managed.', features: [{ icon: '📧', title: 'AI Email Manager', detail: 'Auto-sorted, drafted & sent', status: '47 handled' }, { icon: '📊', title: 'AI Data Assistant', detail: 'Updated in real-time, zero entry', status: 'Synced live' }, { icon: '🔔', title: 'AI Follow-Up Agent', detail: 'No lead ever forgotten again', status: '12 sent today' }] },
    { voiceover: '', title: 'Average results after 30 days', sub: 'Across 50+ business clients', stats: [{ value: '28hrs', label: 'Saved per week', sub: 'Per team average' }, { value: '5 days', label: 'To go live', sub: 'From first call' }, { value: '$5.6K', label: 'Monthly ROI', sub: 'Average return' }] },
    { voiceover: '', headline: 'Stop paying people to do what', accentLine: 'AI does better.', sub: 'Book your free 15-minute call today.' },
  ],
};

export const RemotionRoot = () => (
  <Composition
    id="AgentForgeAd"
    component={AgentForgeAd}
    durationInFrames={DEFAULT_SCENE_DURATIONS.reduce((s, d) => s + d, 0) - 6 * 15}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={calculateMetadata}
  />
);
```

**Step 2: Full TypeScript check — must be zero errors**
```bash
cd agentforge-video && npx tsc --noEmit
```
Expected: **zero errors**. Fix any remaining type issues before continuing.

**Step 3: Commit**
```bash
cd .. && git add agentforge-video/src/Root.tsx
git commit -m "feat(remotion): update Root defaultProps to full dynamic schema"
```

---

## Task 18: Deploy to VPS

**Step 1: Push all commits**
```bash
git push origin main
```

**Step 2: On the VPS — pull, install openai, rebuild**
```bash
cd /path/to/worker
git pull
npm install                # picks up new openai dependency
npm run build              # tsc compile
pm2 restart all            # or: systemctl restart agentforge-worker
```

**Step 3: Verify worker started cleanly**
```bash
pm2 logs --lines 20
```
Expected: no errors, `Worker API on :3001` message.

---

## Task 19: End-to-End Test

**Step 1: Submit a URL test**
From the frontend (`video-forge-sable.vercel.app`):
- Input type: URL
- URL: `https://stripe.com` (well-known, easy to scrape)
- Submit

**Step 2: Watch pipeline progress**
Check Supabase videos table:
```sql
SELECT status, progress, current_step FROM videos ORDER BY created_at DESC LIMIT 1;
```
Should progress: 5% → 15% → 25% → 45% → 60% → 85% → 100%

**Step 3: Verify the output video**
- Brand name should be "Stripe" (or similar), NOT "AgentForge"
- Scene 4 logo should show "Stripe" brand name
- Scene 7 CTA URL should be "stripe.com"
- Scene 3 stats should be relevant to payment processing, NOT "25hrs wasted"
- No hardcoded "AgentForge" text visible anywhere

**Step 4: Submit a prompt test**
- Input type: prompt
- Text: `"Make an ad for a dentist clinic called SmilePro that helps patients book appointments online"`
- Verify video shows dental-specific copy

---

## Success Criteria

- [ ] Stripe URL → video shows "Stripe" brand, payment-related pain points, stripe.com CTA
- [ ] Dental prompt → video shows dental-specific copy and stats
- [ ] Zero occurrences of "AgentForge" in any generated video
- [ ] `npx tsc --noEmit` in both `apps/worker` and `agentforge-video` returns zero errors
- [ ] Video renders in under 5 minutes end-to-end
