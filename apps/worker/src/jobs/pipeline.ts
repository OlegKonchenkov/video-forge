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

    // 1. Extract text from source
    let sourceText = '';
    if (inputType === 'url') sourceText = await scrapeUrl(inputData.url);
    else if (inputType === 'pdf') sourceText = await parsePdf(inputData.fileName);
    else if (inputType === 'ppt') sourceText = await parsePpt(inputData.fileName);
    else sourceText = inputData.text;

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    // 2. Generate 7-scene script via Claude
    const scenes = await generateScript(sourceText, inputType);

    await updateStatus(videoId, 'processing', 25, 'Recording voiceover...');

    // 3. ElevenLabs TTS for each scene
    const audioPaths = await generateVoiceovers(scenes, workDir);

    await updateStatus(videoId, 'processing', 45, 'Generating visuals...');

    // 4. Gemini free-tier images
    const imagePaths = await generateImages(scenes, workDir);

    await updateStatus(videoId, 'processing', 60, 'Rendering video...');

    // 5. Remotion render
    const mp4Path = await renderVideo({ videoId, scenes, audioPaths, imagePaths, workDir });

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
