import crypto from 'node:crypto';
import { db } from '../database';

export interface BudgetDTO {
  id: string;
  category: string;
  limit: number;
  month: string;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface CreateBudgetInput {
  category: string;
  limit: number;
  month: string;
}

const budgetSelect = db.prepare(`
  SELECT id, category, budgetLimit, month
  FROM budgets
  WHERE month = @month
  ORDER BY category
`);

const insertBudget = db.prepare(`
  INSERT INTO budgets (id, category, budgetLimit, month)
  VALUES (@id, @category, @budgetLimit, @month)
`);

const spentByBudget = db.prepare(`
  SELECT COALESCE(SUM(ABS(amount)), 0) as spent
  FROM transactions
  WHERE type = 'expense'
    AND strftime('%Y-%m', date) = @month
    AND (category = @category OR category LIKE @categoryPrefix)
`);

export function listBudgets(month: string): BudgetDTO[] {
  const rows = budgetSelect.all({ month }) as { id: string; category: string; budgetLimit: number; month: string }[];

  return rows.map((row) => {
    const { spent } = spentByBudget.get({
      month: row.month,
      category: row.category,
      categoryPrefix: `${row.category}%`,
    }) as { spent: number };

    const remaining = row.budgetLimit - spent;
    const percentage = row.budgetLimit > 0 ? (spent / row.budgetLimit) * 100 : 0;

    return {
      id: row.id,
      category: row.category,
      limit: row.budgetLimit,
      month: row.month,
      spent,
      remaining,
      percentage,
    };
  });
}

export function createBudget(payload: CreateBudgetInput): BudgetDTO {
  const id = crypto.randomUUID();

  insertBudget.run({
    id,
    category: payload.category,
    budgetLimit: payload.limit,
    month: payload.month,
  });

  return {
    id,
    category: payload.category,
    limit: payload.limit,
    month: payload.month,
    spent: 0,
    remaining: payload.limit,
    percentage: 0,
  };
}
