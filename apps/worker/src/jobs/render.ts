import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// The agentforge-video Remotion project is at the repo root
const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');

async function runRemotionRender(outPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'npx',
      ['remotion', 'render', 'AgentForgeAd', outPath, '--codec', 'h264'],
      { cwd: REMOTION_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stderr = '';
    const timeoutMs = parseInt(process.env.RENDER_TIMEOUT_MS || '600000', 10);
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Remotion render timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Remotion render failed (exit ${code}): ${stderr.slice(-1000)}`));
    });
  });
}

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

  await runRemotionRender(outPath);

  return outPath;
}
