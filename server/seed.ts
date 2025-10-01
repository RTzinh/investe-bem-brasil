import crypto from 'node:crypto';
import { db } from './database';

function tableIsEmpty(table: string) {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
  return row.count === 0;
}

export function seedDatabase() {
  if (tableIsEmpty('transactions')) {
    const insert = db.prepare(`
      INSERT INTO transactions (id, description, amount, type, category, date, account, tags)
      VALUES (@id, @description, @amount, @type, @category, @date, @account, @tags)
    `);

    const now = new Date();
    const baseMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = [
      {
        id: crypto.randomUUID(),
        description: 'Salário - Empresa XYZ',
        amount: 8500,
        type: 'income',
        category: 'Salário',
        date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 5).toISOString(),
        account: 'Conta Corrente',
        tags: JSON.stringify(['receita', 'principal']),
      },
      {
        id: crypto.randomUUID(),
        description: 'Supermercado Extra',
        amount: -245.8,
        type: 'expense',
        category: 'Alimentação > Mercado',
        date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 4).toISOString(),
        account: 'Cartão de Crédito',
        tags: JSON.stringify(['alimentação']),
      },
      {
        id: crypto.randomUUID(),
        description: 'Investimento - BOVA11',
        amount: -1000,
        type: 'expense',
        category: 'Investimentos',
        date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 3).toISOString(),
        account: 'Corretora',
        tags: JSON.stringify(['investimento']),
      },
      {
        id: crypto.randomUUID(),
        description: 'Freelance - Projeto ABC',
        amount: 1200,
        type: 'income',
        category: 'Freelance',
        date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 2).toISOString(),
        account: 'Conta Corrente',
        tags: JSON.stringify(['freelance']),
      },
      {
        id: crypto.randomUUID(),
        description: 'Aluguel',
        amount: -1800,
        type: 'expense',
        category: 'Moradia > Aluguel',
        date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 1).toISOString(),
        account: 'Conta Corrente',
        tags: JSON.stringify(['moradia']),
      },
    ];

    const insertMany = db.transaction((rows: typeof transactions) => {
      for (const row of rows) {
        insert.run(row);
      }
    });

    insertMany(transactions);
  }

  if (tableIsEmpty('budgets')) {
    const insert = db.prepare(`
      INSERT INTO budgets (id, category, budgetLimit, month)
      VALUES (@id, @category, @budgetLimit, @month)
    `);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budgets = [
      { id: crypto.randomUUID(), category: 'Alimentação', budgetLimit: 1000, month: currentMonth },
      { id: crypto.randomUUID(), category: 'Transporte', budgetLimit: 500, month: currentMonth },
      { id: crypto.randomUUID(), category: 'Lazer', budgetLimit: 300, month: currentMonth },
      { id: crypto.randomUUID(), category: 'Saúde', budgetLimit: 400, month: currentMonth },
    ];

    const insertMany = db.transaction((rows: typeof budgets) => {
      for (const row of rows) {
        insert.run(row);
      }
    });

    insertMany(budgets);
  }

  if (tableIsEmpty('goals')) {
    const insert = db.prepare(`
      INSERT INTO goals (id, name, description, targetAmount, currentAmount, deadline, priority, category, monthlyContribution)
      VALUES (@id, @name, @description, @targetAmount, @currentAmount, @deadline, @priority, @category, @monthlyContribution)
    `);

    const goals = [
      {
        id: crypto.randomUUID(),
        name: 'Reserva de Emergência',
        description: '6 meses de despesas essenciais',
        targetAmount: 24000,
        currentAmount: 18000,
        deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
        priority: 'high',
        category: 'Emergência',
        monthlyContribution: 1000,
      },
      {
        id: crypto.randomUUID(),
        name: 'Viagem para Europa',
        description: 'Férias de 15 dias na Europa',
        targetAmount: 15000,
        currentAmount: 4500,
        deadline: new Date(new Date().getFullYear(), 6, 1).toISOString(),
        priority: 'medium',
        category: 'Lazer',
        monthlyContribution: 1750,
      },
      {
        id: crypto.randomUUID(),
        name: 'Notebook Novo',
        description: 'MacBook Pro para trabalho',
        targetAmount: 8000,
        currentAmount: 2400,
        deadline: new Date(new Date().getFullYear(), 4, 1).toISOString(),
        priority: 'medium',
        category: 'Equipamentos',
        monthlyContribution: 800,
      },
    ];

    const insertMany = db.transaction((rows: typeof goals) => {
      for (const row of rows) {
        insert.run(row);
      }
    });

    insertMany(goals);
  }

  if (tableIsEmpty('investments')) {
    const insert = db.prepare(`
      INSERT INTO investments (id, symbol, name, assetType, quantity, avgPrice, currentPrice, totalValue, performance, dividends, lastUpdate)
      VALUES (@id, @symbol, @name, @assetType, @quantity, @avgPrice, @currentPrice, @totalValue, @performance, @dividends, @lastUpdate)
    `);

    const nowIso = new Date().toISOString();

    const investments = [
      {
        id: crypto.randomUUID(),
        symbol: 'BOVA11',
        name: 'iShares Ibovespa ETF',
        assetType: 'ETF',
        quantity: 100,
        avgPrice: 98.5,
        currentPrice: 108.2,
        totalValue: 10820,
        performance: ((108.2 - 98.5) / 98.5) * 100,
        dividends: 145.3,
        lastUpdate: nowIso,
      },
      {
        id: crypto.randomUUID(),
        symbol: 'PETR4',
        name: 'Petrobras PN',
        assetType: 'ACAO',
        quantity: 200,
        avgPrice: 28.45,
        currentPrice: 32.1,
        totalValue: 6420,
        performance: ((32.1 - 28.45) / 28.45) * 100,
        dividends: 280.5,
        lastUpdate: nowIso,
      },
      {
        id: crypto.randomUUID(),
        symbol: 'MXRF11',
        name: 'Maxi Renda FII',
        assetType: 'FII',
        quantity: 300,
        avgPrice: 9.8,
        currentPrice: 10.45,
        totalValue: 3135,
        performance: ((10.45 - 9.8) / 9.8) * 100,
        dividends: 189.7,
        lastUpdate: nowIso,
      },
      {
        id: crypto.randomUUID(),
        symbol: 'TESOURO_SELIC',
        name: 'Tesouro Selic 2029',
        assetType: 'RF',
        quantity: 1,
        avgPrice: 12000,
        currentPrice: 12624,
        totalValue: 12624,
        performance: ((12624 - 12000) / 12000) * 100,
        dividends: 0,
        lastUpdate: nowIso,
      },
    ];

    const insertMany = db.transaction((rows: typeof investments) => {
      for (const row of rows) {
        insert.run(row);
      }
    });

    insertMany(investments);
  }
}

export function resetDatabase() {
  db.exec(`
    DELETE FROM transactions;
    DELETE FROM budgets;
    DELETE FROM goals;
    DELETE FROM investments;
    DELETE FROM trades;
  `);
}
