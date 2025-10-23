import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { requireApiKey } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './logger.js';
import { router as apiRouter } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: '*', credentials: false }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.path === '/health',
      },
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', apiRateLimiter, requireApiKey, apiRouter);

  app.use('/static', express.static(path.join(__dirname, '../static')));

  app.use((req, _res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    (error as Error & { status?: number }).status = 404;
    next(error);
  });

  app.use(errorHandler);

  return app;
};
