import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router as apiRouter } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(cors({ origin: '*', credentials: false }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', apiRouter);

  app.use('/static', express.static(path.join(__dirname, '../static')));

  return app;
};
