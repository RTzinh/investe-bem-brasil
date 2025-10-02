import { Router } from 'express';
import db from '../database.js';

export const router = Router();

const getDateRange = (period: string | undefined) => {
  const now = new Date();
  const months = period === '12m' ? 12 : period === '3m' ? 3 : 6;
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), months };
};

router.get('/cashflow', (req, res) => {
  const { period } = req.query;
  const { start, end } = getDateRange(typeof period === 'string' ? period : undefined);
  const rows = db.prepare(
    `SELECT substr(date, 1, 7) AS month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
     FROM transactions
     WHERE date BETWEEN ? AND ?
     GROUP BY month
     ORDER BY month`
  ).all(start, end) as { month: string; income: number | null; expenses: number | null }[];

  const data = rows.map((row) => ({
    month: row.month,
    income: row.income ?? 0,
    expenses: row.expenses ?? 0,
    balance: (row.income ?? 0) - (row.expenses ?? 0),
  }));

  res.json({ data });
});

router.get('/categories', (req, res) => {
  const { period } = req.query;
  const { start, end } = getDateRange(typeof period === 'string' ? period : undefined);
  const rows = db.prepare(
    `SELECT category,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income
     FROM transactions
     WHERE date BETWEEN ? AND ?
     GROUP BY category
     ORDER BY expenses DESC`
  ).all(start, end) as { category: string; expenses: number | null; income: number | null }[];

  const data = rows.map((row) => ({
    category: row.category,
    expenses: row.expenses ?? 0,
    income: row.income ?? 0,
    net: (row.income ?? 0) - (row.expenses ?? 0),
  }));

  res.json({ data });
});

router.get('/overview', (req, res) => {
  const { period } = req.query;
  const { start, end } = getDateRange(typeof period === 'string' ? period : undefined);
  const totals = db.prepare(
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
     FROM transactions
     WHERE date BETWEEN ? AND ?`
  ).get(start, end) as { income: number | null; expenses: number | null };

  const income = totals.income ?? 0;
  const expenses = totals.expenses ?? 0;
  const balance = income - expenses;

  res.json({ income, expenses, balance });
});
