import { writeFileSync, mkdirSync } from 'fs';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel - professional male voice

const scenes = [
  { id: 'scene1', text: "Your team is drowning in busywork. Emails, data entry, follow-ups — every single day." },
  { id: 'scene2', text: "The inbox never stops. Spreadsheets fall behind. Follow-ups get forgotten. And it costs you more than you think." },
  { id: 'scene3', text: "That's twenty-five hours a week. Twenty-five thousand euros a year. Gone." },
  { id: 'scene4', text: "Meet AgentForge." },
  { id: 'scene5', text: "We build custom AI agents that handle it all — automatically. No setup. No learning curve. Deployed in five days, fully managed." },
  { id: 'scene6', text: "Our clients save an average of twenty-eight hours per week, go live in five days, and see over five thousand dollars in monthly ROI." },
  { id: 'scene7', text: "Stop paying people to do what AI does better. Book your free fifteen-minute call today." }
];

mkdirSync('public/audio/voiceover', { recursive: true });

async function generateVoiceover(scene) {
  console.log(`Generating voiceover for ${scene.id}...`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: scene.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.80,
          style: 0.25,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`❌ ${scene.id} failed: ${err}`);
    return false;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const path = `public/audio/voiceover/${scene.id}.mp3`;
  writeFileSync(path, buffer);
  console.log(`✅ Saved ${path} (${buffer.length} bytes)`);
  return true;
}

for (const scene of scenes) {
  await generateVoiceover(scene);
  await new Promise(r => setTimeout(r, 800));
}

console.log('Voiceover generation complete');
