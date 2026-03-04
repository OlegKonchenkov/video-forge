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
  let voices: { voice_id: string; name: string; preview_url: string }[] = data.voices ?? [];

  if (curated) {
    voices = voices.filter((v) => CURATED_IDS.has(v.voice_id));
  }

  // Return only the fields the frontend needs
  const result = voices.map((v) => ({
    voice_id:    v.voice_id,
    name:        v.name,
    preview_url: v.preview_url,
  }));

  return NextResponse.json(result);
}
