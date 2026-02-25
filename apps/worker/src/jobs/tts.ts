import axios from 'axios';
import fs from 'fs';
import path from 'path';

const VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // ElevenLabs Daniel
const MODEL_ID = 'eleven_multilingual_v2';

export async function generateVoiceovers(scenes: string[], workDir: string): Promise<string[]> {
  fs.mkdirSync(path.join(workDir, 'audio'), { recursive: true });
  const paths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const outPath = path.join(workDir, 'audio', `scene${i + 1}.mp3`);
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
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
