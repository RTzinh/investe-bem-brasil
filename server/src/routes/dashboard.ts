import { Router } from 'express';
import db from '../database.js';
import type { Budget, Goal, Investment, Transaction } from '../types.js';

export const router = Router();

router.get('/overview', (_req, res) => {
  const totals = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
    FROM transactions
  `).get() as { income: number | null; expenses: number | null };

  const income = totals.income ?? 0;
  const expenses = totals.expenses ?? 0;
  const balance = income - expenses;

  const investments = db.prepare('SELECT * FROM investments').all() as Investment[];
  const totalInvestments = investments.reduce((acc, inv) => acc + inv.quantity * inv.current_price, 0);
  const totalDividends = investments.reduce((acc, inv) => acc + inv.dividends, 0);

  const budgets = db.prepare('SELECT * FROM budgets').all() as Budget[];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const budgetUsage = budgets.map((budget) => {
    const row = db.prepare(
      `SELECT SUM(amount) AS total FROM transactions WHERE category = ? AND type = 'expense' AND date BETWEEN ? AND ?`
    ).get(budget.category, start, end) as { total: number | null };
    const spent = row.total ?? 0;
    const usage = budget.limit > 0 ? spent / budget.limit : 0;
    return { ...budget, spent, usage };
  });
  const warningBudgets = budgetUsage.filter((item) => item.usage > 0.8 && item.usage <= 1).length;
  const exceededBudgets = budgetUsage.filter((item) => item.usage > 1).length;

  const goals = db.prepare('SELECT * FROM goals').all() as Goal[];
  const goalsProgress = goals.map((goal) => ({
    ...goal,
    progress: goal.target_amount > 0 ? goal.current_amount / goal.target_amount : 0,
  }));
  const completedGoals = goalsProgress.filter((goal) => goal.progress >= 1).length;

  const recentTransactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT 5').all() as Transaction[];

  res.json({
    metrics: {
      income,
      expenses,
      balance,
      totalInvestments,
      totalDividends,
      warningBudgets,
      exceededBudgets,
      completedGoals,
    },
    recentTransactions,
    budgets: budgetUsage,
    goals: goalsProgress,
    investments: investments.map((inv) => ({
      ...inv,
      totalValue: inv.quantity * inv.current_price,
      performance: inv.avg_price > 0 ? (inv.current_price - inv.avg_price) / inv.avg_price : 0,
    })),
  });
});
