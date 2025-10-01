import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTestEnv = process.env.NODE_ENV === 'test';

let databasePath = ':memory:';

if (!isTestEnv) {
  const dataDir = path.resolve(__dirname, '../data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  databasePath = path.join(dataDir, 'app.db');
}

export const db = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
      category TEXT,
      date TEXT NOT NULL,
      account TEXT,
      tags TEXT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      budgetLimit REAL NOT NULL,
      month TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      targetAmount REAL NOT NULL,
      currentAmount REAL NOT NULL DEFAULT 0,
      deadline TEXT NOT NULL,
      priority TEXT CHECK(priority IN ('low','medium','high')) NOT NULL,
      category TEXT,
      monthlyContribution REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      assetType TEXT NOT NULL,
      quantity REAL NOT NULL,
      avgPrice REAL NOT NULL,
      currentPrice REAL NOT NULL,
      totalValue REAL NOT NULL,
      performance REAL NOT NULL,
      dividends REAL NOT NULL DEFAULT 0,
      lastUpdate TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      type TEXT CHECK(type IN ('buy','sell')) NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      fees REAL NOT NULL DEFAULT 0,
      tradeDate TEXT NOT NULL
    );
  `);
}

initializeDatabase();
