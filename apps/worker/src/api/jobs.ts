import { Router } from 'express';
import { videoQueue } from '../queue';
import { supabase } from '../lib/supabase';

export const jobsRouter = Router();

jobsRouter.post('/', async (req, res) => {
  const { videoId, userId, inputType, inputData, aspectRatio, resourcePaths, voiceId, musicId, userInstructions } = req.body;
  const generationMode: 'prefab' | 'codex' = req.body.generationMode ?? 'prefab';
  const creditCost = generationMode === 'codex' ? 3 : 1;

  if (!videoId || !userId || !inputType) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Deduct credits via Supabase RPC (1 for prefab, 3 for codex)
  let creditsDeducted = 0;
  for (let c = 0; c < creditCost; c++) {
    const { error } = await supabase.rpc('use_credit', { p_user_id: userId, p_video_id: videoId });
    if (error) {
      // Refund any credits already deducted
      for (let r = 0; r < creditsDeducted; r++) {
        await supabase.rpc('refund_credit', { p_user_id: userId, p_video_id: videoId });
      }
      await supabase.from('videos').delete().eq('id', videoId);
      const isCredit = error.message?.toLowerCase().includes('credit');
      res.status(402).json({ error: isCredit ? 'Insufficient credits' : `Credit deduction failed: ${error.message}` });
      return;
    }
    creditsDeducted++;
  }

  // Enqueue — forward all options
  const job = await videoQueue.add('generate-video', {
    videoId,
    userId,
    inputType,
    inputData,
    aspectRatio:      aspectRatio      ?? '16:9',
    resourcePaths:    resourcePaths    ?? [],
    voiceId:          voiceId          ?? 'auto',
    musicId:          musicId          ?? 'auto',
    userInstructions: userInstructions || undefined,
    generationMode,
    creditCost,
  }, {
    attempts: 2, backoff: { type: 'exponential', delay: 5000 },
  });

  res.json({ jobId: job.id, videoId });
});

jobsRouter.get('/:id', async (req, res) => {
  const job = await videoQueue.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ id: job.id, status: await job.getState(), progress: job.progress });
});
