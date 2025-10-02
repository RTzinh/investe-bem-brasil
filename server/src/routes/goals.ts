import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../database.js';
import type { Goal } from '../types.js';

export const router = Router();

const withDerivedFields = (goal: Goal) => {
  const progress = goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0;
  const remainingAmount = Math.max(goal.target_amount - goal.current_amount, 0);
  const monthlyContribution = goal.monthly_contribution > 0 ? goal.monthly_contribution : 1;
  const monthsToGoal = Math.ceil(remainingAmount / monthlyContribution);
  const deadlineDate = new Date(goal.deadline);
  const monthsUntilDeadline = Math.max(
    0,
    (deadlineDate.getFullYear() - new Date().getFullYear()) * 12 +
      (deadlineDate.getMonth() - new Date().getMonth())
  );
  const status = progress >= 1
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
  const { name, category, target_amount, current_amount, monthly_contribution, deadline, priority, notes } = req.body;

  if (!name || !category || typeof target_amount !== 'number' || typeof current_amount !== 'number' || typeof monthly_contribution !== 'number' || !deadline || !priority) {
    return res.status(400).json({ message: 'Dados inválidos para meta.' });
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO goals (id, name, category, target_amount, current_amount, monthly_contribution, deadline, priority, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, category, target_amount, current_amount, monthly_contribution, deadline, priority, notes ?? '');

  const created = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal;
  res.status(201).json(withDerivedFields(created));
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, target_amount, current_amount, monthly_contribution, deadline, priority, notes } = req.body;
  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined;
  if (!existing) {
    return res.status(404).json({ message: 'Meta não encontrada.' });
  }

  db.prepare(`UPDATE goals SET name = ?, category = ?, target_amount = ?, current_amount = ?, monthly_contribution = ?, deadline = ?, priority = ?, notes = ? WHERE id = ?`)
    .run(name, category, target_amount, current_amount, monthly_contribution, deadline, priority, notes ?? '', id);

  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal;
  res.json(withDerivedFields(updated));
});

router.post('/:id/contribute', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Valor de contribuição inválido.' });
  }

  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined;
  if (!existing) {
    return res.status(404).json({ message: 'Meta não encontrada.' });
  }

  const newAmount = existing.current_amount + amount;
  db.prepare('UPDATE goals SET current_amount = ? WHERE id = ?').run(newAmount, id);
  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal;
  res.json(withDerivedFields(updated));
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM goals WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'Meta não encontrada.' });
  }
  res.status(204).send();
});
