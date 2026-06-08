import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import db from '../database.js';
import { logger } from '../logger.js';
import type { Budget } from '../types.js';

export const router = Router();

const budgetPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(120),
    limit: z.coerce
      .number()
      .refine((value) => Number.isFinite(value) && value >= 0, { message: 'Limite deve ser positivo' }),
    period: z.string().trim().min(1).max(50),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .transform((value) => ({
    ...value,
    name: value.name.trim(),
    category: value.category.trim(),
    period: value.period.trim(),
    notes: value.notes?.trim() ?? '',
  }));

const getCurrentPeriodRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

const mapBudgetWithUsage = (budget: Budget) => {
  const { start, end } = getCurrentPeriodRange();
  const row = db
    .prepare(
      `SELECT SUM(amount) AS total
       FROM transactions
       WHERE category = ?
         AND type = 'expense'
         AND date BETWEEN ? AND ?`,
    )
    .get(budget.category, start, end) as { total: number | null };
  const spent = row.total ?? 0;
  const remaining = budget.limit - spent;
  const usage = budget.limit > 0 ? spent / budget.limit : 0;
  return { ...budget, spent, remaining, usage };
};

router.get('/', (_req, res) => {
  const budgets = db.prepare('SELECT * FROM budgets ORDER BY created_at DESC').all() as Budget[];
  res.json({ data: budgets.map(mapBudgetWithUsage) });
});

router.get('/summary', (_req, res) => {
  const budgets = db.prepare('SELECT * FROM budgets').all() as Budget[];
  const withUsage = budgets.map(mapBudgetWithUsage);
  const totalLimit = withUsage.reduce((acc, item) => acc + item.limit, 0);
  const totalSpent = withUsage.reduce((acc, item) => acc + item.spent, 0);
  const exceeded = withUsage.filter((item) => item.usage > 1).length;
  const warning = withUsage.filter((item) => item.usage > 0.8 && item.usage <= 1).length;

  res.json({ totalLimit, totalSpent, exceeded, warning });
});

router.post('/', (req, res) => {
  const parsed = budgetPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid data for creating a budget.',
      details: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO budgets (id, name, category, "limit", period, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, payload.name, payload.category, payload.limit, payload.period, payload.notes ?? '');

  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget;
  res.status(201).json(mapBudgetWithUsage(budget));
});

router.put('/:id', (req, res) => {
  const parsed = budgetPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid data for updating a budget.',
      details: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget | undefined;
  if (!existing) {
    return res.status(404).json({ message: 'Budget not found.' });
  }

  db.prepare(
    `UPDATE budgets
     SET name = ?, category = ?, "limit" = ?, period = ?, notes = ?
     WHERE id = ?`,
  ).run(payload.name, payload.category, payload.limit, payload.period, payload.notes ?? '', id);

  const updated = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget;
  res.json(mapBudgetWithUsage(updated));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  if (result.changes === 0) {
    logger.warn({ budgetId: id }, 'Attempt to delete a non-existent budget');
    return res.status(404).json({ message: 'Budget not found.' });
  }
  res.status(204).send();
});
