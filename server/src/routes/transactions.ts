import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import db from '../database.js';
import { logger } from '../logger.js';
import type { Transaction } from '../types.js';

const uploadDir = join(process.cwd(), 'server', 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const transactionPayloadSchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(dateRegex, { message: 'Data deve estar no formato YYYY-MM-DD' }),
    description: z.string().trim().min(1).max(160),
    category: z.string().trim().min(1).max(120),
    account: z.string().trim().min(1).max(120),
    type: z.enum(['income', 'expense']),
    amount: z.coerce
      .number()
      .refine((value) => Number.isFinite(value), { message: 'Invalid amount' }),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .transform((value) => ({
    ...value,
    description: value.description.trim(),
    category: value.category.trim(),
    account: value.account.trim(),
    notes: value.notes?.trim() ?? '',
  }));

const querySchema = z.object({
  startDate: z
    .string()
    .trim()
    .regex(dateRegex, { message: 'Invalid startDate' })
    .optional(),
  endDate: z
    .string()
    .trim()
    .regex(dateRegex, { message: 'Invalid endDate' })
    .optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().trim().max(120).optional(),
  account: z.string().trim().max(120).optional(),
  search: z.string().trim().max(160).optional(),
});

const sanitizeCsvContent = (buffer: Buffer) => {
  const rawContent = buffer.toString('utf8');
  const lines = rawContent.split(/\r?\n/);
  const usefulLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^extrato de conta/i.test(trimmed)) return false;
    if (/^saldo (anterior|atual)/i.test(trimmed)) return false;
    return true;
  });

  const identifiedHeaderIndex = usefulLines.findIndex(
    (line) => /data.*lanc/i.test(line) || /data.*cont/i.test(line),
  );
  if (identifiedHeaderIndex > 0) {
    return usefulLines.slice(identifiedHeaderIndex).join('\n');
  }

  return usefulLines.join('\n');
};

const guessDelimiter = (headerLine: string) => {
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  if (semicolonCount > commaCount) return ';';
  return ',';
};

const normalizeRecord = (record: Record<string, string>): Transaction => {
  const parseAmount = (value = '') => {
    const sanitized = value.replace(/[^0-9,-]/g, '').replace('.', '').replace(',', '.');
    const numeric = Number.parseFloat(sanitized);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const date =
    record['Data'] ??
    record['Data Lançamento'] ??
    record['Data Lancamento'] ??
    record['data'] ??
    record['Date'] ??
    new Date().toISOString().slice(0, 10);
  const description =
    record['Descrição'] ??
    record['Descricao'] ??
    record['Título'] ??
    record['Titulo'] ??
    record['description'] ??
    'Imported transaction';
  const category =
    record['Categoria'] ?? record['Categoria detalhada'] ?? record['category'] ?? 'Other';
  const account = record['Conta'] ?? record['account'] ?? record['Conta Origem'] ?? 'Checking Account';

  const income =
    parseAmount(record['Entrada(R$)'] ?? record['Credito'] ?? record['Credit'] ?? record['entrada'] ?? '0');
  const expense =
    parseAmount(record['Saída(R$)'] ?? record['Debito'] ?? record['Debit'] ?? record['saida'] ?? '0');
  const amount = income > 0 ? income : -expense;
  const type = income >= expense ? 'income' : 'expense';

  return {
    id: randomUUID(),
    date,
    description,
    category,
    account,
    type,
    amount: amount === 0 ? parseAmount(record['Valor'] ?? record['value'] ?? '0') : amount,
    notes: record['Observações'] ?? record['Observacao'] ?? record['notes'] ?? '',
  };
};

export const router = Router();

router.get('/', (req, res) => {
  const validated = querySchema.safeParse(req.query);
  if (!validated.success) {
    return res.status(400).json({
      message: 'Invalid query parameters.',
      details: validated.error.flatten(),
    });
  }

  const { startDate, endDate, type, category, account, search } = validated.data;
  const filters: string[] = [];
  const params: unknown[] = [];

  if (startDate) {
    filters.push('date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    filters.push('date <= ?');
    params.push(endDate);
  }
  if (type) {
    filters.push('type = ?');
    params.push(type);
  }
  if (category) {
    filters.push('category = ?');
    params.push(category);
  }
  if (account) {
    filters.push('account = ?');
    params.push(account);
  }
  if (search) {
    filters.push('(description LIKE ? OR notes LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  let query = 'SELECT * FROM transactions';
  if (filters.length) {
    query += ` WHERE ${filters.join(' AND ')}`;
  }
  query += ' ORDER BY date DESC, created_at DESC';

  const transactions = db.prepare(query).all(...params) as Transaction[];
  res.json({ data: transactions });
});

router.get('/summary', (_req, res) => {
  const totals = db
    .prepare(
      `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
    FROM transactions`,
    )
    .get() as { totalIncome: number | null; totalExpenses: number | null };

  const income = totals.totalIncome ?? 0;
  const expenses = totals.totalExpenses ?? 0;
  const balance = income - expenses;

  res.json({ income, expenses, balance });
});

router.post('/', (req, res) => {
  const parsed = transactionPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid data for creating a transaction.',
      details: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;

  const id = randomUUID();
  const statement = db.prepare(
    `INSERT INTO transactions (id, date, description, category, account, type, amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  statement.run(
    id,
    payload.date,
    payload.description,
    payload.category,
    payload.account,
    payload.type,
    payload.amount,
    payload.notes ?? '',
  );

  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
  res.status(201).json(transaction);
});

router.put('/:id', (req, res) => {
  const parsed = transactionPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid data for updating a transaction.',
      details: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;

  if (!existing) {
    return res.status(404).json({ message: 'Transaction not found.' });
  }

  const statement = db.prepare(
    `UPDATE transactions
     SET date = ?, description = ?, category = ?, account = ?, type = ?, amount = ?, notes = ?
     WHERE id = ?`,
  );
  statement.run(
    payload.date,
    payload.description,
    payload.category,
    payload.account,
    payload.type,
    payload.amount,
    payload.notes ?? '',
    id,
  );

  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const statement = db.prepare('DELETE FROM transactions WHERE id = ?');
  const result = statement.run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'Transaction not found.' });
  }
  res.status(204).send();
});

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No statement file was uploaded.' });
  }

  try {
    const rawContent = sanitizeCsvContent(readFileSync(req.file.path));
    if (!rawContent.trim()) {
      return res
        .status(400)
        .json({ message: 'Statement content is empty or unsupported.' });
    }

    const delimiter = guessDelimiter(rawContent.split(/\r?\n/)[0] ?? ',');
    const records = parse(rawContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
    }) as Record<string, string>[];

    if (!records.length) {
      return res
        .status(400)
        .json({ message: 'Unable to parse the file. Check the CSV format.' });
    }

    const insert = db.prepare(
      `INSERT INTO transactions (id, date, description, category, account, type, amount, notes)
      VALUES (@id, @date, @description, @category, @account, @type, @amount, @notes)`,
    );

    const normalized = records
      .map(normalizeRecord)
      .filter((transaction) => transaction.amount !== 0);

    if (!normalized.length) {
      return res
        .status(400)
        .json({ message: 'No valid transactions found in the file.' });
    }

    const insertMany = db.transaction((rows: Transaction[]) => {
      rows.forEach((row) => insert.run(row));
    });
    insertMany(normalized);

    const ids = normalized.map((row) => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const inserted = db
      .prepare(`SELECT * FROM transactions WHERE id IN (${placeholders})`)
      .all(...ids) as Transaction[];

    res.status(201).json({ imported: inserted.length, transactions: inserted });
  } catch (error) {
    logger.error({ err: error }, '[transactions import] error');
    res.status(500).json({ message: 'Failed to import the statement.' });
  } finally {
    unlinkSync(req.file.path);
  }
});
