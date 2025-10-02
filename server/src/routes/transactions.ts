import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import db from '../database.js';
import type { Transaction } from '../types.js';

const uploadDir = join(process.cwd(), 'server', 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

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

  const identifiedHeaderIndex = usefulLines.findIndex((line) => /data.*lançamento/i.test(line) || /data.*contábil/i.test(line));
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

  const date = record['Data'] || record['Data Lançamento'] || record['Data Lancamento'] || record['data'] || record['Date'] || new Date().toISOString().slice(0, 10);
  const description = record['Descrição'] || record['Descricao'] || record['Título'] || record['Titulo'] || record['description'] || 'Transação importada';
  const category = record['Categoria'] || record['Categoria detalhada'] || record['category'] || 'Outros';
  const account = record['Conta'] || record['account'] || record['Conta Origem'] || 'Conta Corrente';

  const income = parseAmount(record['Entrada(R$)'] || record['Credito'] || record['Credit'] || record['entrada'] || '0');
  const expense = parseAmount(record['Saída(R$)'] || record['Debito'] || record['Debit'] || record['saida'] || '0');
  const amount = income > 0 ? income : -expense;
  const type = income >= expense ? 'income' : 'expense';

  return {
    id: randomUUID(),
    date,
    description,
    category,
    account,
    type,
    amount: amount === 0 ? parseAmount(record['Valor'] || record['value'] || '0') : amount,
    notes: record['Observações'] || record['Observacao'] || record['notes'] || '',
  };
};

export const router = Router();

router.get('/', (req, res) => {
  const { startDate, endDate, type, category, account, search } = req.query;
  const filters: string[] = [];
  const params: unknown[] = [];

  if (typeof startDate === 'string') {
    filters.push('date >= ?');
    params.push(startDate);
  }
  if (typeof endDate === 'string') {
    filters.push('date <= ?');
    params.push(endDate);
  }
  if (typeof type === 'string') {
    filters.push('type = ?');
    params.push(type);
  }
  if (typeof category === 'string') {
    filters.push('category = ?');
    params.push(category);
  }
  if (typeof account === 'string') {
    filters.push('account = ?');
    params.push(account);
  }
  if (typeof search === 'string' && search.trim()) {
    filters.push('(description LIKE ? OR notes LIKE ?)');
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
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
  const totals = db.prepare(
    `SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses
    FROM transactions`
  ).get() as { totalIncome: number | null; totalExpenses: number | null };

  const income = totals.totalIncome ?? 0;
  const expenses = totals.totalExpenses ?? 0;
  const balance = income - expenses;

  res.json({ income, expenses, balance });
});

router.post('/', (req, res) => {
  const { date, description, category, account, type, amount, notes } = req.body;

  if (!date || !description || !category || !account || !type || typeof amount !== 'number') {
    return res.status(400).json({ message: 'Dados invalidos para criar transacao.' });
  }

  const id = randomUUID();
  const statement = db.prepare(`INSERT INTO transactions (id, date, description, category, account, type, amount, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  statement.run(id, date, description, category, account, type, amount, notes ?? '');

  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
  res.status(201).json(transaction);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { date, description, category, account, type, amount, notes } = req.body;
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;

  if (!existing) {
    return res.status(404).json({ message: 'Transacao nao encontrada.' });
  }

  const statement = db.prepare(`UPDATE transactions SET date = ?, description = ?, category = ?, account = ?, type = ?, amount = ?, notes = ? WHERE id = ?`);
  statement.run(date, description, category, account, type, amount, notes ?? '', id);

  const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const statement = db.prepare('DELETE FROM transactions WHERE id = ?');
  const result = statement.run(id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'Transacao nao encontrada.' });
  }
  res.status(204).send();
});

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Arquivo de extrato nao enviado.' });
  }

  try {
    const rawContent = sanitizeCsvContent(readFileSync(req.file.path));
    if (!rawContent.trim()) {
      return res.status(400).json({ message: 'Conteudo do extrato vazio ou nao suportado.' });
    }

    const delimiter = guessDelimiter(rawContent.split(/\r?\n/)[0] ?? ',');
    const records = parse(rawContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter,
    }) as Record<string, string>[];

    if (!records.length) {
      return res.status(400).json({ message: 'Nao foi possivel interpretar o arquivo. Verifique o formato CSV.' });
    }

    const insert = db.prepare(`INSERT INTO transactions (id, date, description, category, account, type, amount, notes)
      VALUES (@id, @date, @description, @category, @account, @type, @amount, @notes)`);

    const normalized = records.map(normalizeRecord).filter((transaction) => transaction.amount !== 0);

    if (!normalized.length) {
      return res.status(400).json({ message: 'Nenhuma transacao valida encontrada no arquivo.' });
    }

    const insertMany = db.transaction((rows: Transaction[]) => {
      rows.forEach((row) => insert.run(row));
    });
    insertMany(normalized);

    const ids = normalized.map((row) => row.id);
    const placeholders = ids.map(() => '?').join(',');
    const inserted = db.prepare(`SELECT * FROM transactions WHERE id IN (${placeholders})`).all(...ids) as Transaction[];

    res.status(201).json({ imported: inserted.length, transactions: inserted });
  } catch (error) {
    console.error('[transactions import] error', error);
    res.status(500).json({ message: 'Erro ao importar extrato.' });
  } finally {
    unlinkSync(req.file.path);
  }
});
