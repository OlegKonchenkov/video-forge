// apps/worker/src/jobs/images.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';
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

function writePlaceholder(outPath: string, sceneIndex: number) {
  const pngHeader = Buffer.from([
    0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
    0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
    0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41,0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00,
    0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC,0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,
    0x44,0xAE,0x42,0x60,0x82,
  ]);
  fs.writeFileSync(outPath, pngHeader);
  console.log(`[images] scene_${sceneIndex}: using placeholder`);
}

export async function generateImages(
  scenes: SceneConfig[],
  workDir: string,
  brandName: string,
  brandImageUrl: string | null,
): Promise<string[]> {
  fs.mkdirSync(path.join(workDir, 'images'), { recursive: true });
  const outPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const outPath    = path.join(workDir, 'images', `scene_${i}.png`);
    const scene      = scenes[i];
    const hint       = scene.props.voiceover.slice(0, 60);
    const promptFn   = SCENE_PROMPTS[scene.type] ?? FALLBACK_PROMPT;
    const prompt     = promptFn(brandName, hint);

    let ok = false;

    // First scene: try the scraped brand image (og:image from website)
    if (i === 0 && brandImageUrl) {
      console.log(`[images] scene_0: trying brand og:image`);
      ok = await downloadImage(brandImageUrl, outPath);
    }

    // Gemini generation
    if (!ok) {
      console.log(`[images] scene_${i} (${scene.type}): generating with Gemini`);
      ok = await generateWithGemini(prompt, outPath);
    }

    if (!ok) writePlaceholder(outPath, i);

    outPaths.push(outPath);
    if (i < scenes.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  return outPaths;
}
