import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { jobsRouter } from './jobs';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('short'));

// Auth middleware
app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== process.env.API_SECRET_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

app.use('/jobs', jobsRouter);
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Worker API on :${PORT}`));
export default app;
