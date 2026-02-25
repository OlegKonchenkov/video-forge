import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

export const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

export const videoQueue = new Queue('video-generation', { connection });
