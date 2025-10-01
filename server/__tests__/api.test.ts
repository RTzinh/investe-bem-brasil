import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { resetDatabase, seedDatabase } from '../seed';

let app: ReturnType<typeof createApp>;

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  resetDatabase();
  seedDatabase();
});

describe('Transactions API', () => {
  it('imports transactions from CSV and exposes them through the listing endpoint', async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);

    const csv = `Descrição,Valor,Data,Categoria,Conta\n` +
      `Pagamento Cliente,1500,${dateStr},Receitas,Conta Corrente\n` +
      `Supermercado,-250,${dateStr},Alimentação,Cartão de Crédito`;

    const response = await request(app)
      .post('/api/transactions/import')
      .attach('file', Buffer.from(csv, 'utf-8'), 'extrato.csv');

    expect(response.status).toBe(201);
    expect(response.body.imported).toBe(2);

    const list = await request(app).get('/api/transactions');
    const descriptions = list.body.map((txn: { description: string }) => txn.description);

    expect(descriptions).toContain('Pagamento Cliente');
    expect(descriptions).toContain('Supermercado');
  });
});

describe('Budgets API', () => {
  it('calculates spent amount using current month expenses', async () => {
    const now = new Date();
    const month = monthKey(now);

    await request(app).post('/api/transactions').send({
      description: 'Corrida de aplicativo',
      amount: 150,
      type: 'expense',
      category: 'Transporte > Mobilidade',
      date: now.toISOString(),
      account: 'Cartão de Crédito',
    });

    const res = await request(app).get(`/api/budgets?month=${month}`);

    expect(res.status).toBe(200);

    const transporte = res.body.find((budget: { category: string }) => budget.category === 'Transporte');

    expect(transporte).toBeDefined();
    expect(transporte.spent).toBeCloseTo(150, 2);
    expect(transporte.remaining).toBeCloseTo(transporte.limit - 150, 2);
  });
});

describe('Goals API', () => {
  it('increments the current amount when contributing to a goal', async () => {
    const goalsRes = await request(app).get('/api/goals');

    const goal = goalsRes.body[0];
    expect(goal).toBeDefined();

    const contribution = 500;

    const contributeRes = await request(app)
      .post(`/api/goals/${goal.id}/contribute`)
      .send({ amount: contribution });

    expect(contributeRes.status).toBe(200);
    expect(contributeRes.body.currentAmount).toBeCloseTo(goal.currentAmount + contribution, 2);
  });
});

describe('Investments API', () => {
  it('updates holdings after recording a trade', async () => {
    const tradeRes = await request(app).post('/api/investments/trades').send({
      symbol: 'BOVA11',
      type: 'buy',
      quantity: 10,
      price: 110,
      fees: 10,
    });

    expect(tradeRes.status).toBe(201);
    expect(tradeRes.body.symbol).toBe('BOVA11');
    expect(tradeRes.body.quantity).toBeCloseTo(110, 5);
    expect(tradeRes.body.avgPrice).toBeGreaterThan(98.5);

    const investmentsRes = await request(app).get('/api/investments');
    expect(investmentsRes.status).toBe(200);

    const updated = investmentsRes.body.investments.find((investment: { symbol: string }) => investment.symbol === 'BOVA11');
    expect(updated).toBeDefined();
    expect(updated.quantity).toBeCloseTo(110, 5);
    expect(investmentsRes.body.totals.totalValue).toBeGreaterThan(0);
  });
});

describe('Reports API', () => {
  it('aggregates cash flow and categories for the requested period', async () => {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    await request(app).post('/api/transactions').send({
      description: 'Consultoria',
      amount: 2000,
      type: 'income',
      category: 'Serviços',
      date: lastMonthDate.toISOString(),
      account: 'Conta Corrente',
    });

    await request(app).post('/api/transactions').send({
      description: 'Viagem a trabalho',
      amount: 800,
      type: 'expense',
      category: 'Viagens',
      date: lastMonthDate.toISOString(),
      account: 'Cartão Corporativo',
    });

    await request(app).post('/api/investments/trades').send({
      symbol: 'ITSA4',
      type: 'buy',
      quantity: 20,
      price: 10,
      fees: 2,
      assetType: 'ACAO',
      name: 'Itaúsa PN',
      tradeDate: lastMonthDate.toISOString(),
    });

    const summaryRes = await request(app).get('/api/reports/summary?months=2');

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.cashFlow).toHaveLength(2);

    const lastMonthKey = monthKey(lastMonthDate);
    const lastMonthFlow = summaryRes.body.cashFlow.find((row: { month: string }) => row.month === lastMonthKey);

    expect(lastMonthFlow).toBeDefined();
    expect(lastMonthFlow.income).toBeGreaterThanOrEqual(2000);
    expect(lastMonthFlow.expenses).toBeGreaterThanOrEqual(800);
    expect(summaryRes.body.totals.totalInvested).toBeGreaterThan(0);
    expect(Array.isArray(summaryRes.body.categories)).toBe(true);
    expect(summaryRes.body.categories.length).toBeGreaterThan(0);
  });
});
