import { db } from '../database';
import { listBudgets } from './budgets';
import { getCategorySpending, getMonthlyCashFlow } from './transactions';

export interface CashFlowRow {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  investments: number;
}

export interface CategoryRow {
  category: string;
  amount: number;
  percentage: number;
  budget?: number;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getInvestedAmount(month: string) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'buy' THEN (price * quantity) + fees ELSE 0 END), 0) AS invested
    FROM trades
    WHERE strftime('%Y-%m', tradeDate) = @month
  `).get({ month }) as { invested: number };

  return row.invested;
}

export function getReportSummary(months: number) {
  const now = new Date();
  const monthsKeys: string[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsKeys.push(getMonthKey(date));
  }

  const cashFlow: CashFlowRow[] = monthsKeys.map((monthKey) => {
    const flow = getMonthlyCashFlow(monthKey);
    const investments = getInvestedAmount(monthKey);
    return {
      month: monthKey,
      income: flow.income,
      expenses: flow.expenses,
      balance: flow.balance,
      investments,
    };
  });

  const currentMonth = getMonthKey(now);
  const categoriesRaw = getCategorySpending(currentMonth);
  const totalExpenses = categoriesRaw.reduce((acc, row) => acc + row.amount, 0);
  const budgets = listBudgets(currentMonth);
  const budgetMap = new Map(budgets.map((budget) => [budget.category, budget.limit]));

  const categories: CategoryRow[] = categoriesRaw.map((row) => ({
    category: row.category,
    amount: row.amount,
    percentage: totalExpenses > 0 ? (row.amount / totalExpenses) * 100 : 0,
    budget: budgetMap.get(row.category),
  }));

  return {
    cashFlow,
    categories,
    totals: {
      totalIncome: cashFlow.reduce((acc, row) => acc + row.income, 0),
      totalExpenses: cashFlow.reduce((acc, row) => acc + row.expenses, 0),
      totalInvested: cashFlow.reduce((acc, row) => acc + row.investments, 0),
    },
  };
}
