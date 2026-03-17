// apps/worker/src/jobs/render.ts
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import type { VideoScript } from '../types/script';
import { cleanupCodex, type CodexResult } from './codexgen';

const REMOTION_ROOT = path.resolve(__dirname, '../../../../agentforge-video');
const RENDER_TIMEOUT = Number(process.env.RENDER_TIMEOUT_MS) || 600_000; // 10 min default
const RENDER_CONCURRENCY = Number(process.env.RENDER_CONCURRENCY) || 1;
const RENDER_GL = process.env.RENDER_GL || 'angle';

// ─── Music resolution ─────────────────────────────────────────────────────────

const AUTO_MUSIC_MAP: Record<string, string[]> = {
  b2b:   ['Song-3', 'Song-7', 'Song-11'],   // Corporate
  b2c:   ['Song-4', 'Song-10', 'Song-17'],  // Upbeat
  mixed: ['Song-6', 'Song-9', 'Song-12'],   // Cinematic
};

function resolveMusic(musicId: string, businessType: string): string {
  if (musicId === 'auto') {
    const tracks = AUTO_MUSIC_MAP[businessType] ?? AUTO_MUSIC_MAP.mixed;
    return tracks[Math.floor(Math.random() * tracks.length)];
  }
  return musicId; // e.g. 'Song-3'
}

async function downloadMusic(songName: string, outPath: string): Promise<void> {
  const url = `https://www.soundhelix.com/examples/mp3/SoundHelix-${songName}.mp3`;
  console.log(`[render] downloading music: ${songName}`);
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30_000 });
  fs.writeFileSync(outPath, Buffer.from(response.data));
  console.log(`[render] music downloaded → ${path.basename(outPath)}`);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio, hasVoiceover, musicId, businessType, codexResult }: {
  videoId:       string;
  script:        VideoScript;
  audioPaths:    string[];
  imagePaths:    string[];
  workDir:       string;
  aspectRatio:   '16:9' | '9:16';
  hasVoiceover:  boolean;
  musicId:       string;
  businessType:  string;
  codexResult?:  CodexResult;
}): Promise<string> {
  const outPath = path.join(workDir, 'output.mp4');
  fs.mkdirSync(workDir, { recursive: true });

  const remotionPublic = path.join(REMOTION_ROOT, 'public');
  fs.mkdirSync(path.join(remotionPublic, 'audio/voiceover'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'audio/music'), { recursive: true });
  fs.mkdirSync(path.join(remotionPublic, 'images'), { recursive: true });

  // Copy voiceover audio — 0-indexed to match AgentForgeAd audioPath: `audio/voiceover/scene_${i}.mp3`
  audioPaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `audio/voiceover/scene_${i}.mp3`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Copy background images — 0-indexed to match scene components: `images/scene_${sceneIndex}.png`
  imagePaths.forEach((src, i) => {
    const dest = path.join(remotionPublic, `images/scene_${i}.png`);
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  });

  // Download background music
  const songName  = resolveMusic(musicId, businessType);
  const musicDest = path.join(remotionPublic, 'audio/music/background.mp3');
  await downloadMusic(songName, musicDest);

  // Write props to a temp file (avoids shell command-length limits)
  const propsPath = path.join(workDir, 'props.json');
  const remotionProps = {
    brandName:      script.brandName,
    tagline:        script.tagline,
    ctaText:        script.ctaText,
    ctaUrl:         script.ctaUrl,
    accentColor:    script.accentColor,
    bgColor:        script.bgColor      ?? '#050d1a',
    surfaceColor:   script.surfaceColor ?? '#0a1628',
    aspectRatio,
    hasVoiceover,
    // Placeholder durations — calculateMetadata overwrites them from audio files (or uses fallback)
    sceneDurations: Array(script.scenes.length).fill(150),
    scenes:         script.scenes,
  };
  fs.writeFileSync(propsPath, JSON.stringify(remotionProps));

  // CODEX mode: use generated entry point; PREFAB mode: default entry
  const compositionId = codexResult ? 'CodexAd' : 'AgentForgeAd';

  // Build args array for execFile (avoids shell parsing issues)
  const remotionBin = path.join(REMOTION_ROOT, 'node_modules', '.bin', 'remotion');
  const args = ['render'];
  if (codexResult) args.push(codexResult.entryFile);
  args.push(compositionId, outPath, '--codec', 'h264', '--props', propsPath);
  args.push(`--concurrency=${RENDER_CONCURRENCY}`, `--gl=${RENDER_GL}`);

  console.log(`[render] starting remotion render (timeout: ${RENDER_TIMEOUT}ms)`);
  console.log(`[render] config: concurrency=${RENDER_CONCURRENCY}, gl=${RENDER_GL}`);
  console.log(`[render] cmd: remotion ${args.join(' ')}`);

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = execFile(remotionBin, args, {
        cwd: REMOTION_ROOT,
        timeout: RENDER_TIMEOUT,
        maxBuffer: 50 * 1024 * 1024, // 50 MB stdout buffer
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[render] FAILED: ${error.message}`);
          if (stderr) console.error(`[render] stderr: ${stderr.slice(-2000)}`);
          if (stdout) console.log(`[render] stdout (last 1000): ${stdout.slice(-1000)}`);
          reject(error);
        } else {
          console.log(`[render] completed successfully`);
          resolve();
        }
      });

      // Stream progress to logs in real-time
      proc.stderr?.on('data', (chunk: Buffer) => {
        const line = chunk.toString().trim();
        if (line) process.stderr.write(`[remotion] ${line}\n`);
      });
    });
  } finally {
    // Cleanup codex files after render (success or failure)
    if (codexResult) {
      cleanupCodex(codexResult.codexDir);
    }
  }

  return outPath;
}
