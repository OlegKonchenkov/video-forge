import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// The agentforge-video Remotion project is at the repo root
const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');

export async function renderVideo({ videoId, scenes, audioPaths, imagePaths, workDir }: {
  videoId: string;
  scenes: string[];
  audioPaths: string[];
  imagePaths: string[];
  workDir: string;
}): Promise<string> {
  const outPath = path.join(workDir, 'output.mp4');
  fs.mkdirSync(workDir, { recursive: true });

  const remotionPublic = path.join(REMOTION_ROOT, 'public');
  fs.mkdirSync(path.join(remotionPublic, 'audio/voiceover'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'images'), { recursive: true });

  // Copy voiceover audio files
  audioPaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `audio/voiceover/scene${i + 1}.mp3`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Copy background images
  const bgNames = ['bg-hero', 'bg-chaos', 'bg-cost', 'bg-logo', 'bg-solution', 'bg-stats', 'bg-cta'];
  imagePaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `images/${bgNames[i] || `scene${i + 1}`}.png`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  execSync(
    `npx remotion render AgentForgeAd "${outPath}" --codec h264`,
    { cwd: REMOTION_ROOT, stdio: 'pipe', timeout: 300_000 }
  );

  return outPath;
}
