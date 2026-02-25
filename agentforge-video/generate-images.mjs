import { writeFileSync, mkdirSync } from 'fs';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const images = [
  {
    filename: 'public/images/bg-hero.png',
    prompt: 'A stressed business professional sitting at a cluttered desk overwhelmed by hundreds of email notifications on multiple screens, dark moody cinematic blue atmosphere, corporate office at night, dramatic lighting, photorealistic, high quality'
  },
  {
    filename: 'public/images/bg-solution.png',
    prompt: 'Modern AI-powered office dashboard with multiple glowing screens showing data analytics, clean minimalist technology workspace, dark navy blue theme, holographic interfaces, futuristic but professional, photorealistic, cinematic'
  },
  {
    filename: 'public/images/bg-cta.png',
    prompt: 'Confident successful business professional in a clean modern office, relaxed expression, growth charts visible on screens behind them, professional corporate photography, dark blue tones, cinematic lighting, success and achievement'
  }
];

async function generateImage(prompt, filename) {
  console.log(`Generating: ${filename}`);

  // Try gemini-2.5-flash-image first (confirmed available)
  const geminiImageModels = [
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview'
  ];

  for (const model of geminiImageModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          })
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.log(`Model ${model} failed: ${err.slice(0, 200)}`);
        continue;
      }

      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

      if (imagePart) {
        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        writeFileSync(filename, buffer);
        console.log(`Saved ${filename} (${buffer.length} bytes) using ${model}`);
        return true;
      } else {
        console.log(`Model ${model} returned no image parts. Parts: ${JSON.stringify(parts.map(p => Object.keys(p)))}`);
      }
    } catch (e) {
      console.log(`Model ${model} error: ${e.message}`);
    }
  }

  // Try Imagen 4 (confirmed available)
  const imagenModels = [
    'imagen-4.0-fast-generate-001',
    'imagen-4.0-generate-001'
  ];

  for (const model of imagenModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1 }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          const buffer = Buffer.from(b64, 'base64');
          writeFileSync(filename, buffer);
          console.log(`Saved ${filename} via ${model} (${buffer.length} bytes)`);
          return true;
        }
        console.log(`${model} response has no image data: ${JSON.stringify(Object.keys(data))}`);
      } else {
        console.log(`${model} failed: ${(await response.text()).slice(0, 200)}`);
      }
    } catch (e) {
      console.log(`${model} error: ${e.message}`);
    }
  }

  console.log(`All models failed for ${filename}`);
  return false;
}

mkdirSync('public/images', { recursive: true });

for (const img of images) {
  await generateImage(img.prompt, img.filename);
  await new Promise(r => setTimeout(r, 1500)); // rate limit
}

console.log('Image generation complete');
