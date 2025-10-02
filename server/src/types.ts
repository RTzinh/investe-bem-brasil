export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  account: string;
  type: 'income' | 'expense';
  amount: number;
  notes?: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  limit: number;
  period: string;
  notes?: string;
  created_at?: string;
}

export interface Goal {
  id: string;
  name: string;
  category: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  deadline: string;
  priority: 'alta' | 'media' | 'baixa';
  notes?: string;
  created_at?: string;
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  type: 'ACAO' | 'ETF' | 'FII' | 'RF' | 'CRIPTO';
  quantity: number;
  avg_price: number;
  current_price: number;
  target_allocation: number;
  dividends: number;
  created_at?: string;
}

export interface InvestmentTrade {
  id: string;
  investment_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  executed_at: string;
  created_at?: string;
}
