// apps/worker/src/jobs/render.ts
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { VideoScript } from '../types/script';

const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');

export async function renderVideo({ videoId, script, audioPaths, imagePaths, workDir }: {
  videoId:    string;
  script:     VideoScript;
  audioPaths: string[];
  imagePaths: string[];
  workDir:    string;
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
    const dest = path.join(remotionPublic, `images/${bgNames[i] ?? `scene${i + 1}`}.png`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Write props to a temp file (avoids shell command-length limits)
  const propsPath = path.join(workDir, 'props.json');
  const remotionProps = {
    brandName: script.brandName,
    tagline:   script.tagline,
    ctaText:   script.ctaText,
    ctaUrl:    script.ctaUrl,
    scenes:    script.scenes,
  };
  fs.writeFileSync(propsPath, JSON.stringify(remotionProps));

  execSync(
    `npx remotion render AgentForgeAd "${outPath}" --codec h264 --props "${propsPath}"`,
    { cwd: REMOTION_ROOT, stdio: 'pipe', timeout: 300_000 }
  );

  return outPath;
}
