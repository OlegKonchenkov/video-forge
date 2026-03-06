// apps/worker/src/jobs/pipeline.ts
import { supabase } from '../lib/supabase';
import { scrapeUrl, type BrandPalette } from './scraper';
import { parsePdf, parsePpt } from './parser';
import { generateScript } from './scriptgen';
import { generateVoiceovers } from './tts';
import { generateImages } from './images';
import { renderVideo } from './render';
import { uploadVideo } from './upload';
import fs from 'fs';
import path from 'path';

async function updateStatus(videoId: string, status: string, progress: number, currentStep: string) {
  await supabase.from('videos').update({
    status, progress, current_step: currentStep, updated_at: new Date().toISOString(),
  }).eq('id', videoId);
}

/** Download user-uploaded resources from Supabase Storage and return local URLs */
async function downloadResources(resourcePaths: string[], workDir: string): Promise<string[]> {
  if (!resourcePaths?.length) return [];
  const resDir = path.join(workDir, 'resources');
  fs.mkdirSync(resDir, { recursive: true });

  const localPaths: string[] = [];
  for (const storagePath of resourcePaths) {
    try {
      const { data, error } = await supabase.storage.from('uploads').download(storagePath);
      if (error || !data) {
        console.warn(`[pipeline] resource download failed: ${storagePath} — ${error?.message}`);
        continue;
      }
      const ext      = path.extname(storagePath) || '.png';
      const filename = `resource_${localPaths.length}${ext}`;
      const localPath = path.join(resDir, filename);
      const buffer   = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(localPath, buffer);
      // Use file:// prefix so downloadImage in images.ts can skip these (they're already local)
      // Instead, just keep local paths — we'll return them and images.ts will copy them directly
      localPaths.push(localPath);
      console.log(`[pipeline] downloaded resource: ${filename}`);
    } catch (e) {
      console.warn(`[pipeline] resource error: ${storagePath}`, e);
    }
  }
  return localPaths;
}

export async function runVideoPipeline(job: any) {
  const { videoId, inputType, inputData } = job.data;
  const aspectRatio:    '16:9' | '9:16' = job.data.aspectRatio    ?? '16:9';
  const resourcePaths:  string[]         = job.data.resourcePaths  ?? [];
  const voiceId:        string | null    = job.data.voiceId        ?? 'auto'; // null=Off, 'auto'=AI picks
  const musicId:        string           = job.data.musicId        ?? 'auto';
  const userInstructions: string | undefined = job.data.userInstructions || undefined;
  const workDir = `/tmp/videoforge/${videoId}`;

  try {
    await updateStatus(videoId, 'processing', 5, 'Extracting content...');

    // 1. Extract text (and brand image URL + accent color for website input)
    let sourceText                     = '';
    let brandImageUrl:  string | null  = null;
    let accentColor:    string | null  = null;
    let brandPalette:   BrandPalette | null = null;
    let language                       = 'en';
    let businessType                   = 'mixed';
    let scrapedImageUrls:  string[]    = [];

    if (inputType === 'url') {
      const result     = await scrapeUrl(inputData.url);
      sourceText       = result.text;
      brandImageUrl    = result.brandImageUrl;
      accentColor      = result.accentColor;
      brandPalette     = result.palette;
      language         = result.language;
      businessType     = result.businessType;
      scrapedImageUrls = result.imageUrls;
    } else if (inputType === 'pdf') {
      sourceText = await parsePdf(inputData.fileName);
    } else if (inputType === 'ppt') {
      sourceText = await parsePpt(inputData.fileName);
    } else {
      sourceText = inputData.text;
    }

    await updateStatus(videoId, 'processing', 15, 'Writing script...');

    // 2. Generate structured script via GPT-5.2
    const script = await generateScript(sourceText, inputType, language, businessType, accentColor, brandPalette, userInstructions);

    await updateStatus(videoId, 'processing', 22, 'Preparing assets...');

    // 3. Download user-uploaded resource images (highest priority for scene backgrounds)
    const resourceLocalPaths = await downloadResources(resourcePaths, workDir);

    // Build final imageUrls: user uploads first, then scraped images
    // images.ts copies local-path files directly; URLs are downloaded via axios
    const imageUrls: string[] = [...resourceLocalPaths, ...scrapedImageUrls];

    await updateStatus(videoId, 'processing', 28, 'Recording voiceover...');

    // 4. ElevenLabs TTS — pass voiceId (null=skip, 'auto'=AI picks, string=specific voice)
    const voiceovers = script.scenes.map((s) => s.props.voiceover);
    const audioPaths = await generateVoiceovers(voiceovers, workDir, voiceId, language, businessType);
    const hasVoiceover = audioPaths.length > 0;

    await updateStatus(videoId, 'processing', 48, 'Generating visuals...');

    // 5. Gemini images — pass imageUrls (user uploads + scraped) and showImageFlags for cost saving
    const showImageFlags = script.scenes.map(s => s.showImage !== false);
    const imagePaths = await generateImages(
      script.scenes, workDir, script.brandName, brandImageUrl, script.accentColor, imageUrls, showImageFlags,
    );

    await updateStatus(videoId, 'processing', 63, 'Rendering video...');

    // 6. Remotion render — pass aspectRatio, hasVoiceover, musicId, businessType
    const mp4Path = await renderVideo({ videoId, script, audioPaths, imagePaths, workDir, aspectRatio, hasVoiceover, musicId, businessType });

    await updateStatus(videoId, 'processing', 85, 'Uploading...');

    // 7. Upload to Supabase Storage
    const outputUrl = await uploadVideo(mp4Path, videoId);

    // 8. Mark complete
    await supabase.from('videos').update({
      status: 'complete', progress: 100, output_url: outputUrl,
      current_step: 'Done', updated_at: new Date().toISOString(),
    }).eq('id', videoId);

  } catch (err: unknown) {
    const error = err as Error;
    await supabase.from('videos').update({
      status: 'failed', error_msg: error.message, updated_at: new Date().toISOString(),
    }).eq('id', videoId);
    // Refund credit on failure (Supabase rpc returns {data,error}, never throws)
    if (job.data.userId) {
      await supabase.rpc('refund_credit', { p_user_id: job.data.userId, p_video_id: videoId });
    }
    throw err;
  }
}
