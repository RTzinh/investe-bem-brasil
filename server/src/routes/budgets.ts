import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../database.js';
import type { Budget } from '../types.js';

export const router = Router();

const getCurrentPeriodRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

const mapBudgetWithUsage = (budget: Budget) => {
  const { start, end } = getCurrentPeriodRange();
  const row = db.prepare(
    `SELECT SUM(amount) AS total FROM transactions WHERE category = ? AND type = 'expense' AND date BETWEEN ? AND ?`
  ).get(budget.category, start, end) as { total: number | null };
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
  const { name, category, limit, period, notes } = req.body;

  if (!name || !category || typeof limit !== 'number' || !period) {
    return res.status(400).json({ message: 'Dados inválidos para criar orçamento.' });
  }

  const id = randomUUID();
  db.prepare(`INSERT INTO budgets (id, name, category, "limit", period, notes) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, name, category, limit, period, notes ?? '');

  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget;
  res.status(201).json(mapBudgetWithUsage(budget));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, limit, period, notes } = req.body;
  const existing = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget | undefined;
  if (!existing) {
    return res.status(404).json({ message: 'Orçamento não encontrado.' });
  }

  db.prepare(`UPDATE budgets SET name = ?, category = ?, "limit" = ?, period = ?, notes = ? WHERE id = ?`)
    .run(name, category, limit, period, notes ?? '', id);

  const updated = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as Budget;
  res.json(mapBudgetWithUsage(updated));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'Orçamento não encontrado.' });
  }
  res.status(204).send();
});
