// apps/worker/src/jobs/pipeline.ts
import { supabase } from '../lib/supabase';
import { scrapeUrl } from './scraper';
import { parsePdf, parsePpt } from './parser';
import { generateScript } from './scriptgen';
import { generateVoiceovers } from './tts';
import { generateImages } from './images';
import { renderVideo } from './render';
import { uploadVideo } from './upload';

async function updateStatus(videoId: string, status: string, progress: number, currentStep: string) {
  await supabase.from('videos').update({
    status, progress, current_step: currentStep, updated_at: new Date().toISOString(),
  }).eq('id', videoId);
}

export async function runVideoPipeline(job: any) {
  const { videoId, inputType, inputData } = job.data;
  const workDir = `/tmp/videoforge/${videoId}`;

  try {
    await updateStatus(videoId, 'processing', 5, 'Extracting content...');

    // 1. Extract text (and brand image URL + accent color for website input)
    let sourceText = '';
    let brandImageUrl: string | null = null;
    let accentColor: string | null   = null;

    if (inputType === 'url') {
      const result  = await scrapeUrl(inputData.url);
      sourceText    = result.text;
      brandImageUrl = result.brandImageUrl;
      accentColor   = result.accentColor;
    } else if (inputType === 'pdf') {
      sourceText = await parsePdf(inputData.fileName);
    } else if (inputType === 'ppt') {
      sourceText = await parsePpt(inputData.fileName);
    } else {
      sourceText = inputData.text;
    }

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    // 2. Generate structured script via GPT-4o (pass accentColor hint if found)
    const script = await generateScript(sourceText, inputType, accentColor);

    await updateStatus(videoId, 'processing', 25, 'Recording voiceover...');

    // 3. ElevenLabs TTS — pass only the voiceover strings (0-indexed filenames)
    const voiceovers = script.scenes.map((s) => s.props.voiceover);
    const audioPaths = await generateVoiceovers(voiceovers, workDir);

    await updateStatus(videoId, 'processing', 45, 'Generating visuals...');

    // 4. Gemini images — use scene type + voiceover as context
    const imagePaths = await generateImages(script.scenes, workDir, script.brandName, brandImageUrl);

    await updateStatus(videoId, 'processing', 60, 'Rendering video...');

    // 5. Remotion render — pass full script as props
    const mp4Path = await renderVideo({ videoId, script, audioPaths, imagePaths, workDir });

    await updateStatus(videoId, 'processing', 85, 'Uploading...');

    // 6. Upload to Supabase Storage
    const outputUrl = await uploadVideo(mp4Path, videoId);

    // 7. Mark complete
    await supabase.from('videos').update({
      status: 'complete', progress: 100, output_url: outputUrl,
      current_step: 'Done', updated_at: new Date().toISOString(),
    }).eq('id', videoId);

  } catch (err: unknown) {
    const error = err as Error;
    await supabase.from('videos').update({
      status: 'failed', error_msg: error.message, updated_at: new Date().toISOString(),
    }).eq('id', videoId);
    throw err;
  }
}
