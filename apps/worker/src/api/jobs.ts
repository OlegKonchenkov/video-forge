import { Router } from 'express';
import { videoQueue } from '../queue';
import { supabase } from '../lib/supabase';

export const jobsRouter = Router();

jobsRouter.post('/', async (req, res) => {
  const { videoId, userId, inputType, inputData } = req.body;
  if (!videoId || !userId || !inputType) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Deduct credit via Supabase RPC
  const { error } = await supabase.rpc('use_credit', { p_user_id: userId, p_video_id: videoId });
  if (error) {
    res.status(402).json({ error: 'Insufficient credits' });
    return;
  }

  // Enqueue
  const job = await videoQueue.add('generate-video', { videoId, userId, inputType, inputData }, {
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
