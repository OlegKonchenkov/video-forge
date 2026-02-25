import axios from 'axios';
import fs from 'fs';
import path from 'path';

const imagePrompts: Record<number, string> = {
  1: 'frustrated business person overwhelmed with emails and paperwork, dark office',
  2: 'chaos of digital notifications and tasks piling up, digital art style',
  3: 'burning money and wasted time visualization, minimalist dark background',
  4: 'modern AI technology logo reveal, blue glowing neural network',
  5: 'AI agents working autonomously on computers, futuristic dashboard',
  6: 'happy team celebrating results with charts showing growth',
  7: 'call to action button glowing, professional business CTA',
};

export async function generateImages(scenes: string[], workDir: string): Promise<string[]> {
  fs.mkdirSync(path.join(workDir, 'images'), { recursive: true });
  const paths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const outPath = path.join(workDir, 'images', `scene${i + 1}.png`);
    const prompt = imagePrompts[i + 1] || `professional business scene for: ${scenes[i].slice(0, 50)}`;

    try {
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
        {
          contents: [{ parts: [{ text: `Generate a professional 16:9 image for a video advertisement: ${prompt}` }] }],
          generationConfig: { responseModalities: ['IMAGE'], candidateCount: 1 },
        },
        {
          params: { key: process.env.GEMINI_API_KEY },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const imageData = response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (imageData) {
        fs.writeFileSync(outPath, Buffer.from(imageData, 'base64'));
      } else {
        // Fallback: create placeholder
        createPlaceholderImage(outPath, i + 1);
      }
    } catch {
      createPlaceholderImage(outPath, i + 1);
    }

    paths.push(outPath);
    await new Promise(r => setTimeout(r, 500));
  }

  return paths;
}

function createPlaceholderImage(outPath: string, sceneNum: number) {
  // Create a minimal valid PNG (1x1 pixel) as fallback
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82,
  ]);
  fs.writeFileSync(outPath, pngHeader);
  console.log(`[images] Scene ${sceneNum}: using placeholder image`);
}
