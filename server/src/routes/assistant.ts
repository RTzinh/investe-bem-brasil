import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../database.js';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type KnowledgeEntry = {
  keywords: string[];
  answer: string | ((history: ChatMessage[]) => Promise<string> | string);
};

const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'AIzaSyCag_eYIGTTZfw-xSUw8iERcNuroOZO7G4';

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

const getModel = () => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured.');
  }
  if (!model) {
    const client = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = client.getGenerativeModel({ model: GEMINI_MODEL });
  }
  return model;
};

const summarizeFinances = async () => {
  const totals = db.prepare(
    `SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
      FROM transactions`
  ).get() as { income: number | null; expenses: number | null };

  const goals = db.prepare('SELECT name, target_amount, current_amount FROM goals').all() as Array<{
    name: string;
    target_amount: number;
    current_amount: number;
  }>;

  const budgets = db.prepare('SELECT name, "limit" AS limitValue, notes FROM budgets').all() as Array<{
    name: string;
    limitValue: number;
    notes: string;
  }>;

  const investments = db.prepare('SELECT symbol, quantity, current_price FROM investments').all() as Array<{
    symbol: string;
    quantity: number;
    current_price: number;
  }>;

  const income = totals.income ?? 0;
  const expenses = totals.expenses ?? 0;
  const balance = income - expenses;
  const portfolioValue = investments.reduce((acc, item) => acc + item.quantity * item.current_price, 0);
  const goalsSummary = goals
    .slice(0, 3)
    .map((goal) => {
      const pct = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
      return `- ${goal.name}: ${pct.toFixed(1)}% da meta`;
    })
    .join('\n');

  const budgetsSummary = budgets
    .slice(0, 3)
    .map((budget) => `- ${budget.name}: limite de ${budget.limitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
    .join('\n');

  return [
    `Resumo financeiro atual: Receita acumulada ${income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, gastos ${expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e saldo ${balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    `Valor estimado da carteira de investimentos: ${portfolioValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`,
    goalsSummary ? `Metas principais:\n${goalsSummary}` : 'Sem metas cadastradas até o momento.',
    budgetsSummary ? `Orçamentos em destaque:\n${budgetsSummary}` : 'Sem orçamentos configurados.',
    'Para detalhes completos, navegue até as abas Metas, Orçamentos e Investimentos do dashboard.'
  ].join('\n');
};

const knowledgeBase: KnowledgeEntry[] = [
  {
    keywords: ['tesouro selic', 'tesouro direto selic', 'lft'],
    answer: [
      'Tesouro Selic é um título público pós-fixado ligado à taxa básica de juros. Ideal para reserva de emergência por oferecer liquidez diária e baixa oscilação.',
      'Como funciona:',
      '- Rentabilidade acompanha a taxa Selic; o saldo cresce diariamente.',
      '- Liquidez D+1: resgates solicitados até 13h caem no dia útil seguinte.',
      '- Custos: 0,20% a.a. de taxa B3 + imposto de renda regressivo.',
      '- Use para objetivos de curto a médio prazo, quando não deseja correr risco de mercado.'
    ].join('\n'),
  },
  {
    keywords: ['cdb', 'renda fixa', 'lci', 'lca'],
    answer: [
      'CDB, LCI e LCA são títulos bancários. Todos contam com garantia do FGC até R$ 250 mil por instituição e CPF.',
      'CDB pode ser pós-fixado ao CDI, prefixado ou IPCA+. LCI/LCA são isentos de IR, mas costumam oferecer rentabilidade ligeiramente menor.',
      'Analise emissor, prazo de vencimento, liquidez prometida e se há carência antes de investir.'
    ].join('\n'),
  },
  {
    keywords: ['carteira diversificada', 'acoes', 'fii', 'etf', 'diversificar'],
    answer: [
      'Uma carteira diversificada mistura várias classes: renda fixa (estabilidade), renda variável (crescimento) e instrumentos de renda (FIIs, multimercados).',
      'Passos práticos:',
      '1. Defina objetivo e prazo para saber quanto suportar de volatilidade;',
      '2. Distribua percentuais alvo para cada classe (ex.: 50% renda fixa, 30% ações/ETFs, 20% FIIs);',
      '3. Rebalanceie todo trimestre ou semestre trazendo cada classe de volta ao alvo;',
      '4. Use produtos de baixo custo (ETFs) e diversifique emissores em renda fixa.'
    ].join('\n'),
  },
  {
    keywords: ['resumo financeiro', 'visao geral', 'resumo do mes'],
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
    'Não consegui contato com o modelo de IA. Seguem orientações gerais:',
    lastUserMessage?.content ? `Resumo do que você perguntou: "${lastUserMessage.content}".` : undefined,
    '1. Revise o objetivo financeiro e o prazo de uso do dinheiro;',
    '2. Compare rentabilidades, risco e liquidez das alternativas;',
    '3. Monte um plano de aportes recorrentes e acompanhe seu dashboard periodicamente;',
    'Confirme se a chave GEMINI_API_KEY está ativa e se há conexão com a internet.'
  ].filter(Boolean);

  return generic.join('\n');
};

export const router = Router();

router.post('/', async (req, res) => {
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'Conversa invalida.' });
  }

  try {
    const conversation = messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

    const response = await getModel().generateContent({ contents: conversation });
    const text = response.response.text().trim();

    if (text.length === 0) {
      const fallback = await fallbackForMessages(messages);
      return res.json({ reply: fallback });
    }

    return res.json({ reply: text });
  } catch (error) {
    console.error('[assistant] error', error);
    const fallback = await fallbackForMessages(messages);
    return res.status(200).json({ reply: fallback, error: 'assistant_unavailable' });
  }
});
