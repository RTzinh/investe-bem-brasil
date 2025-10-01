import { Transaction } from './types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: HeadersInit = options?.body instanceof FormData
    ? { ...(options?.headers || {}) }
    : { 'Content-Type': 'application/json', ...(options?.headers || {}) };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Falha ao comunicar com o servidor.');
  }

  return response.json() as Promise<T>;
}

export interface DashboardOverview {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  investments: number;
  dividends: number;
  emergencyFund: number;
  emergencyGoal: number;
  portfolioPerformance: number;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  month: string;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  monthlyContribution: number;
}

export interface Investment {
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

export interface InvestmentSummaryResponse {
  investments: Investment[];
  totals: {
    totalValue: number;
    dividends: number;
    performance: number;
  };
  allocation: {
    total: number;
    breakdown: {
      assetType: Investment['assetType'];
      value: number;
      percentage: number;
    }[];
  };
}

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'suggestion';
  title: string;
  description: string;
  action?: string;
}

export interface ReportSummary {
  cashFlow: {
    month: string;
    income: number;
    expenses: number;
    balance: number;
    investments: number;
  }[];
  categories: {
    category: string;
    amount: number;
    percentage: number;
    budget?: number;
  }[];
  totals: {
    totalIncome: number;
    totalExpenses: number;
    totalInvested: number;
  };
}

export const api = {
  getDashboardOverview: () => request<DashboardOverview>('/dashboard/overview'),
  getTransactions: (limit?: number) => request<Transaction[]>(`/transactions${limit ? `?limit=${limit}` : ''}`),
  createTransaction: (payload: Omit<Transaction, 'id'>) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  importTransactions: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/transactions/import`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Não foi possível importar o extrato.');
    }
    return response.json() as Promise<{ imported: number; transactions: Transaction[] }>;
  },
  getBudgets: (month?: string) => request<Budget[]>(`/budgets${month ? `?month=${month}` : ''}`),
  createBudget: (payload: { category: string; limit: number; month: string }) =>
    request<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getGoals: () => request<Goal[]>('/goals'),
  createGoal: (payload: Omit<Goal, 'id' | 'currentAmount'>) =>
    request<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  contributeGoal: (id: string, amount: number) =>
    request<Goal>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
  getInvestments: () => request<InvestmentSummaryResponse>('/investments'),
  registerTrade: (payload: {
    symbol: string;
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    fees?: number;
    assetType?: Investment['assetType'];
    name?: string;
    tradeDate?: string;
  }) =>
    request<Investment>('/investments/trades', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getInsights: () => request<Insight[]>('/insights'),
  getReportSummary: (months?: number) => request<ReportSummary>(`/reports/summary${months ? `?months=${months}` : ''}`),
};
