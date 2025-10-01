import crypto from 'node:crypto';
import { db } from '../database';

export interface GoalDTO {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  monthlyContribution: number;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  targetAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  monthlyContribution: number;
}

const goalSelect = db.prepare(`
  SELECT id, name, description, targetAmount, currentAmount, deadline, priority, category, monthlyContribution
  FROM goals
  ORDER BY deadline ASC
`);

const insertGoal = db.prepare(`
  INSERT INTO goals (id, name, description, targetAmount, currentAmount, deadline, priority, category, monthlyContribution)
  VALUES (@id, @name, @description, @targetAmount, @currentAmount, @deadline, @priority, @category, @monthlyContribution)
`);

const updateGoalAmount = db.prepare(`
  UPDATE goals
  SET currentAmount = currentAmount + @amount
  WHERE id = @id
`);

export function listGoals(): GoalDTO[] {
  return goalSelect.all() as GoalDTO[];
}

export function createGoal(payload: CreateGoalInput): GoalDTO {
  const id = crypto.randomUUID();
  const record = {
    id,
    name: payload.name,
    description: payload.description ?? null,
    targetAmount: payload.targetAmount,
    currentAmount: 0,
    deadline: new Date(payload.deadline).toISOString(),
    priority: payload.priority,
    category: payload.category,
    monthlyContribution: payload.monthlyContribution,
  };

  insertGoal.run(record);

  return {
    ...record,
    description: payload.description,
  };
}

export function contributeToGoal(id: string, amount: number): GoalDTO | null {
  updateGoalAmount.run({ id, amount });
  const select = db.prepare(`
    SELECT id, name, description, targetAmount, currentAmount, deadline, priority, category, monthlyContribution
    FROM goals WHERE id = ?
  `);
  const goal = select.get(id) as GoalDTO | undefined;
  return goal ?? null;
}

export function getEmergencyFundProgress() {
  const row = db.prepare(`
    SELECT currentAmount as current, targetAmount as target
    FROM goals
    WHERE lower(category) LIKE '%emerg%' OR lower(name) LIKE '%emerg%'
    ORDER BY targetAmount DESC
    LIMIT 1
  `).get() as { current: number; target: number } | undefined;

  if (!row) {
    return { current: 0, target: 0 };
  }

  return { current: row.current, target: row.target };
}
