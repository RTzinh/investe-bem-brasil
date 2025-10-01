import crypto from 'node:crypto';
import { listBudgets } from './budgets';
import { getEmergencyFundProgress, listGoals } from './goals';
import { getAllocationByType } from './investments';
import { getCurrentMonthTotals } from './transactions';

export interface InsightDTO {
  id: string;
  type: 'warning' | 'success' | 'suggestion';
  title: string;
  description: string;
  action?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function buildInsights(): InsightDTO[] {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const budgets = listBudgets(month);
  const goals = listGoals();
  const emergency = getEmergencyFundProgress();
  const allocation = getAllocationByType();
  const monthTotals = getCurrentMonthTotals();

  const insights: InsightDTO[] = [];

  const exceededBudget = budgets.find((budget) => budget.spent > budget.limit);
  if (exceededBudget) {
    insights.push({
      id: crypto.randomUUID(),
      type: 'warning',
      title: `${exceededBudget.category} acima do orçamento`,
      description: `Você gastou ${formatCurrency(exceededBudget.spent)} este mês para ${exceededBudget.category}, ${formatPercentage(((exceededBudget.spent / exceededBudget.limit) * 100) - 100)} acima da meta de ${formatCurrency(exceededBudget.limit)}.`,
      action: 'Revisar gastos',
    });
  }

  if (emergency.target > 0) {
    const progress = (emergency.current / emergency.target) * 100;
    insights.push({
      id: crypto.randomUUID(),
      type: progress >= 75 ? 'success' : 'suggestion',
      title: 'Progresso da reserva de emergência',
      description: `Você alcançou ${formatPercentage(progress)} da sua meta de ${formatCurrency(emergency.target)}. Continue contribuindo para alcançar ${formatCurrency(emergency.target - emergency.current)} restantes.`,
    });
  }

  if (allocation.breakdown.length > 0) {
    const variable = allocation.breakdown
      .filter((item) => ['ACAO', 'ETF', 'CRIPTO'].includes(item.assetType))
      .reduce((acc, item) => acc + item.percentage, 0);
    if (variable > 50) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'suggestion',
        title: 'Rebalanceamento recomendado',
        description: `Sua carteira possui ${formatPercentage(variable)} em renda variável. Considere diversificar com renda fixa ou FIIs para reduzir a volatilidade.`,
        action: 'Ver sugestão',
      });
    }
  }

  const upcomingGoal = goals
    .filter((goal) => new Date(goal.deadline) > now)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];

  if (upcomingGoal) {
    insights.push({
      id: crypto.randomUUID(),
      type: 'suggestion',
      title: `Meta "${upcomingGoal.name}"`,
      description: `Faltam ${formatCurrency(upcomingGoal.targetAmount - upcomingGoal.currentAmount)} para atingir sua meta até ${new Date(upcomingGoal.deadline).toLocaleDateString('pt-BR')}. Contribuições mensais de ${formatCurrency(upcomingGoal.monthlyContribution)} manterão você no caminho certo.`,
    });
  }

  if (monthTotals.expenses > monthTotals.income) {
    insights.push({
      id: crypto.randomUUID(),
      type: 'warning',
      title: 'Atenção ao fluxo de caixa',
      description: `Seus gastos (${formatCurrency(monthTotals.expenses)}) estão maiores que suas receitas (${formatCurrency(monthTotals.income)}) neste mês. Avalie oportunidades de redução.`,
      action: 'Ver relatório',
    });
  }

  return insights.slice(0, 4);
}
