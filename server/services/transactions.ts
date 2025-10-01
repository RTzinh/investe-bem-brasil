import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { db } from '../database';

export interface TransactionDTO {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  account: string;
  tags?: string[];
}

export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  account: string;
  tags?: string[];
}

const transactionSelect = db.prepare(`
  SELECT id, description, amount, type, category, date, account, tags
  FROM transactions
  ORDER BY date DESC, rowid DESC
  LIMIT COALESCE(@limit, -1)
`);

export function listTransactions(limit?: number): TransactionDTO[] {
  const rows = transactionSelect.all({ limit }) as Omit<TransactionDTO, 'tags'> & { tags: string | null }[];
  return rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
  }));
}

const insertTransaction = db.prepare(`
  INSERT INTO transactions (id, description, amount, type, category, date, account, tags)
  VALUES (@id, @description, @amount, @type, @category, @date, @account, @tags)
`);

export function createTransaction(payload: CreateTransactionInput): TransactionDTO {
  const id = crypto.randomUUID();
  const normalizedDate = new Date(payload.date).toISOString();
  const amount = payload.type === 'expense' && payload.amount > 0 ? -payload.amount : payload.amount;

  const record = {
    id,
    description: payload.description,
    amount,
    type: payload.type,
    category: payload.category,
    date: normalizedDate,
    account: payload.account,
    tags: payload.tags && payload.tags.length > 0 ? JSON.stringify(payload.tags) : null,
  };

  insertTransaction.run(record);

  return {
    ...payload,
    id,
    amount,
    date: normalizedDate,
    tags: payload.tags,
  };
}

interface CsvTransaction {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  account: string;
}

function detectDelimiter(sample: string): string {
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  if (semicolonCount > commaCount) return ';';
  return ',';
}

function parseAmount(value: string): number {
  const normalized = value
    .replace(/R\$|\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount)) {
    return 0;
  }
  return amount;
}

function mapCsvRecord(record: Record<string, string>): CsvTransaction | null {
  const entries = Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = (value ?? '').trim();
    return acc;
  }, {});

  const description = entries['description'] || entries['descrição'] || entries['descricao'] || entries['historico'] || entries['histórico'];
  const amountRaw = entries['amount'] || entries['valor'] || entries['value'];
  const dateRaw = entries['date'] || entries['data'];
  const category = entries['category'] || entries['categoria'] || entries['classificacao'] || entries['classificação'] || 'Sem Categoria';
  const account = entries['account'] || entries['conta'] || 'Conta Importada';

  if (!description || !amountRaw || !dateRaw) {
    return null;
  }

  const amount = parseAmount(amountRaw);
  const type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense';

  let parsedDate = new Date(dateRaw);
  if (Number.isNaN(parsedDate.getTime())) {
    // Try Brazilian format dd/mm/yyyy
    const [day, month, year] = dateRaw.split(/[\/\-]/);
    if (day && month && year) {
      parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  if (Number.isNaN(parsedDate.getTime())) {
    parsedDate = new Date();
  }

  return {
    description,
    amount,
    type,
    category,
    date: parsedDate.toISOString(),
    account,
  };
}

export function importTransactionsFromCsv(buffer: Buffer): TransactionDTO[] {
  const sample = buffer.toString('utf-8', 0, Math.min(buffer.length, 2048));
  const delimiter = detectDelimiter(sample);

  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    delimiter,
  }) as Record<string, string>[];

  const transactions: CsvTransaction[] = [];

  for (const record of records) {
    const mapped = mapCsvRecord(record);
    if (mapped) {
      transactions.push(mapped);
    }
  }

  const created: TransactionDTO[] = [];

  const insertMany = db.transaction((rows: CsvTransaction[]) => {
    for (const row of rows) {
      const result = createTransaction(row);
      created.push(result);
    }
  });

  insertMany(transactions);

  return created;
}

export function getCurrentMonthTotals() {
  const statement = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
    FROM transactions
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
  `);

  const row = statement.get() as { income: number; expenses: number };

  return {
    income: row.income,
    expenses: Math.abs(row.expenses),
  };
}

export function getTotalBalance() {
  const statement = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as balance
    FROM transactions
  `);

  const row = statement.get() as { balance: number };
  return row.balance;
}

export function getCategorySpending(monthIso: string) {
  const statement = db.prepare(`
    SELECT
      category,
      ABS(SUM(amount)) as amount
    FROM transactions
    WHERE type = 'expense'
      AND strftime('%Y-%m', date) = @month
    GROUP BY category
    ORDER BY amount DESC
  `);

  return statement.all({ month: monthIso }) as { category: string; amount: number }[];
}

export function getMonthlyCashFlow(monthIso: string) {
  const statement = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
      COALESCE(SUM(amount), 0) as balance
    FROM transactions
    WHERE strftime('%Y-%m', date) = @month
  `);

  const row = statement.get({ month: monthIso }) as { income: number; expenses: number; balance: number };

  return {
    income: row.income,
    expenses: Math.abs(row.expenses),
    balance: row.balance,
  };
}
