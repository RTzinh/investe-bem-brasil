import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';

const customDbPath = process.env.SQLITE_PATH;
const resolvedDbPath = customDbPath ?? join(process.cwd(), 'backend', 'app', 'db', 'investebem.db');
const dataDir = dirname(resolvedDbPath);

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(resolvedDbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const shouldSeed = process.env.SEED_SAMPLE_DATA === 'true';

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    account TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    "limit" REAL NOT NULL,
    period TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL,
    monthly_contribution REAL NOT NULL,
    deadline TEXT NOT NULL,
    priority TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    avg_price REAL NOT NULL,
    current_price REAL NOT NULL,
    target_allocation REAL NOT NULL DEFAULT 0,
    dividends REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS investment_trades (
    id TEXT PRIMARY KEY,
    investment_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT CHECK(type IN ('buy','sell')) NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    fees REAL NOT NULL DEFAULT 0,
    executed_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE
  );`
];

for (const statement of createTableStatements) {
  try {
    db.prepare(statement).run();
  } catch (error) {
    logger.error({ err: error, statement }, 'Erro ao criar tabela');
    throw error;
  }
}

const existsData = (table: string) => {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
  return row.count > 0;
};

if (shouldSeed && !existsData('transactions')) {
  const insert = db.prepare(`INSERT INTO transactions (id, date, description, category, account, type, amount, notes)
    VALUES (@id, @date, @description, @category, @account, @type, @amount, @notes)`);
  const sample = [
    {
      date: new Date().toISOString().slice(0, 10),
      description: 'Salário CLT',
      category: 'Renda',
      account: 'Conta Corrente',
      type: 'income',
      amount: 8500,
      notes: 'Empresa XPTO'
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().slice(0, 10),
      description: 'Supermercado Bom Preço',
      category: 'Alimentação',
      account: 'Cartão Crédito',
      type: 'expense',
      amount: 420.35,
      notes: ''
    },
    {
      date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().slice(0, 10),
      description: 'Aluguel',
      category: 'Moradia',
      account: 'Conta Corrente',
      type: 'expense',
      amount: 2300,
      notes: ''
    }
  ];
  const insertMany = db.transaction((rows: typeof sample) => {
    rows.forEach((row) => insert.run({ ...row, id: randomUUID() }));
  });
  insertMany(sample);
}

if (shouldSeed && !existsData('budgets')) {
  const insert = db.prepare(`INSERT INTO budgets (id, name, category, "limit", period, notes)
    VALUES (@id, @name, @category, @limit, @period, @notes)`);
  const sample = [
    {
      name: 'Alimentação',
      category: 'Alimentação',
      limit: 1500,
      period: 'mensal',
      notes: 'Meta baseada na média dos últimos 3 meses'
    },
    {
      name: 'Transporte',
      category: 'Transporte',
      limit: 600,
      period: 'mensal',
      notes: ''
    },
    {
      name: 'Lazer',
      category: 'Lazer',
      limit: 500,
      period: 'mensal',
      notes: ''
    }
  ];
  const insertMany = db.transaction((rows: typeof sample) => {
    rows.forEach((row) => insert.run({ ...row, id: randomUUID() }));
  });
  insertMany(sample);
}

if (shouldSeed && !existsData('goals')) {
  const insert = db.prepare(`INSERT INTO goals (id, name, category, target_amount, current_amount, monthly_contribution, deadline, priority, notes)
    VALUES (@id, @name, @category, @target_amount, @current_amount, @monthly_contribution, @deadline, @priority, @notes)`);
  const today = new Date();
  const sample = [
    {
      name: 'Reserva de Emergência',
      category: 'Segurança',
      target_amount: 40000,
      current_amount: 22500,
      monthly_contribution: 2000,
      deadline: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString(),
      priority: 'alta',
      notes: 'Cobrir 12 meses de despesas'
    },
    {
      name: 'Viagem Internacional',
      category: 'Lazer',
      target_amount: 25000,
      current_amount: 8000,
      monthly_contribution: 1200,
      deadline: new Date(today.getFullYear(), today.getMonth() + 12, 1).toISOString(),
      priority: 'media',
      notes: ''
    }
  ];
  const insertMany = db.transaction((rows: typeof sample) => {
    rows.forEach((row) => insert.run({ ...row, id: randomUUID() }));
  });
  insertMany(sample);
}

if (shouldSeed && !existsData('investments')) {
  const insert = db.prepare(`INSERT INTO investments (id, symbol, name, type, quantity, avg_price, current_price, target_allocation, dividends)
    VALUES (@id, @symbol, @name, @type, @quantity, @avg_price, @current_price, @target_allocation, @dividends)`);
  const sample = [
    {
      symbol: 'PETR4',
      name: 'Petrobras PN',
      type: 'ACAO',
      quantity: 300,
      avg_price: 28.4,
      current_price: 31.2,
      target_allocation: 0.2,
      dividends: 1850
    },
    {
      symbol: 'IVVB11',
      name: 'ETF S&P 500',
      type: 'ETF',
      quantity: 45,
      avg_price: 220.5,
      current_price: 245.3,
      target_allocation: 0.25,
      dividends: 720
    },
    {
      symbol: 'CDB123',
      name: 'CDB Banco Digital 110% CDI',
      type: 'RF',
      quantity: 1,
      avg_price: 15000,
      current_price: 15850,
      target_allocation: 0.3,
      dividends: 0
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      type: 'CRIPTO',
      quantity: 0.35,
      avg_price: 145000,
      current_price: 178000,
      target_allocation: 0.1,
      dividends: 0
    }
  ];
  const insertMany = db.transaction((rows: typeof sample) => {
    rows.forEach((row) => insert.run({ ...row, id: randomUUID() }));
  });
  insertMany(sample);
}

export default db;
