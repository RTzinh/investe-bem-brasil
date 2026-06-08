const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

const resolveUrl = (path: string) =>
  path.startsWith('http') ? path : `${API_BASE_URL}/${path.replace(/^\//, '')}`;

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const apiKey = import.meta.env.VITE_SERVER_API_KEY;
  if (apiKey) {
    headers.set('x-api-key', apiKey);
  }

  const response = await fetch(resolveUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text();
    }
    throw new ApiError(response.statusText || 'Request error', response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('Content-Type');
  if (contentType?.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return response.text() as unknown as T;
}

export const api = {
  dashboard: {
    overview: () => apiFetch<DashboardOverviewResponse>('dashboard/overview'),
  },
  transactions: {
    list: (params?: Record<string, string | number | undefined>) => {
      const url = new URL(resolveUrl('transactions'));
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
          }
        });
      }
      return apiFetch<{ data: TransactionResponse[] }>(url.toString());
    },
    summary: () => apiFetch<{ income: number; expenses: number; balance: number }>('transactions/summary'),
    create: (payload: TransactionPayload) =>
      apiFetch<TransactionResponse>('transactions', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: TransactionPayload) =>
      apiFetch<TransactionResponse>(`transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: string) => apiFetch<void>(`transactions/${id}`, { method: 'DELETE' }),
    import: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch<{ imported: number; transactions: TransactionResponse[] }>('transactions/import', {
        method: 'POST',
        body: formData,
      });
    },
  },
  budgets: {
    list: () => apiFetch<{ data: BudgetResponse[] }>('budgets'),
    summary: () => apiFetch<{ totalLimit: number; totalSpent: number; exceeded: number; warning: number }>('budgets/summary'),
    create: (payload: BudgetPayload) =>
      apiFetch<BudgetResponse>('budgets', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: BudgetPayload) =>
      apiFetch<BudgetResponse>(`budgets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id: string) => apiFetch<void>(`budgets/${id}`, { method: 'DELETE' }),
  },
  goals: {
    list: () => apiFetch<{ data: GoalResponse[] }>('goals'),
    summary: () => apiFetch<{ totalTarget: number; totalCurrent: number; completed: number; onTrack: number; goals: number }>('goals/summary'),
    create: (payload: GoalPayload) =>
      apiFetch<GoalResponse>('goals', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: GoalPayload) =>
      apiFetch<GoalResponse>(`goals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    contribute: (id: string, amount: number) =>
      apiFetch<GoalResponse>(`goals/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }),
    remove: (id: string) => apiFetch<void>(`goals/${id}`, { method: 'DELETE' }),
  },
  investments: {
    list: () => apiFetch<{ data: InvestmentResponse[] }>('investments'),
    summary: () => apiFetch<{ totalValue: number; totalDividends: number; performance: number; allocationByType: Record<string, number> }>('investments/summary'),
    trades: (symbol: string) => apiFetch<{ data: InvestmentTradeResponse[] }>(`investments/${symbol}/trades`),
    trade: (payload: TradePayload) =>
      apiFetch<InvestmentResponse>('investments/trade', { method: 'POST', body: JSON.stringify(payload) }),
  },
  reports: {
    cashflow: (period?: string) => apiFetch<{ data: CashflowPoint[] }>(`reports/cashflow${period ? `?period=${period}` : ''}`),
    categories: (period?: string) => apiFetch<{ data: CategoryBreakdown[] }>(`reports/categories${period ? `?period=${period}` : ''}`),
    overview: (period?: string) => apiFetch<{ income: number; expenses: number; balance: number }>(`reports/overview${period ? `?period=${period}` : ''}`),
  },
  assistant: {
    chat: (messages: AssistantMessage[]) =>
      apiFetch<{ reply: string }>('assistant', { method: 'POST', body: JSON.stringify({ messages }) }),
  },
  ai: {
    insights: () => apiFetch<{ data: InsightResponse[] }>('ai/insights'),
  },
};

export interface TransactionResponse {
  id: string;
  date: string;
  description: string;
  category: string;
  account: string;
  type: 'income' | 'expense';
  amount: number;
  notes?: string;
}

export interface TransactionPayload {
  date: string;
  description: string;
  category: string;
  account: string;
  type: 'income' | 'expense';
  amount: number;
  notes?: string;
}

export interface BudgetResponse {
  id: string;
  name: string;
  category: string;
  limit: number;
  period: string;
  notes?: string;
  spent: number;
  remaining: number;
  usage: number;
}

export interface BudgetPayload {
  name: string;
  category: string;
  limit: number;
  period: string;
  notes?: string;
}

export interface GoalResponse {
  id: string;
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  deadline: string;
  priority: 'alta' | 'media' | 'baixa';
  notes?: string;
  progress: number;
  remainingAmount: number;
  monthsToGoal: number;
  status: 'completed' | 'onTrack' | 'delayed';
}

export interface GoalPayload {
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  deadline: string;
  priority: 'alta' | 'media' | 'baixa';
  notes?: string;
}

export interface InvestmentResponse {
  id: string;
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  dividends: number;
  target_allocation: number;
  totalValue: number;
  investedValue: number;
  performance: number;
}

export interface InvestmentTradeResponse {
  id: string;
  investment_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  executed_at: string;
}

export interface TradePayload {
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees?: number;
  executed_at?: string;
  assetType?: string;
}

export interface CashflowPoint {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface CategoryBreakdown {
  category: string;
  expenses: number;
  income: number;
  net: number;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface InsightResponse {
  id: number;
  asset_symbol?: string | null;
  title: string;
  summary: string;
  rationale?: string | null;
  impact?: string | null;
  created_at: string;
  raw_context?: Record<string, unknown> | null;
}

export interface DashboardOverviewResponse {
  metrics: {
    income: number;
    expenses: number;
    balance: number;
    totalInvestments: number;
    totalDividends: number;
    warningBudgets: number;
    exceededBudgets: number;
    completedGoals: number;
  };
  recentTransactions: TransactionResponse[];
  budgets: (BudgetResponse & { limit: number })[];
  goals: GoalResponse[];
  investments: InvestmentResponse[];
}

export type DashboardData = DashboardOverviewResponse;
