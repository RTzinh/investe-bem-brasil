import { Router } from 'express';
import { fetchFastApiInsights } from '../services/fastapi.js';

export const router = Router();

router.get('/insights', async (_req, res, next) => {
  try {
    const insights = await fetchFastApiInsights();
    res.json({ data: insights });
  } catch (error) {
    next(error);
  }
});
