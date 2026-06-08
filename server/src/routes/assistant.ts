import { Router } from 'express';
import { z } from 'zod';
import db from '../database.js';
import { fetchFastApiAssistantReply, type FastApiAssistantMessage } from '../services/fastapi.js';
import { logger } from '../logger.js';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type KnowledgeEntry = {
  keywords: string[];
  answer: string | ((history: ChatMessage[]) => Promise<string> | string);
};

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1),
});

const summarizeFinances = async () => {
  const totals = db
    .prepare(
      `SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
      FROM transactions`,
    )
    .get() as { income: number | null; expenses: number | null };

  const goals = db
    .prepare('SELECT name, target_amount, current_amount FROM goals')
    .all() as Array<{
      name: string;
      target_amount: number;
      current_amount: number;
    }>;

  const budgets = db
    .prepare('SELECT name, "limit" AS limitValue, notes FROM budgets')
    .all() as Array<{
      name: string;
      limitValue: number;
      notes: string;
    }>;

  const investments = db
    .prepare('SELECT symbol, quantity, current_price FROM investments')
    .all() as Array<{
      symbol: string;
      quantity: number;
      current_price: number;
    }>;

  const income = totals.income ?? 0;
  const expenses = totals.expenses ?? 0;
  const balance = income - expenses;
  const portfolioValue = investments.reduce(
    (acc, item) => acc + item.quantity * item.current_price,
    0,
  );
  const goalsSummary = goals
    .slice(0, 3)
    .map((goal) => {
      const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      return `- ${goal.name}: ${pct.toFixed(1)}% of the goal`;
    })
    .join('\n');

  const budgetsSummary = budgets
    .slice(0, 3)
    .map(
      (budget) =>
        `- ${budget.name}: limit of ${budget.limitValue.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}`,
    )
    .join('\n');

  return [
    `Current financial summary: accumulated income ${income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, spending ${expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} and balance ${balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    `Estimated investment portfolio value: ${portfolioValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    goalsSummary ? `Top goals:\n${goalsSummary}` : 'No goals registered yet.',
    budgetsSummary ? `Featured budgets:\n${budgetsSummary}` : 'No budgets configured.',
    'For full details, head to the Goals, Budgets and Investments tabs in the dashboard.',
  ].join('\n');
};

const knowledgeBase: KnowledgeEntry[] = [
  {
    keywords: ['tesouro selic', 'tesouro direto selic', 'selic', 'lft'],
    answer: [
      'Tesouro Selic is a floating-rate government bond tied to the base interest rate. It is ideal for an emergency fund because it offers daily liquidity and low volatility.',
      'How it works:',
      '- The return tracks the Selic rate; the balance grows daily.',
      '- D+1 liquidity: redemptions requested before 1pm settle on the next business day.',
      '- Costs: 0.20% per year B3 fee + regressive income tax.',
      '- Use it for short to medium-term goals when you do not want market risk.',
    ].join('\n'),
  },
  {
    keywords: ['cdb', 'fixed income', 'lci', 'lca'],
    answer: [
      'CDB, LCI and LCA are bank-issued securities. All are covered by the FGC guarantee up to R$ 250,000 per institution and per taxpayer.',
      'A CDB can be floating-rate (CDI), fixed-rate or IPCA+. LCI/LCA are income-tax exempt but usually offer a slightly lower return.',
      'Review the issuer, maturity, promised liquidity and any lock-up period before investing.',
    ].join('\n'),
  },
  {
    keywords: ['diversified portfolio', 'stocks', 'fii', 'etf', 'diversify', 'allocation', 'portfolio'],
    answer: [
      'A diversified portfolio blends several classes: fixed income (stability), equities (growth) and income instruments (REITs/FIIs, hedge funds).',
      'Practical steps:',
      '1. Define your goal and time horizon to know how much volatility you can tolerate;',
      '2. Set target percentages for each class (e.g. 50% fixed income, 30% stocks/ETFs, 20% FIIs);',
      '3. Rebalance every quarter or half-year, bringing each class back to its target;',
      '4. Use low-cost products (ETFs) and diversify issuers within fixed income.',
    ].join('\n'),
  },
  {
    keywords: ['financial summary', 'overview', 'summary for the month'],
    answer: async () => summarizeFinances(),
  },
];

const fallbackForMessages = async (history: ChatMessage[]) => {
  const lastUserMessage = [...history].reverse().find((message) => message.role === 'user');
  const normalized = (lastUserMessage?.content ?? '').toLowerCase();

  for (const entry of knowledgeBase) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      const response = typeof entry.answer === 'function' ? await entry.answer(history) : entry.answer;
      return response;
    }
  }

  const generic = [
    'I could not reach the AI model. Here is some general guidance:',
    lastUserMessage?.content ? `Summary of what you asked: "${lastUserMessage.content}".` : undefined,
    '1. Review your financial goal and the time horizon for the money;',
    '2. Compare returns, risk and liquidity across the alternatives;',
    '3. Set up a recurring contribution plan and check your dashboard regularly;',
    'Verify that the intelligent backend is running and that the GEMINI_API_KEY is active in the FastAPI service.',
  ].filter(Boolean);

  return generic.join('\n');
};

const toFastApiPayload = (messages: ChatMessage[]): FastApiAssistantMessage[] =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

export const router = Router();

router.post('/', async (req, res) => {
  const validation = requestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'Invalid conversation.',
      details: validation.error.flatten(),
    });
  }

  const { messages } = validation.data;

  try {
    const response = await fetchFastApiAssistantReply(toFastApiPayload(messages));
    const reply = response.reply.trim();

    if (!reply.length) {
      const fallback = await fallbackForMessages(messages);
      return res.json({ reply: fallback });
    }

    return res.json({ reply });
  } catch (error) {
    logger.warn({ err: error }, '[assistant] FastAPI unavailable, using fallback');
    const fallback = await fallbackForMessages(messages);
    return res.status(200).json({ reply: fallback, error: 'assistant_unavailable' });
  }
});
