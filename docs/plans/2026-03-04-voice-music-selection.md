# Voice & Music Selection — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Settings step (Step 3) to the video creation wizard so users can choose a voiceover voice (Off / Auto / specific) and background music track (Auto / mood category), with ▶ preview buttons for both.

**Architecture:** Remotion types gain `hasVoiceover: boolean`; worker TTS accepts `voiceId` and skips when null; render.ts downloads the selected SoundHelix track before rendering; the web wizard gains a new Step 3 with voice card grid and music category tabs; a Next.js API route proxies ElevenLabs voice list server-side.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Remotion 4, ElevenLabs API, SoundHelix CC0 music, Axios, BullMQ

---

## Task 1: Add `hasVoiceover` to Remotion types

**Files:**
- Modify: `agentforge-video/src/types.ts:138-148`

**Step 1: Edit AgentForgeAdProps**

Replace the `AgentForgeAdProps` type (lines 139–148) with:

```ts
export type AgentForgeAdProps = {
  sceneDurations: number[];
  brandName:      string;
  tagline:        string;
  ctaText:        string;
  ctaUrl:         string;
  accentColor:    string;
  aspectRatio:    '16:9' | '9:16';
  hasVoiceover:   boolean;   // false → skip per-scene Audio tags
  scenes:         SceneConfig[];
};
```

**Step 2: TypeScript check**

Run: `cd agentforge-video && npx tsc --noEmit`
Expected: errors about `hasVoiceover` not passed in calculateMetadata.ts and AgentForgeAd.tsx — **that is expected** and will be fixed in the next two tasks.

**Step 3: Commit**

```bash
git add agentforge-video/src/types.ts
git commit -m "feat(remotion): add hasVoiceover to AgentForgeAdProps"
```

---

## Task 2: Update `calculateMetadata.ts` — fallback duration when no audio

**Files:**
- Modify: `agentforge-video/src/calculateMetadata.ts`

**Step 1: Rewrite the file**

```ts
// agentforge-video/src/calculateMetadata.ts
import { CalculateMetadataFunction, staticFile } from 'remotion';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { FPS, TRANSITION_FRAMES } from './constants';
import type { AgentForgeAdProps } from './types';

const PADDING_FRAMES    = 25;
const FALLBACK_FRAMES   = 180; // 6 s @ 30 fps — used when hasVoiceover=false

export const calculateMetadata: CalculateMetadataFunction<AgentForgeAdProps> = async ({ props }) => {
  const sceneCount = props.scenes.length;

  let sceneDurations: number[];

  if (props.hasVoiceover) {
    const files = Array.from({ length: sceneCount }, (_, i) => `audio/voiceover/scene_${i}.mp3`);
    const durations = await Promise.all(
      files.map((f) => getAudioDurationInSeconds(staticFile(f)))
    );
    sceneDurations = durations.map((d: number) => Math.ceil(d * FPS) + PADDING_FRAMES);
  } else {
    sceneDurations = Array(sceneCount).fill(FALLBACK_FRAMES);
  }

  const totalFrames =
    sceneDurations.reduce((sum: number, d: number) => sum + d, 0) -
    (sceneCount - 1) * TRANSITION_FRAMES;

  // Dynamic canvas size from aspectRatio prop
  const isPortrait = props.aspectRatio === '9:16';
  const width  = isPortrait ? 1080 : 1920;
  const height = isPortrait ? 1920 : 1080;

  return {
    durationInFrames: Math.max(totalFrames, 30),
    width,
    height,
    props: { ...props, sceneDurations },
  };
};
```

**Step 2: TypeScript check**

Run: `cd agentforge-video && npx tsc --noEmit`
Expected: still errors about AgentForgeAd.tsx — will fix next.

**Step 3: Commit**

```bash
git add agentforge-video/src/calculateMetadata.ts
git commit -m "feat(remotion): fallback 180-frame scene duration when hasVoiceover=false"
```

---

## Task 3: Update `AgentForgeAd.tsx` — conditional voiceover Audio

**Files:**
- Modify: `agentforge-video/src/AgentForgeAd.tsx`

**Step 1: Rewrite the file**

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
  hasVoiceover,
}) => {
  // Must be inside component so useVideoConfig() receives live width/height from calculateMetadata
  const { width, height } = useVideoConfig();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TRANSITIONS: TransitionPresentation<any>[] = [
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
      {/* Background music — always present */}
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
            audioPath:  hasVoiceover ? `audio/voiceover/scene_${i}.mp3` : '',
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

**Step 2: TypeScript check — must be clean**

Run: `cd agentforge-video && npx tsc --noEmit`
Expected: **zero output** (no errors).

If there are errors, fix them before continuing.

**Step 3: Commit**

```bash
git add agentforge-video/src/AgentForgeAd.tsx
git commit -m "feat(remotion): conditionally skip voiceover Audio when hasVoiceover=false"
```

---

## Task 4: Update `tts.ts` — voiceId param, Auto logic, skip when null

**Files:**
- Modify: `apps/worker/src/jobs/tts.ts`

**Step 1: Rewrite the file**

```ts
// apps/worker/src/jobs/tts.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const MODEL_ID = 'eleven_multilingual_v2';

// Default Daniel voice
const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';

/** Pick a voice when the user selected "Auto" */
function resolveAutoVoice(language: string, businessType: string): string {
  // Language-specific voices (non-English)
  if (language === 'it') return 'XB0fDUnXU5powFXDhCwa'; // Charlotte (multilingual, works for Italian)
  // Business-type voices (English)
  if (businessType === 'b2b') return 'pNInz6obpgDQGcFmaJgB'; // Adam – authoritative narration
  if (businessType === 'b2c') return 'AZnzlk1XvdvUeBnXmlld'; // Domi – energetic
  return DEFAULT_VOICE_ID; // Daniel – balanced default
}

export async function generateVoiceovers(
  scenes: string[],
  workDir: string,
  voiceId: string | null | 'auto',
  language:     string = 'en',
  businessType: string = 'mixed',
): Promise<string[]> {
  // Off — return empty, video will use fallback frame durations
  if (voiceId === null) {
    console.log('[tts] voiceover disabled — skipping');
    return [];
  }

  const resolvedVoiceId = voiceId === 'auto'
    ? resolveAutoVoice(language, businessType)
    : voiceId;

  console.log(`[tts] using voice ${resolvedVoiceId} (requested: ${voiceId})`);

  fs.mkdirSync(path.join(workDir, 'audio'), { recursive: true });
  const paths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const outPath = path.join(workDir, 'audio', `scene${i + 1}.mp3`);
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      { text: scenes[i], model_id: MODEL_ID, voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
      {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
      }
    );
    fs.writeFileSync(outPath, Buffer.from(response.data));
    paths.push(outPath);
    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  return paths;
}
```

**Step 2: TypeScript check (worker)**

Run: `cd apps/worker && npx tsc --noEmit`
Expected: zero output. If there are errors, check that pipeline.ts still calls `generateVoiceovers` with compatible args — will fix in Task 6.

**Step 3: Commit**

```bash
git add apps/worker/src/jobs/tts.ts
git commit -m "feat(worker/tts): accept voiceId param — skip when null, Auto resolves by language+businessType"
```

---

## Task 5: Update `render.ts` — music download + hasVoiceover in props

**Files:**
- Modify: `apps/worker/src/jobs/render.ts`

**Step 1: Rewrite the file**

```ts
// apps/worker/src/jobs/render.ts
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import type { VideoScript } from '../types/script';

const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');

// ─── Music resolution ─────────────────────────────────────────────────────────

const AUTO_MUSIC_MAP: Record<string, string[]> = {
  b2b:   ['Song-3', 'Song-7', 'Song-11'],   // Corporate
  b2c:   ['Song-4', 'Song-10', 'Song-17'],  // Upbeat
  mixed: ['Song-6', 'Song-9', 'Song-12'],   // Cinematic
};

function resolveMusic(musicId: string, businessType: string): string {
  if (musicId === 'auto') {
    const tracks = AUTO_MUSIC_MAP[businessType] ?? AUTO_MUSIC_MAP.mixed;
    return tracks[Math.floor(Math.random() * tracks.length)];
  }
  return musicId; // e.g. 'Song-3'
}

async function downloadMusic(songName: string, outPath: string): Promise<void> {
  const url = `https://www.soundhelix.com/examples/mp3/SoundHelix-${songName}.mp3`;
  console.log(`[render] downloading music: ${songName}`);
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30_000 });
  fs.writeFileSync(outPath, Buffer.from(response.data));
  console.log(`[render] music downloaded → ${path.basename(outPath)}`);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio, hasVoiceover, musicId, businessType }: {
  videoId:      string;
  script:       VideoScript;
  audioPaths:   string[];
  imagePaths:   string[];
  workDir:      string;
  aspectRatio:  '16:9' | '9:16';
  hasVoiceover: boolean;
  musicId:      string;
  businessType: string;
}): Promise<string> {
  const outPath = path.join(workDir, 'output.mp4');
  fs.mkdirSync(workDir, { recursive: true });

  const remotionPublic = path.join(REMOTION_ROOT, 'public');
  fs.mkdirSync(path.join(remotionPublic, 'audio/voiceover'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'audio/music'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'images'), { recursive: true });

  // Copy voiceover audio — 0-indexed to match AgentForgeAd audioPath: `audio/voiceover/scene_${i}.mp3`
  audioPaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `audio/voiceover/scene_${i}.mp3`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Copy background images — 0-indexed to match scene components: `images/scene_${sceneIndex}.png`
  imagePaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `images/scene_${i}.png`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Download background music
  const songName = resolveMusic(musicId, businessType);
  const musicDest = path.join(remotionPublic, 'audio/music/background.mp3');
  await downloadMusic(songName, musicDest);

  // Write props to a temp file (avoids shell command-length limits)
  const propsPath = path.join(workDir, 'props.json');
  const remotionProps = {
    brandName:      script.brandName,
    tagline:        script.tagline,
    ctaText:        script.ctaText,
    ctaUrl:         script.ctaUrl,
    accentColor:    script.accentColor,
    aspectRatio,
    hasVoiceover,
    // Placeholder durations — calculateMetadata overwrites them from audio files (or uses fallback)
    sceneDurations: Array(script.scenes.length).fill(150),
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

**Step 2: TypeScript check (worker)**

Run: `cd apps/worker && npx tsc --noEmit`
Expected: errors about `renderVideo` callers not passing `hasVoiceover`, `musicId`, `businessType` — will fix in Task 6.

**Step 3: Commit**

```bash
git add apps/worker/src/jobs/render.ts
git commit -m "feat(worker/render): download selected music track; thread hasVoiceover into Remotion props"
```

---

## Task 6: Update `pipeline.ts` — thread voiceId, musicId, businessType; compute hasVoiceover

**Files:**
- Modify: `apps/worker/src/jobs/pipeline.ts:49-132`

**Step 1: Replace the `runVideoPipeline` function**

Change lines 49–132. Only the function signature and TTS/render call sites change; keep everything else identical.

Replace line 50 (the destructuring):
```ts
// OLD:
const { videoId, inputType, inputData } = job.data;
const aspectRatio:   '16:9' | '9:16' = job.data.aspectRatio   ?? '16:9';
const resourcePaths: string[]         = job.data.resourcePaths ?? [];

// NEW:
const { videoId, inputType, inputData } = job.data;
const aspectRatio:   '16:9' | '9:16' = job.data.aspectRatio   ?? '16:9';
const resourcePaths: string[]         = job.data.resourcePaths ?? [];
const voiceId:       string | null    = job.data.voiceId       ?? 'auto'; // null=Off, 'auto'=AI picks
const musicId:       string           = job.data.musicId       ?? 'auto';
```

Replace the TTS call (line 100):
```ts
// OLD:
const audioPaths = await generateVoiceovers(voiceovers, workDir);

// NEW:
const audioPaths = await generateVoiceovers(voiceovers, workDir, voiceId, language, businessType);
const hasVoiceover = audioPaths.length > 0;
```

Replace the render call (line 112):
```ts
// OLD:
const mp4Path = await renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio });

// NEW:
const mp4Path = await renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio, hasVoiceover, musicId, businessType });
```

The complete updated function (for reference — copy the full file, editing only the three points above):

```ts
export async function runVideoPipeline(job: any) {
  const { videoId, inputType, inputData } = job.data;
  const aspectRatio:   '16:9' | '9:16' = job.data.aspectRatio   ?? '16:9';
  const resourcePaths: string[]         = job.data.resourcePaths ?? [];
  const voiceId:       string | null    = job.data.voiceId       ?? 'auto';
  const musicId:       string           = job.data.musicId       ?? 'auto';
  const workDir = `/tmp/videoforge/${videoId}`;

  try {
    await updateStatus(videoId, 'processing', 5, 'Extracting content...');

    let sourceText                   = '';
    let brandImageUrl: string | null = null;
    let accentColor:   string | null = null;
    let language                     = 'en';
    let businessType                 = 'mixed';
    let scrapedImageUrls:  string[]  = [];

    if (inputType === 'url') {
      const result     = await scrapeUrl(inputData.url);
      sourceText       = result.text;
      brandImageUrl    = result.brandImageUrl;
      accentColor      = result.accentColor;
      language         = result.language;
      businessType     = result.businessType;
      scrapedImageUrls = result.imageUrls;
    } else if (inputType === 'pdf') {
      sourceText = await parsePdf(inputData.fileName);
    } else if (inputType === 'ppt') {
      sourceText = await parsePpt(inputData.fileName);
    } else {
      sourceText = inputData.text;
    }

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    const script = await generateScript(sourceText, inputType, language, businessType, accentColor);

    await updateStatus(videoId, 'processing', 22, 'Preparing assets...');

    const resourceLocalPaths = await downloadResources(resourcePaths, workDir);
    const imageUrls: string[] = [...resourceLocalPaths, ...scrapedImageUrls];

    await updateStatus(videoId, 'processing', 28, 'Recording voiceover...');

    const voiceovers = script.scenes.map((s) => s.props.voiceover);
    const audioPaths = await generateVoiceovers(voiceovers, workDir, voiceId, language, businessType);
    const hasVoiceover = audioPaths.length > 0;

    await updateStatus(videoId, 'processing', 48, 'Generating visuals...');

    const imagePaths = await generateImages(
      script.scenes, workDir, script.brandName, brandImageUrl, script.accentColor, imageUrls,
    );

    await updateStatus(videoId, 'processing', 63, 'Rendering video...');

    const mp4Path = await renderVideo({
      videoId, script, audioPaths, imagePaths, workDir,
      aspectRatio, hasVoiceover, musicId, businessType,
    });

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

**Step 2: TypeScript check (worker)**

Run: `cd apps/worker && npx tsc --noEmit`
Expected: zero output.

**Step 3: Commit**

```bash
git add apps/worker/src/jobs/pipeline.ts
git commit -m "feat(worker/pipeline): thread voiceId, musicId, businessType through pipeline; compute hasVoiceover"
```

---

## Task 7: Update `jobs.ts` — forward voiceId and musicId from request body

**Files:**
- Modify: `apps/worker/src/api/jobs.ts:8-34`

**Step 1: Edit the POST handler destructuring and job payload**

```ts
// Old line 8:
const { videoId, userId, inputType, inputData, aspectRatio, resourcePaths } = req.body;

// New line 8:
const { videoId, userId, inputType, inputData, aspectRatio, resourcePaths, voiceId, musicId } = req.body;
```

```ts
// Old job payload (lines 25–34):
const job = await videoQueue.add('generate-video', {
  videoId,
  userId,
  inputType,
  inputData,
  aspectRatio:   aspectRatio   ?? '16:9',
  resourcePaths: resourcePaths ?? [],
}, {
  attempts: 2, backoff: { type: 'exponential', delay: 5000 },
});

// New job payload:
const job = await videoQueue.add('generate-video', {
  videoId,
  userId,
  inputType,
  inputData,
  aspectRatio:   aspectRatio   ?? '16:9',
  resourcePaths: resourcePaths ?? [],
  voiceId:       voiceId       ?? 'auto',  // null = Off, 'auto' = AI picks, string = ElevenLabs voice ID
  musicId:       musicId       ?? 'auto',  // 'auto' or SoundHelix song name e.g. 'Song-3'
}, {
  attempts: 2, backoff: { type: 'exponential', delay: 5000 },
});
```

**Step 2: TypeScript check (worker)**

Run: `cd apps/worker && npx tsc --noEmit`
Expected: zero output.

**Step 3: Commit**

```bash
git add apps/worker/src/api/jobs.ts
git commit -m "feat(worker/api): forward voiceId and musicId from request body to job queue"
```

---

## Task 8: Create `/api/voices` route — server-side ElevenLabs proxy

**Files:**
- Create: `apps/web/app/api/voices/route.ts`

**Step 1: Create the file**

```ts
// apps/web/app/api/voices/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 3600; // cache for 1 hour

// Curated list of 12 diverse ElevenLabs voices
const CURATED_IDS = new Set([
  'onwK4e9ZLuTAKqWW03F9', // Daniel
  '21m00Tcm4TlvDq8ikWAM', // Rachel
  '2EiwWnXFnvU5JabPnv8n', // Clyde
  'AZnzlk1XvdvUeBnXmlld', // Domi
  'EXAVITQu4vr4xnSDxMaL', // Bella
  'ErXwobaYiN019PkySvjV', // Antoni
  'MF3mGyEYCl7XYWbV9V6O', // Elli
  'TxGEqnHWrfWFTfGW9XjX', // Josh
  'VR6AewLTigWG4xSOukaG', // Arnold
  'pNInz6obpgDQGcFmaJgB', // Adam
  'yoZ06aMxZJJ28mfd3POQ', // Sam
  'XB0fDUnXU5powFXDhCwa', // Charlotte
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const curated = searchParams.get('curated') !== 'false'; // default true

  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'ElevenLabs API error' }, { status: res.status });
  }

  const data = await res.json();
  let voices = data.voices ?? [];

  if (curated) {
    voices = voices.filter((v: { voice_id: string }) => CURATED_IDS.has(v.voice_id));
  }

  // Return only the fields the frontend needs
  const result = voices.map((v: { voice_id: string; name: string; preview_url: string }) => ({
    voice_id:    v.voice_id,
    name:        v.name,
    preview_url: v.preview_url,
  }));

  return NextResponse.json(result);
}
```

**Step 2: TypeScript check (web)**

Run: `cd apps/web && npx tsc --noEmit`
Expected: zero output.

**Step 3: Commit**

```bash
git add apps/web/app/api/voices/route.ts
git commit -m "feat(web/api): add /api/voices route — server-side ElevenLabs voice list proxy with curated filter"
```

---

## Task 9: Update `page.tsx` — 4-step wizard with Settings step

**Files:**
- Modify: `apps/web/app/(app)/videos/new/page.tsx`

This is the largest change. The full replacement file is below.

**Step 1: Rewrite the file**

```tsx
'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe, FileText, Presentation, MessageSquare,
  ArrowRight, ArrowLeft, Loader2, Upload, ImageIcon, X,
  Play, Square, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Static data ─────────────────────────────────────────────────────────────

const inputTypes = [
  { id: 'url',    label: 'Website URL',    icon: Globe,         desc: 'We scrape and extract key messages' },
  { id: 'pdf',    label: 'PDF Document',   icon: FileText,      desc: 'Brochure, proposal, report, case study' },
  { id: 'ppt',    label: 'PowerPoint',     icon: Presentation,  desc: 'Upload your existing slide deck' },
  { id: 'prompt', label: 'Text Prompt',    icon: MessageSquare, desc: 'Describe your product in plain English' },
];

const aspectRatioOptions = [
  { id: '16:9', label: '16 : 9', sub: 'Landscape', hint: 'YouTube · LinkedIn' },
  { id: '9:16', label: '9 : 16', sub: 'Portrait',  hint: 'TikTok · Reels · Stories' },
] as const;

const STEP_LABELS = ['Input Type', 'Your Content', 'Settings', 'Review'];

// Curated voice list (subset — full list fetched from /api/voices)
const CURATED_VOICES = [
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel',    preview_url: '' },
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',    preview_url: '' },
  { voice_id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde',     preview_url: '' },
  { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi',      preview_url: '' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',     preview_url: '' },
  { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',    preview_url: '' },
  { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',      preview_url: '' },
  { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',      preview_url: '' },
  { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold',    preview_url: '' },
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',      preview_url: '' },
  { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',       preview_url: '' },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', preview_url: '' },
];

const MUSIC_CATEGORIES = ['Corporate', 'Energetic', 'Cinematic', 'Calm', 'Upbeat'] as const;
const MUSIC_TRACKS: Record<string, { id: string; label: string }[]> = {
  Corporate: [{ id: 'Song-3', label: 'Song 3' }, { id: 'Song-7', label: 'Song 7' }, { id: 'Song-11', label: 'Song 11' }],
  Energetic: [{ id: 'Song-1', label: 'Song 1' }, { id: 'Song-5', label: 'Song 5' }, { id: 'Song-14', label: 'Song 14' }],
  Cinematic: [{ id: 'Song-6', label: 'Song 6' }, { id: 'Song-9', label: 'Song 9' }, { id: 'Song-12', label: 'Song 12' }],
  Calm:      [{ id: 'Song-2', label: 'Song 2' }, { id: 'Song-8', label: 'Song 8' }, { id: 'Song-15', label: 'Song 15' }],
  Upbeat:    [{ id: 'Song-4', label: 'Song 4' }, { id: 'Song-10', label: 'Song 10' }, { id: 'Song-17', label: 'Song 17' }],
};

type Voice = { voice_id: string; name: string; preview_url: string };

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewVideoPage() {
  const router  = useRouter();
  const resRef  = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Wizard state
  const [step, setStep]               = useState(1);
  const [inputType, setInputType]     = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [url, setUrl]                 = useState('');
  const [prompt, setPrompt]           = useState('');
  const [file, setFile]               = useState<File | null>(null);
  const [resources, setResources]     = useState<File[]>([]);
  const [title, setTitle]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Settings step state
  const [voiceMode, setVoiceMode]           = useState<'off' | 'auto' | 'choose'>('auto');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [voices, setVoices]                 = useState<Voice[]>(CURATED_VOICES);
  const [voicesLoading, setVoicesLoading]   = useState(false);
  const [playingId, setPlayingId]           = useState<string>('');     // voice_id or music song id currently previewing
  const [musicCategory, setMusicCategory]   = useState<string>('');     // '' = Auto
  const [selectedMusicId, setSelectedMusicId] = useState<string>('auto');

  // ── Voice preview ──────────────────────────────────────────────────────────

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingId('');
  }

  function playPreview(id: string, url: string) {
    if (playingId === id) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setPlayingId(id);
    audio.onended = () => setPlayingId('');
  }

  async function loadAllVoices() {
    setVoicesLoading(true);
    try {
      const res = await fetch('/api/voices?curated=false');
      if (res.ok) {
        const data: Voice[] = await res.json();
        setVoices(data);
      }
    } finally {
      setVoicesLoading(false);
    }
  }

  // Load preview URLs for the curated list on first render of Settings step
  async function loadCuratedPreviews() {
    if (voices[0]?.preview_url) return; // already loaded
    try {
      const res = await fetch('/api/voices?curated=true');
      if (res.ok) {
        const data: Voice[] = await res.json();
        setVoices(data);
      }
    } catch { /* silent */ }
  }

  // ── Resource upload helpers ────────────────────────────────────────────────

  function addResources(files: FileList | null) {
    if (!files) return;
    const allowed = Array.from(files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    setResources(prev => [...prev, ...allowed].slice(0, 8));
  }

  function removeResource(idx: number) {
    setResources(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Computed voiceId to send to worker ────────────────────────────────────

  function resolvedVoiceId(): string | null {
    if (voiceMode === 'off')    return null;
    if (voiceMode === 'auto')   return 'auto';
    return selectedVoiceId || 'auto'; // fallback to auto if none selected
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let inputData: Record<string, string> = {};

      if (file && (inputType === 'pdf' || inputType === 'ppt')) {
        const ext  = file.name.split('.').pop();
        const uploadPath = `${user!.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('uploads').upload(uploadPath, file);
        if (upErr) throw new Error('File upload failed: ' + upErr.message);
        inputData = { fileName: uploadPath };
      } else if (inputType === 'url') {
        inputData = { url };
      } else {
        inputData = { text: prompt };
      }

      // Upload user resource images/videos
      const resourcePaths: string[] = [];
      for (const resFile of resources) {
        const ext   = resFile.name.split('.').pop();
        const rPath = `${user!.id}/resources/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: rErr } = await supabase.storage.from('uploads').upload(rPath, resFile);
        if (!rErr) resourcePaths.push(rPath);
      }

      const { data: video, error: dbErr } = await supabase
        .from('videos')
        .insert({ title: title || `Video ${new Date().toLocaleDateString()}`, input_type: inputType, input_data: inputData, user_id: user!.id })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);

      const res = await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_WORKER_API_KEY! },
        body: JSON.stringify({
          videoId: video.id,
          userId:  user!.id,
          inputType,
          inputData,
          aspectRatio,
          resourcePaths,
          voiceId: resolvedVoiceId(),
          musicId: selectedMusicId,
        }),
      });

      if (!res.ok) {
        await supabase.from('videos').delete().eq('id', video.id);
        const body = await res.json().catch(() => ({}));
        throw new Error(
          res.status === 402
            ? 'Insufficient credits. Please upgrade your plan.'
            : body.error ?? `Worker error (${res.status})`
        );
      }

      router.push(`/videos/${video.id}`);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8 border-b border-film-border pb-6">
        <span className="section-label mb-2 block">Production</span>
        <h1 className="font-display text-4xl tracking-wider text-film-cream">CREATE NEW VIDEO</h1>
        <p className="text-film-gray font-sans text-sm mt-1">Generate an AI-powered ad from your content</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEP_LABELS.map((label, i) => {
          const s      = i + 1;
          const active = s === step;
          const done   = s < step;
          return (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 border transition-colors ${
                active ? 'border-film-amber bg-film-amber/10 text-film-amber'
                       : done  ? 'border-film-amber/40 text-film-amber/60'
                               : 'border-film-border text-film-gray'
              }`}>
                <span className={`font-display text-sm tracking-wider ${active ? 'text-film-amber' : done ? 'text-film-amber/60' : 'text-film-gray'}`}>
                  {String(s).padStart(2, '0')}
                </span>
                <span className="font-sans text-xs tracking-widest uppercase">{label}</span>
              </div>
              {s < STEP_LABELS.length && (
                <div className={`w-8 h-px ${s < step ? 'bg-film-amber/40' : 'bg-film-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 border border-red-800/50 bg-red-950/30 text-red-400 text-sm font-sans">
          {error}
        </div>
      )}

      {/* ── Step 1: Input type ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {inputTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => { setInputType(t.id); setStep(2); }}
              className={`film-card p-6 text-left transition-all duration-200 hover:-translate-y-0.5 group ${
                inputType === t.id ? 'border-film-amber/60' : 'hover:border-film-amber/30'
              }`}
            >
              <t.icon className={`w-7 h-7 mb-3 transition-colors ${inputType === t.id ? 'text-film-amber' : 'text-film-gray group-hover:text-film-amber/70'}`} />
              <div className="font-display tracking-wider text-film-cream text-sm mb-1">{t.label}</div>
              <div className="text-xs text-film-gray font-sans">{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: Content ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="film-card p-8 space-y-6">

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-3">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-3">
              {aspectRatioOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAspectRatio(opt.id)}
                  className={`flex items-center gap-4 p-4 border transition-all text-left ${
                    aspectRatio === opt.id
                      ? 'border-film-amber bg-film-amber/10'
                      : 'border-film-border hover:border-film-amber/30 bg-film-warm'
                  }`}
                >
                  <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
                    {opt.id === '16:9'
                      ? <div className={`border-2 ${aspectRatio === opt.id ? 'border-film-amber' : 'border-film-gray'}`} style={{ width: 36, height: 20 }} />
                      : <div className={`border-2 ${aspectRatio === opt.id ? 'border-film-amber' : 'border-film-gray'}`} style={{ width: 20, height: 36 }} />
                    }
                  </div>
                  <div>
                    <div className={`font-display tracking-wider text-sm ${aspectRatio === opt.id ? 'text-film-amber' : 'text-film-cream'}`}>{opt.label}</div>
                    <div className="text-xs text-film-gray font-sans">{opt.sub}</div>
                    <div className="text-xs text-film-gray/60 font-sans mt-0.5">{opt.hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Video title */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
              Video Title <span className="text-film-gray normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My Product Ad"
              className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
            />
          </div>

          {/* URL input */}
          {inputType === 'url' && (
            <div>
              <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                Website URL
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
              />
            </div>
          )}

          {/* File upload */}
          {(inputType === 'pdf' || inputType === 'ppt') && (
            <div>
              <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                Upload {inputType.toUpperCase()}
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-film-border hover:border-film-amber/40 cursor-pointer transition-colors bg-film-warm">
                <Upload className="w-7 h-7 text-film-gray mb-2" />
                <span className="text-sm text-film-gray font-sans">
                  {file ? file.name : 'Click to upload or drag & drop'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept={inputType === 'pdf' ? '.pdf' : '.ppt,.pptx'}
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {/* Text prompt */}
          {inputType === 'prompt' && (
            <div>
              <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                Describe Your Product
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={5}
                placeholder="We sell a SaaS platform that helps HR teams automate onboarding. Our main features are..."
                className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors resize-none"
              />
            </div>
          )}

          {/* Resource upload */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-1">
              Your Images &amp; Videos <span className="text-film-gray normal-case tracking-normal font-normal">(optional · max 8)</span>
            </label>
            <p className="text-xs text-film-gray/60 font-sans mb-3">
              Upload photos, product shots, or clips — they'll be used as scene backgrounds instead of AI-generated images.
            </p>
            {resources.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {resources.map((f, idx) => (
                  <div key={idx} className="relative group w-16 h-16 border border-film-border bg-film-warm flex items-center justify-center overflow-hidden">
                    {f.type.startsWith('image/')
                      ? <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center gap-1 p-1">
                          <ImageIcon className="w-4 h-4 text-film-gray" />
                          <span className="text-[9px] text-film-gray font-mono truncate w-full text-center">{f.name.slice(0, 8)}</span>
                        </div>
                    }
                    <button
                      onClick={() => removeResource(idx)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                {resources.length < 8 && (
                  <button
                    onClick={() => resRef.current?.click()}
                    className="w-16 h-16 border border-dashed border-film-border bg-film-warm flex items-center justify-center text-film-gray hover:border-film-amber/40 hover:text-film-amber/70 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            {resources.length === 0 && (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-film-border hover:border-film-amber/40 cursor-pointer transition-colors bg-film-warm">
                <ImageIcon className="w-6 h-6 text-film-gray mb-1.5" />
                <span className="text-xs text-film-gray font-sans">Click to add images or videos</span>
                <input ref={resRef} type="file" className="hidden" multiple accept="image/*,video/*" onChange={e => addResources(e.target.files)} />
              </label>
            )}
            <input ref={resRef} type="file" className="hidden" multiple accept="image/*,video/*" onChange={e => addResources(e.target.files)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => { setStep(3); loadCuratedPreviews(); }} className="btn-amber">
              Next: Settings <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Settings ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="film-card p-8 space-y-8">

          {/* ── Voice section ──────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-4">
              Voiceover
            </label>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-5">
              {(['off', 'auto', 'choose'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setVoiceMode(mode)}
                  className={`px-4 py-2 border text-xs font-sans tracking-widest uppercase transition-colors ${
                    voiceMode === mode
                      ? 'border-film-amber bg-film-amber/10 text-film-amber'
                      : 'border-film-border text-film-gray hover:border-film-amber/30'
                  }`}
                >
                  {mode === 'off' ? 'Off' : mode === 'auto' ? '✦ Auto' : 'Choose Voice'}
                </button>
              ))}
            </div>

            {voiceMode === 'off' && (
              <p className="text-xs text-film-gray/60 font-sans">No voiceover will be generated. Scenes will use a default 6-second duration each.</p>
            )}

            {voiceMode === 'auto' && (
              <p className="text-xs text-film-gray/60 font-sans">AI will pick the best voice based on your content language and tone.</p>
            )}

            {voiceMode === 'choose' && (
              <div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {voices.map((v) => (
                    <div
                      key={v.voice_id}
                      onClick={() => setSelectedVoiceId(v.voice_id)}
                      className={`border p-3 cursor-pointer transition-all ${
                        selectedVoiceId === v.voice_id
                          ? 'border-film-amber bg-film-amber/10'
                          : 'border-film-border bg-film-warm hover:border-film-amber/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-display tracking-wide text-sm ${selectedVoiceId === v.voice_id ? 'text-film-amber' : 'text-film-cream'}`}>
                          {v.name}
                        </span>
                        {v.preview_url && (
                          <button
                            onClick={e => { e.stopPropagation(); playPreview(v.voice_id, v.preview_url); }}
                            className="w-6 h-6 flex items-center justify-center text-film-gray hover:text-film-amber transition-colors"
                          >
                            {playingId === v.voice_id
                              ? <Square className="w-3 h-3" />
                              : <Play className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                      <div className={`w-full h-px ${selectedVoiceId === v.voice_id ? 'bg-film-amber/40' : 'bg-film-border'}`} />
                    </div>
                  ))}
                </div>

                <button
                  onClick={loadAllVoices}
                  disabled={voicesLoading}
                  className="flex items-center gap-2 text-xs text-film-gray hover:text-film-amber transition-colors font-sans tracking-widest uppercase"
                >
                  {voicesLoading
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                    : <><ChevronDown className="w-3 h-3" /> Load all voices</>}
                </button>
              </div>
            )}
          </div>

          {/* ── Music section ──────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-4">
              Background Music
            </label>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => { setMusicCategory(''); setSelectedMusicId('auto'); stopAudio(); }}
                className={`px-4 py-2 border text-xs font-sans tracking-widest uppercase transition-colors ${
                  musicCategory === ''
                    ? 'border-film-amber bg-film-amber/10 text-film-amber'
                    : 'border-film-border text-film-gray hover:border-film-amber/30'
                }`}
              >
                ✦ Auto
              </button>
              {MUSIC_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setMusicCategory(cat); stopAudio(); }}
                  className={`px-4 py-2 border text-xs font-sans tracking-widest uppercase transition-colors ${
                    musicCategory === cat
                      ? 'border-film-amber bg-film-amber/10 text-film-amber'
                      : 'border-film-border text-film-gray hover:border-film-amber/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {musicCategory === '' && (
              <p className="text-xs text-film-gray/60 font-sans">AI will pick the best music style for your content type.</p>
            )}

            {musicCategory !== '' && (
              <div className="grid grid-cols-2 gap-3">
                {MUSIC_TRACKS[musicCategory].map((track) => {
                  const previewUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-${track.id}.mp3`;
                  return (
                    <div
                      key={track.id}
                      onClick={() => setSelectedMusicId(track.id)}
                      className={`border p-3 cursor-pointer transition-all ${
                        selectedMusicId === track.id
                          ? 'border-film-amber bg-film-amber/10'
                          : 'border-film-border bg-film-warm hover:border-film-amber/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-display tracking-wide text-sm ${selectedMusicId === track.id ? 'text-film-amber' : 'text-film-cream'}`}>
                          {track.label}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); playPreview(track.id, previewUrl); }}
                          className="w-6 h-6 flex items-center justify-center text-film-gray hover:text-film-amber transition-colors"
                        >
                          {playingId === track.id
                            ? <Square className="w-3 h-3" />
                            : <Play className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => { stopAudio(); setStep(2); }} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => { stopAudio(); setStep(4); }} className="btn-amber">
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review & Submit ────────────────────────────────────────── */}
      {step === 4 && (
        <div className="film-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-6 bg-film-amber" />
            <span className="section-label">Ready to generate</span>
            <span className="h-px w-6 bg-film-amber" />
          </div>

          <div className="space-y-0 mb-8 border border-film-border">
            {[
              { label: 'Input Type',   value: inputTypes.find(t => t.id === inputType)?.label },
              { label: 'Aspect Ratio', value: aspectRatioOptions.find(o => o.id === aspectRatio)?.sub + ' (' + aspectRatio + ')' },
              { label: 'Content',      value: url || file?.name || (prompt?.slice(0, 80) + (prompt?.length > 80 ? '…' : '')) || '—' },
              { label: 'Your Assets',  value: resources.length ? `${resources.length} file${resources.length > 1 ? 's' : ''} attached` : 'AI-generated' },
              {
                label: 'Voiceover',
                value: voiceMode === 'off'
                  ? 'Off'
                  : voiceMode === 'auto'
                  ? 'Auto (AI picks)'
                  : voices.find(v => v.voice_id === selectedVoiceId)?.name ?? 'Auto',
              },
              {
                label: 'Music',
                value: selectedMusicId === 'auto'
                  ? 'Auto (AI picks)'
                  : `${musicCategory} — ${MUSIC_TRACKS[musicCategory]?.find(t => t.id === selectedMusicId)?.label ?? selectedMusicId}`,
              },
              { label: 'Title',        value: title || 'Auto-generated' },
              { label: 'Credit Cost',  value: '1 credit' },
            ].map(({ label, value }, idx, arr) => (
              <div
                key={label}
                className={`flex items-center justify-between px-5 py-3 ${idx < arr.length - 1 ? 'border-b border-film-border' : ''}`}
              >
                <span className="text-film-gray text-xs font-sans font-semibold tracking-widest uppercase">{label}</span>
                <span className="text-film-cream text-sm font-sans">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-amber flex-1 justify-center disabled:opacity-40"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <>Generate Video — 1 Credit <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: TypeScript check (web)**

Run: `cd apps/web && npx tsc --noEmit`
Expected: zero output.

If you get "Module not found" for lucide-react icons `Play`, `Square`, `ChevronDown` — these ship with lucide-react and are always available.

**Step 3: Commit**

```bash
git add apps/web/app/\(app\)/videos/new/page.tsx
git commit -m "feat(web): 4-step wizard with Settings — voice selection (Off/Auto/Choose) + music category tabs"
```

---

## Task 10: Push and verify on VPS

**Step 1: Push**

```bash
git push
```

**Step 2: On VPS — pull and restart worker**

```bash
git pull
# restart the worker process (pm2 / systemctl / docker compose, whatever is used on VPS)
pm2 restart worker   # or: docker compose restart worker
```

**Step 3: Manual smoke test**

1. Open the web app → Create New Video
2. Confirm 4 steps show: Input Type / Your Content / Settings / Review
3. On Settings step:
   - Toggle voice Off → confirm "No voiceover" message
   - Toggle Auto → confirm message
   - Toggle Choose → confirm voice cards appear; click ▶ on a card → audio plays
   - Click "Load all voices" → more cards appear
   - Click music category tab → track cards appear; click ▶ → audio plays
   - Selecting a different track stops the previous
4. Proceed to Review → confirm Voiceover and Music rows show correct values
5. Generate a video with Off voiceover → confirm video renders (no audio artifacts)
6. Generate a video with a specific voice + Cinematic music → confirm both play in the MP4

---

## Quick reference: TypeScript check commands

```bash
# Remotion (run after Tasks 1–3)
cd agentforge-video && npx tsc --noEmit

# Worker (run after Tasks 4–7)
cd apps/worker && npx tsc --noEmit

# Web (run after Tasks 8–9)
cd apps/web && npx tsc --noEmit
```

Zero output = clean. Any errors must be resolved before committing.
