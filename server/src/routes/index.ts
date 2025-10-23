import { Router } from 'express';
import { router as transactionsRouter } from './transactions.js';
import { router as budgetsRouter } from './budgets.js';
import { router as goalsRouter } from './goals.js';
import { router as investmentsRouter } from './investments.js';
import { router as reportsRouter } from './reports.js';
import { router as dashboardRouter } from './dashboard.js';
import { router as assistantRouter } from './assistant.js';
import { router as aiRouter } from './ai.js';

export const router = Router();

router.use('/transactions', transactionsRouter);
router.use('/budgets', budgetsRouter);
router.use('/goals', goalsRouter);
router.use('/investments', investmentsRouter);
router.use('/reports', reportsRouter);
router.use('/dashboard', dashboardRouter);
router.use('/assistant', assistantRouter);
router.use('/ai', aiRouter);
