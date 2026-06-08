import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../database.js';
import type { Investment, InvestmentTrade } from '../types.js';

export const router = Router();

const augmentInvestment = (investment: Investment) => {
  const totalValue = investment.quantity * investment.current_price;
  const investedValue = investment.quantity * investment.avg_price;
  const performance = investedValue > 0 ? (totalValue - investedValue) / investedValue : 0;
  return { ...investment, totalValue, investedValue, performance };
};

router.get('/', (_req, res) => {
  const investments = db.prepare('SELECT * FROM investments ORDER BY created_at DESC').all() as Investment[];
  const data = investments.map(augmentInvestment);
  res.json({ data });
});

router.get('/summary', (_req, res) => {
  const investments = db.prepare('SELECT * FROM investments').all() as Investment[];
  const augmented = investments.map(augmentInvestment);
  const totalValue = augmented.reduce((acc, item) => acc + item.totalValue, 0);
  const totalDividends = augmented.reduce((acc, item) => acc + item.dividends, 0);
  const allocationByType = augmented.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + item.totalValue;
    return acc;
  }, {});
  const performance = totalValue > 0
    ? augmented.reduce((acc, item) => acc + item.performance * (item.totalValue / totalValue), 0)
    : 0;

  res.json({ totalValue, totalDividends, performance, allocationByType });
});

router.get('/:symbol/trades', (req, res) => {
  const { symbol } = req.params;
  const trades = db.prepare('SELECT * FROM investment_trades WHERE symbol = ? ORDER BY executed_at DESC').all(symbol) as InvestmentTrade[];
  res.json({ data: trades });
});

router.post('/trade', (req, res) => {
  const { symbol, name, type, quantity, price, fees, executed_at, assetType } = req.body;

  if (!symbol || !name || !type || typeof quantity !== 'number' || typeof price !== 'number') {
    return res.status(400).json({ message: 'Invalid data for recording a trade.' });
  }

  const tradeType = type === 'sell' ? 'sell' : 'buy';
  const tradeId = randomUUID();
  const investment = db.prepare('SELECT * FROM investments WHERE symbol = ?').get(symbol) as Investment | undefined;
  const tradeFees = typeof fees === 'number' ? fees : 0;
  const when = executed_at ?? new Date().toISOString();

  if (!investment) {
    if (tradeType === 'sell') {
      return res.status(400).json({ message: 'Cannot sell an asset that is not in the portfolio.' });
    }

    const investmentId = randomUUID();
    const newQuantity = quantity;
    const avgPrice = (quantity * price + tradeFees) / Math.max(newQuantity, 1);
    const currentPrice = price;

    db.prepare(`INSERT INTO investments (id, symbol, name, type, quantity, avg_price, current_price, target_allocation, dividends)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(investmentId, symbol, name, assetType ?? 'ACAO', newQuantity, avgPrice, currentPrice, 0.1);

    db.prepare(`INSERT INTO investment_trades (id, investment_id, symbol, type, quantity, price, fees, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(tradeId, investmentId, symbol, tradeType, quantity, price, tradeFees, when);

    const created = db.prepare('SELECT * FROM investments WHERE id = ?').get(investmentId) as Investment;
    return res.status(201).json(augmentInvestment(created));
  }

  let newQuantity = investment.quantity;
  let newAvgPrice = investment.avg_price;

  if (tradeType === 'buy') {
    const totalInvested = investment.quantity * investment.avg_price + quantity * price + tradeFees;
    newQuantity = investment.quantity + quantity;
    newAvgPrice = newQuantity > 0 ? totalInvested / newQuantity : investment.avg_price;
  } else {
    if (quantity > investment.quantity) {
      return res.status(400).json({ message: 'Sell quantity is greater than the current position.' });
    }
    newQuantity = investment.quantity - quantity;
    if (newQuantity === 0) {
      newAvgPrice = 0;
    }
  }

  const newCurrentPrice = price;
  db.prepare('UPDATE investments SET quantity = ?, avg_price = ?, current_price = ? WHERE id = ?')
    .run(newQuantity, newAvgPrice, newCurrentPrice, investment.id);

  db.prepare(`INSERT INTO investment_trades (id, investment_id, symbol, type, quantity, price, fees, executed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(tradeId, investment.id, symbol, tradeType, quantity, price, tradeFees, when);

  const updated = db.prepare('SELECT * FROM investments WHERE id = ?').get(investment.id) as Investment;
  res.json(augmentInvestment(updated));
});

router.post('/:symbol/price', (req, res) => {
  const { symbol } = req.params;
  const { price } = req.body;
  if (typeof price !== 'number') {
    return res.status(400).json({ message: 'Invalid price.' });
  }
  const investment = db.prepare('SELECT * FROM investments WHERE symbol = ?').get(symbol) as Investment | undefined;
  if (!investment) {
    return res.status(404).json({ message: 'Asset not found.' });
  }
  db.prepare('UPDATE investments SET current_price = ? WHERE id = ?').run(price, investment.id);
  const updated = db.prepare('SELECT * FROM investments WHERE id = ?').get(investment.id) as Investment;
  res.json(augmentInvestment(updated));
});
