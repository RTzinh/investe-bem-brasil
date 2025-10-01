import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  listTransactions,
  createTransaction,
  importTransactionsFromCsv,
  getCurrentMonthTotals,
  getTotalBalance,
} from './services/transactions';
import { listBudgets, createBudget } from './services/budgets';
import { listGoals, createGoal, contributeToGoal, getEmergencyFundProgress } from './services/goals';
import { listInvestments, registerTrade, getPortfolioTotals, getAllocationByType } from './services/investments';
import { buildInsights } from './services/insights';
import { getReportSummary } from './services/reports';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/dashboard/overview', (_req, res) => {
    const totals = getCurrentMonthTotals();
    const balance = getTotalBalance();
    const portfolio = getPortfolioTotals();
    const emergency = getEmergencyFundProgress();

    res.json({
      totalBalance: balance,
      monthlyIncome: totals.income,
      monthlyExpenses: totals.expenses,
      investments: portfolio.totalValue,
      dividends: portfolio.dividends,
      emergencyFund: emergency.current,
      emergencyGoal: emergency.target,
      portfolioPerformance: portfolio.performance,
    });
  });

  app.get('/api/transactions', (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const transactions = listTransactions(limit && Number.isFinite(limit) ? limit : undefined);
    res.json(transactions);
  });

  app.post('/api/transactions', (req, res) => {
    const { description, amount, type, category, date, account, tags } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ message: 'Descrição é obrigatória.' });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount)) {
      return res.status(400).json({ message: 'Valor inválido.' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Tipo inválido.' });
    }

    if (!date) {
      return res.status(400).json({ message: 'Data é obrigatória.' });
    }

    const transaction = createTransaction({
      description,
      amount: Math.abs(parsedAmount),
      type,
      category: category ?? 'Sem Categoria',
      date,
      account: account ?? 'Conta Padrão',
      tags,
    });

    res.status(201).json(transaction);
  });

  app.post('/api/transactions/import', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo não enviado.' });
    }

    const transactions = importTransactionsFromCsv(req.file.buffer);
    res.status(201).json({ imported: transactions.length, transactions });
  });

  app.get('/api/budgets', (req, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budgets = listBudgets(month ?? currentMonth);
    res.json(budgets);
  });

  app.post('/api/budgets', (req, res) => {
    const { category, limit, month } = req.body;

    if (!category || !limit || !month) {
      return res.status(400).json({ message: 'Categoria, limite e mês são obrigatórios.' });
    }

    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: 'Limite inválido.' });
    }

    const budget = createBudget({ category, limit: parsedLimit, month });
    res.status(201).json(budget);
  });

  app.get('/api/goals', (_req, res) => {
    const goals = listGoals();
    res.json(goals);
  });

  app.post('/api/goals', (req, res) => {
    const { name, description, targetAmount, deadline, priority, category, monthlyContribution } = req.body;

    if (!name || !targetAmount || !deadline) {
      return res.status(400).json({ message: 'Nome, valor e prazo são obrigatórios.' });
    }

    const goal = createGoal({
      name,
      description,
      targetAmount: Number(targetAmount),
      deadline,
      priority: priority ?? 'medium',
      category: category ?? 'Outros',
      monthlyContribution: Number(monthlyContribution ?? 0),
    });

    res.status(201).json(goal);
  });

  app.post('/api/goals/:id/contribute', (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: 'Valor da contribuição inválido.' });
    }

    const goal = contributeToGoal(id, value);
    if (!goal) {
      return res.status(404).json({ message: 'Meta não encontrada.' });
    }

    res.json(goal);
  });

  app.get('/api/investments', (_req, res) => {
    const investments = listInvestments();
    res.json({
      investments,
      totals: getPortfolioTotals(),
      allocation: getAllocationByType(),
    });
  });

  app.post('/api/investments/trades', (req, res) => {
    const { symbol, type, quantity, price, fees, assetType, name, tradeDate } = req.body;

    if (!symbol || !type || !quantity || !price) {
      return res.status(400).json({ message: 'Símbolo, tipo, quantidade e preço são obrigatórios.' });
    }

    if (type !== 'buy' && type !== 'sell') {
      return res.status(400).json({ message: 'Tipo de operação inválido.' });
    }

    const trade = registerTrade({
      symbol,
      type,
      quantity: Number(quantity),
      price: Number(price),
      fees: Number(fees ?? 0),
      assetType,
      name,
      tradeDate,
    });

    res.status(201).json(trade);
  });

  app.get('/api/insights', (_req, res) => {
    const insights = buildInsights();
    res.json(insights);
  });

  app.get('/api/reports/summary', (req, res) => {
    const months = req.query.months ? Number(req.query.months) : 6;
    const summary = getReportSummary(Number.isFinite(months) && months > 0 ? months : 6);
    res.json(summary);
  });

  // Error handling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API ERROR]', error);
    res.status(500).json({ message: 'Ocorreu um erro inesperado.' });
  });

  return app;
}
