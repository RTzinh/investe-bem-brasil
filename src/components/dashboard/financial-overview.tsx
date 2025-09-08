import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/formatters";

export function FinancialOverview() {
  // Mock data - in real app, this would come from API
  const mockData = {
    totalBalance: 125850.30,
    monthlyIncome: 8500.00,
    monthlyExpenses: 6200.45,
    investments: 45670.80,
    emergencyFund: 18000.00,
    emergencyGoal: 24000.00,
  };

  const netIncome = mockData.monthlyIncome - mockData.monthlyExpenses;
  const emergencyProgress = (mockData.emergencyFund / mockData.emergencyGoal) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Visão Geral Financeira</h2>
        <p className="text-muted-foreground">Sua situação financeira atual</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(mockData.totalBalance)}
          change="+12,5% este mês"
          changeType="positive"
          icon={<DollarSign />}
          gradient
        />
        
        <StatCard
          title="Receitas do Mês"
          value={formatCurrency(mockData.monthlyIncome)}
          change="Estável"
          changeType="neutral"
          icon={<TrendingUp />}
        />
        
        <StatCard
          title="Gastos do Mês"
          value={formatCurrency(mockData.monthlyExpenses)}
          change="-8,2% vs. mês anterior"
          changeType="positive"
          icon={<TrendingDown />}
        />
        
        <StatCard
          title="Investimentos"
          value={formatCurrency(mockData.investments)}
          change="+18,7% este ano"
          changeType="positive"
          icon={<TrendingUp />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Resultado do Mês"
          value={formatCurrency(netIncome)}
          change={netIncome > 0 ? "Superávit" : "Déficit"}
          changeType={netIncome > 0 ? "positive" : "negative"}
          className="md:col-span-1"
        />
        
        <StatCard
          title="Reserva de Emergência"
          value={formatCurrency(mockData.emergencyFund)}
          change={`${emergencyProgress.toFixed(1)}% da meta (${formatCurrency(mockData.emergencyGoal)})`}
          changeType={emergencyProgress >= 100 ? "positive" : emergencyProgress >= 50 ? "neutral" : "negative"}
          icon={<Target />}
          className="md:col-span-1"
        />
      </div>
    </div>
  );
}