import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import db from '../database.js';
import { logger } from '../logger.js';
import type { Goal } from '../types.js';

export const router = Router();

const prioritySchema = z.enum(['alta', 'media', 'baixa']);
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const goalPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    category: z.string().trim().min(1).max(120),
    target_amount: z.coerce
      .number()
      .refine((value) => Number.isFinite(value) && value >= 0, { message: 'Valor alvo inválido' }),
    current_amount: z.coerce
      .number()
      .refine((value) => Number.isFinite(value) && value >= 0, { message: 'Valor atual inválido' }),
    monthly_contribution: z.coerce
      .number()
      .refine(
        (value) => Number.isFinite(value) && value >= 0,
        { message: 'Aporte mensal inválido' },
      ),
    deadline: z
      .string()
      .trim()
      .regex(isoDateRegex, { message: 'Deadline deve estar no formato YYYY-MM-DD' }),
    priority: prioritySchema,
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .transform((value) => ({
    ...value,
    name: value.name.trim(),
    category: value.category.trim(),
    notes: value.notes?.trim() ?? '',
  }));

const withDerivedFields = (goal: Goal) => {
  const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;
  const remainingAmount = Math.max(goal.target_amount - goal.current_amount, 0);
  const monthlyContribution = goal.monthly_contribution > 0 ? goal.monthly_contribution : 1;
  const monthsToGoal = Math.ceil(remainingAmount / monthlyContribution);
  const deadlineDate = new Date(goal.deadline);
  const monthsUntilDeadline = Math.max(
    0,
    (deadlineDate.getFullYear() - new Date().getFullYear()) * 12 +
      (deadlineDate.getMonth() - new Date().getMonth()),
  );
  const status =
    progress >= 1
      ? 'completed'
      : monthsToGoal <= monthsUntilDeadline
        ? 'onTrack'
        : 'delayed';

  return { ...goal, progress, remainingAmount, monthsToGoal, status };
};

router.get('/', (_req, res) => {
  const goals = db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all() as Goal[];
  res.json({ data: goals.map(withDerivedFields) });
});

router.get('/summary', (_req, res) => {
  const goals = db.prepare('SELECT * FROM goals').all() as Goal[];
  const derived = goals.map(withDerivedFields);
  const totalTarget = derived.reduce((acc, g) => acc + g.target_amount, 0);
  const totalCurrent = derived.reduce((acc, g) => acc + g.current_amount, 0);
  const completed = derived.filter((g) => g.progress >= 1).length;
  const onTrack = derived.filter((g) => g.status === 'onTrack').length;

  res.json({ totalTarget, totalCurrent, completed, onTrack, goals: derived.length });
});

router.post('/', (req, res) => {
  const parsed = goalPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos para meta.',
      details: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;

  const id = randomUUID();
  db.prepare(
    `INSERT INTO goals (id, name, category, target_amount, current_amount, monthly_contribution, deadline, priority, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    payload.name,
    payload.category,
    payload.target_amount,
    payload.current_amount,
    payload.monthly_contribution,
    payload.deadline,
    payload.priority,
    payload.notes ?? '',
  );

  const created = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal;
  res.status(201).json(withDerivedFields(created));
});

router.put('/:id', (req, res) => {
  const parsed = goalPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Dados inválidos para atualizar meta.',
      details: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined;
  if (!existing) {
    return res.status(404).json({ message: 'Meta não encontrada.' });
  }

  db.prepare(
    `UPDATE goals
     SET name = ?, category = ?, target_amount = ?, current_amount = ?, monthly_contribution = ?, deadline = ?, priority = ?, notes = ?
     WHERE id = ?`,
  ).run(
    payload.name,
    payload.category,
    payload.target_amount,
    payload.current_amount,
    payload.monthly_contribution,
    payload.deadline,
    payload.priority,
    payload.notes ?? '',
    id,
  );

  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal;
  res.json(withDerivedFields(updated));
});

const contributionSchema = z.object({
  amount: z.coerce
    .number()
    .refine((value) => Number.isFinite(value) && value > 0, { message: 'Valor inválido' }),
});

router.post('/:id/contribute', (req, res) => {
  const parsed = contributionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Valor de contribuição inválido.',
      details: parsed.error.flatten(),
    });
  }

  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined;
  if (!existing) {
    return res.status(404).json({ message: 'Meta não encontrada.' });
  }

  const newAmount = existing.current_amount + parsed.data.amount;
  db.prepare('UPDATE goals SET current_amount = ? WHERE id = ?').run(newAmount, id);
  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal;
  res.json(withDerivedFields(updated));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  if (result.changes === 0) {
    logger.warn({ goalId: id }, 'Tentativa de excluir meta inexistente');
    return res.status(404).json({ message: 'Meta não encontrada.' });
  }
  res.status(204).send();
});
