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
  if (language === 'it') return 'XB0fDUnXU5powFXDhCwa'; // Charlotte (multilingual)
  // Business-type voices (English)
  if (businessType === 'b2b') return 'pNInz6obpgDQGcFmaJgB'; // Adam – authoritative narration
  if (businessType === 'b2c') return 'AZnzlk1XvdvUeBnXmlld'; // Domi – energetic
  return DEFAULT_VOICE_ID; // Daniel – balanced default
}

export async function generateVoiceovers(
  scenes:       string[],
  workDir:      string,
  voiceId:      string | null | 'auto' = 'auto',
  language:     string = 'en',
  businessType: string = 'mixed',
): Promise<string[]> {
  // Off — return empty; pipeline will set hasVoiceover=false
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
    try {
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
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown } };
      const status = err?.response?.status;
      const body   = JSON.stringify(err?.response?.data ?? '').slice(0, 300);
      console.warn(`[tts] ElevenLabs HTTP ${status ?? 'network'} on scene ${i + 1} — body: ${body}`);

      // Voice not found → retry once with Daniel default
      if ((status === 400 || status === 422) && resolvedVoiceId !== DEFAULT_VOICE_ID) {
        console.log(`[tts] voice ${resolvedVoiceId} not on account, retrying scene ${i + 1} with Daniel...`);
        try {
          const retry = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`,
            { text: scenes[i], model_id: MODEL_ID, voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
            { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json' }, responseType: 'arraybuffer' }
          );
          fs.writeFileSync(outPath, Buffer.from(retry.data));
          paths.push(outPath);
          await new Promise(r => setTimeout(r, 300));
          continue; // skip the general failure path below
        } catch (retryErr) {
          const retryStatus = (retryErr as { response?: { status?: number } })?.response?.status;
          console.warn(`[tts] Daniel fallback also failed (HTTP ${retryStatus}) on scene ${i + 1}`);
        }
      }

      if (status === 401) {
        console.error('[tts] ELEVENLABS_API_KEY is invalid or not set — disabling voiceover');
      } else if (status === 429) {
        console.error('[tts] ElevenLabs rate limit hit — disabling voiceover');
      }

      // Clean up partial files
      for (const p of paths) { try { fs.unlinkSync(p); } catch { /* ignore */ } }
      return [];
    }
  }

  return paths;
}
