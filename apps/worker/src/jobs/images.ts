// apps/worker/src/jobs/images.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type { SceneConfig } from '../types/script';

// Scene-type-aware cinematic prompt templates
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

// ─── Gradient placeholder (1×1 RGBA PNG with brand accent at 15% opacity) ───

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function crc32(buf: Buffer): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeGradientPlaceholder(outPath: string, accentColor: string) {
  const [r, g, b] = hexToRgb(accentColor || '#3b82f6');
  const a = Math.round(0.15 * 255); // 15% opacity

  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: 1×1 RGBA (8-bit)
  const ihdrPayload = Buffer.from([
    0,0,0,1, 0,0,0,1,  // width=1, height=1
    8, 6,              // bit depth 8, color type 6 = RGBA
    0, 0, 0,           // compression, filter, interlace
  ]);
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrPayload]));
  const ihdr = Buffer.alloc(4 + 4 + 13 + 4);
  ihdr.writeUInt32BE(13, 0);
  Buffer.from('IHDR').copy(ihdr, 4);
  ihdrPayload.copy(ihdr, 8);
  ihdr.writeUInt32BE(ihdrCrc, 21);

  // IDAT: filter byte (0) + RGBA pixel
  const raw = Buffer.from([0, r, g, b, a]);
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idat = Buffer.alloc(4 + 4 + compressed.length + 4);
  idat.writeUInt32BE(compressed.length, 0);
  Buffer.from('IDAT').copy(idat, 4);
  compressed.copy(idat, 8);
  idat.writeUInt32BE(idatCrc, 8 + compressed.length);

  // IEND
  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  Buffer.from('IEND').copy(iend, 4);
  iend.writeUInt32BE(iendCrc, 8);

  fs.writeFileSync(outPath, Buffer.concat([sig, ihdr, idat, iend]));
  console.log(`[images] wrote gradient placeholder → ${path.basename(outPath)}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function downloadImage(imageUrl: string, outPath: string): Promise<boolean> {
  // Local file path (user-uploaded resources already downloaded to disk)
  if (imageUrl.startsWith('/') || imageUrl.startsWith('file://')) {
    const localPath = imageUrl.replace('file://', '');
    if (fs.existsSync(localPath)) {
      fs.copyFileSync(localPath, outPath);
      console.log(`[images] copied local resource → ${path.basename(outPath)}`);
      return true;
    }
    return false;
  }
  // Remote URL
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoForgeBot/1.0)' },
    });
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('image')) return false;
    fs.writeFileSync(outPath, Buffer.from(response.data));
    console.log(`[images] downloaded ${path.basename(outPath)} from ${imageUrl.slice(0, 80)}`);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function generateWithGemini(prompt: string, outPath: string, sceneIndex: number): Promise<boolean> {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
        {
          contents: [{ parts: [{ text: `Generate a professional cinematic 16:9 image for a video advertisement: ${prompt}` }] }],
          // TEXT must be listed alongside IMAGE — some API versions reject IMAGE-only
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], candidateCount: 1 },
        },
        {
          params: { key: process.env.GEMINI_API_KEY },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      // Image can appear in ANY part (text parts come first in multi-modal responses)
      const parts: any[] = response.data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: any) => p.inlineData?.data);
      if (!imagePart) {
        console.warn(`[images] scene_${sceneIndex} Gemini attempt ${attempt + 1}: no image part in response (parts: ${JSON.stringify(parts.map((p: any) => Object.keys(p)))})`);
        if (attempt < 2) await sleep(delays[attempt]);
        continue;
      }
      fs.writeFileSync(outPath, Buffer.from(imagePart.inlineData.data, 'base64'));
      console.log(`[images] scene_${sceneIndex} Gemini OK (attempt ${attempt + 1})`);
      return true;
    } catch (err: any) {
      const status = err?.response?.status ?? '?';
      const body   = JSON.stringify(err?.response?.data ?? '').slice(0, 300);
      console.warn(`[images] scene_${sceneIndex} Gemini attempt ${attempt + 1} HTTP ${status}: ${body}`);
      if (attempt < 2) await sleep(delays[attempt]);
    }
  }
  return false;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateImages(
  scenes:        SceneConfig[],
  workDir:       string,
  brandName:     string,
  brandImageUrl: string | null,
  accentColor:   string = '#3b82f6',
  imageUrls:     string[] = [],    // priority images: scraped from site or user-uploaded
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

    // 1. Priority: user-uploaded or scraped images (round-robin across scenes)
    if (!ok && imageUrls.length > 0) {
      const candidateUrl = imageUrls[i % imageUrls.length];
      console.log(`[images] scene_${i}: trying priority image URL`);
      ok = await downloadImage(candidateUrl, outPath);
    }

    // 2. og:image for scene 0 (brand hero image)
    if (!ok && i === 0 && brandImageUrl) {
      console.log(`[images] scene_0: trying brand og:image`);
      ok = await downloadImage(brandImageUrl, outPath);
    }

    // 3. Gemini generation (with 3-attempt retry + backoff)
    if (!ok) {
      console.log(`[images] scene_${i} (${scene.type}): generating with Gemini`);
      ok = await generateWithGemini(prompt, outPath, i);
    }

    // 4. og:image as last-resort fallback (scenes N > 0)
    if (!ok && i > 0 && brandImageUrl) {
      console.log(`[images] scene_${i}: falling back to og:image`);
      ok = await downloadImage(brandImageUrl, outPath);
    }

    if (!ok) writeGradientPlaceholder(outPath, accentColor);

    outPaths.push(outPath);
    if (i < scenes.length - 1) await sleep(500);
  }

  return outPaths;
}
