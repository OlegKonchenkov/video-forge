import { Worker } from 'bullmq';
import { connection } from './index';
import { runVideoPipeline } from '../jobs/pipeline';
import dotenv from 'dotenv';
dotenv.config();

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

const worker = new Worker('video-generation', async (job) => {
  console.log(`[worker] Processing job ${job.id} — videoId: ${job.data.videoId}`);
  await runVideoPipeline(job);
  console.log(`[worker] Job ${job.id} completed`);
}, { connection, concurrency });

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} done`);
});

console.log(`[worker] Started with concurrency=${concurrency}`);
