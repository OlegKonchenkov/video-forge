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
  const aspectRatio: '16:9' | '9:16' = job.data.aspectRatio ?? '16:9';
  const workDir = `/tmp/videoforge/${videoId}`;

  try {
    await updateStatus(videoId, 'processing', 5, 'Extracting content...');

    // 1. Extract text (and brand image URL + accent color for website input)
    let sourceText                   = '';
    let brandImageUrl: string | null = null;
    let accentColor:   string | null = null;
    let language                     = 'en';
    let businessType                 = 'mixed';

    if (inputType === 'url') {
      const result  = await scrapeUrl(inputData.url);
      sourceText    = result.text;
      brandImageUrl = result.brandImageUrl;
      accentColor   = result.accentColor;
      language      = result.language;
      businessType  = result.businessType;
    } else if (inputType === 'pdf') {
      sourceText = await parsePdf(inputData.fileName);
    } else if (inputType === 'ppt') {
      sourceText = await parsePpt(inputData.fileName);
    } else {
      sourceText = inputData.text;
    }

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    // 2. Generate structured script via GPT-5.2 (pass language + businessType + accent hint)
    const script = await generateScript(sourceText, inputType, language, businessType, accentColor);

    await updateStatus(videoId, 'processing', 25, 'Recording voiceover...');

    // 3. ElevenLabs TTS — pass only the voiceover strings
    const voiceovers = script.scenes.map((s) => s.props.voiceover);
    const audioPaths = await generateVoiceovers(voiceovers, workDir);

    await updateStatus(videoId, 'processing', 45, 'Generating visuals...');

    // 4. Gemini images — pass accentColor for gradient placeholder fallback
    const imagePaths = await generateImages(
      script.scenes, workDir, script.brandName, brandImageUrl, script.accentColor,
    );

    await updateStatus(videoId, 'processing', 60, 'Rendering video...');

    // 5. Remotion render — pass aspectRatio
    const mp4Path = await renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio });

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
