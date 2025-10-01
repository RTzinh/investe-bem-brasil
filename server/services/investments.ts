import crypto from 'node:crypto';
import { db } from '../database';

export interface InvestmentDTO {
  id: string;
  symbol: string;
  name: string;
  assetType: 'ACAO' | 'ETF' | 'FII' | 'RF' | 'CRIPTO';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  performance: number;
  dividends: number;
  lastUpdate: string;
}

export interface TradeInput {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  assetType?: InvestmentDTO['assetType'];
  name?: string;
  tradeDate?: string;
}

const selectInvestments = db.prepare(`
  SELECT id, symbol, name, assetType, quantity, avgPrice, currentPrice, totalValue, performance, dividends, lastUpdate
  FROM investments
  ORDER BY totalValue DESC
`);

const selectInvestmentBySymbol = db.prepare(`
  SELECT id, symbol, name, assetType, quantity, avgPrice, currentPrice, totalValue, performance, dividends, lastUpdate
  FROM investments
  WHERE symbol = ?
`);

const insertInvestment = db.prepare(`
  INSERT INTO investments (id, symbol, name, assetType, quantity, avgPrice, currentPrice, totalValue, performance, dividends, lastUpdate)
  VALUES (@id, @symbol, @name, @assetType, @quantity, @avgPrice, @currentPrice, @totalValue, @performance, @dividends, @lastUpdate)
`);

const updateInvestment = db.prepare(`
  UPDATE investments
  SET quantity = @quantity,
      avgPrice = @avgPrice,
      currentPrice = @currentPrice,
      totalValue = @totalValue,
      performance = @performance,
      lastUpdate = @lastUpdate
  WHERE id = @id
`);

const insertTrade = db.prepare(`
  INSERT INTO trades (id, symbol, type, quantity, price, fees, tradeDate)
  VALUES (@id, @symbol, @type, @quantity, @price, @fees, @tradeDate)
`);

export function listInvestments(): InvestmentDTO[] {
  return selectInvestments.all() as InvestmentDTO[];
}

export function registerTrade(payload: TradeInput): InvestmentDTO {
  const existing = selectInvestmentBySymbol.get(payload.symbol) as InvestmentDTO | undefined;
  const tradeId = crypto.randomUUID();
  const tradeDate = payload.tradeDate ? new Date(payload.tradeDate).toISOString() : new Date().toISOString();

  insertTrade.run({
    id: tradeId,
    symbol: payload.symbol,
    type: payload.type,
    quantity: payload.quantity,
    price: payload.price,
    fees: payload.fees,
    tradeDate,
  });

  const quantityDelta = payload.type === 'buy' ? payload.quantity : -payload.quantity;
  const grossTradeValue = payload.price * payload.quantity;
  const netTradeValue = payload.type === 'buy' ? grossTradeValue + payload.fees : grossTradeValue - payload.fees;

  if (!existing) {
    const isBuy = payload.type === 'buy';
    const quantity = isBuy ? Math.max(payload.quantity, 0) : 0;
    const avgPrice = isBuy ? payload.price : 0;
    const currentPrice = payload.price;
    const totalValue = quantity * currentPrice;
    const performance = 0;
    const investment: InvestmentDTO = {
      id: crypto.randomUUID(),
      symbol: payload.symbol,
      name: payload.name ?? payload.symbol,
      assetType: payload.assetType ?? 'ACAO',
      quantity,
      avgPrice,
      currentPrice,
      totalValue,
      performance,
      dividends: 0,
      lastUpdate: tradeDate,
    };

    insertInvestment.run(investment);
    return investment;
  }

  let newQuantity = existing.quantity + quantityDelta;
  if (newQuantity < 0) {
    newQuantity = 0;
  }

  let newAvgPrice = existing.avgPrice;
  if (payload.type === 'buy') {
    const totalCost = existing.avgPrice * existing.quantity;
    newAvgPrice = newQuantity > 0 ? (totalCost + netTradeValue) / newQuantity : 0;
  }

  const currentPrice = payload.price;
  const totalValue = newQuantity * currentPrice;
  const performance = newAvgPrice > 0 ? ((currentPrice - newAvgPrice) / newAvgPrice) * 100 : 0;

  const updated: InvestmentDTO = {
    ...existing,
    quantity: newQuantity,
    avgPrice: newAvgPrice,
    currentPrice,
    totalValue,
    performance,
    lastUpdate: tradeDate,
  };

  updateInvestment.run(updated);

  return updated;
}

export function getPortfolioTotals() {
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(totalValue), 0) as totalValue,
      COALESCE(SUM(dividends), 0) as dividends
    FROM investments
  `).get() as { totalValue: number; dividends: number };

  const performanceRow = db.prepare(`
    SELECT
      COALESCE(SUM(performance * totalValue), 0) AS weightedPerformance,
      COALESCE(SUM(totalValue), 0) AS total
    FROM investments
  `).get() as { weightedPerformance: number; total: number };

  const performance = performanceRow.total > 0 ? performanceRow.weightedPerformance / performanceRow.total : 0;

  return {
    totalValue: totals.totalValue,
    dividends: totals.dividends,
    performance,
  };
}

export function getAllocationByType() {
  const rows = db.prepare(`
    SELECT assetType, COALESCE(SUM(totalValue), 0) as total
    FROM investments
    GROUP BY assetType
  `).all() as { assetType: InvestmentDTO['assetType']; total: number }[];

  const total = rows.reduce((acc, row) => acc + row.total, 0);

  return {
    total,
    breakdown: rows.map((row) => ({
      assetType: row.assetType,
      value: row.total,
      percentage: total > 0 ? (row.total / total) * 100 : 0,
    })),
  };
}
