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
