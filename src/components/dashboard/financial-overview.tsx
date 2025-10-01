import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";

export function FinancialOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: api.getDashboardOverview,
  });

  const overview = data ?? {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    investments: 0,
    emergencyFund: 0,
    emergencyGoal: 0,
    dividends: 0,
    portfolioPerformance: 0,
  };

  const netIncome = overview.monthlyIncome - overview.monthlyExpenses;
  const emergencyProgress = overview.emergencyGoal > 0
    ? (overview.emergencyFund / overview.emergencyGoal) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Visão Geral Financeira</h2>
        <p className="text-muted-foreground">Sua situação financeira atual</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(overview.totalBalance)}
          change="+12,5% este mês"
          changeType="positive"
          icon={<DollarSign />}
          gradient
        />
        
        <StatCard
          title="Receitas do Mês"
          value={formatCurrency(overview.monthlyIncome)}
          change="Estável"
          changeType="neutral"
          icon={<TrendingUp />}
        />

        <StatCard
          title="Gastos do Mês"
          value={formatCurrency(overview.monthlyExpenses)}
          change="-8,2% vs. mês anterior"
          changeType="positive"
          icon={<TrendingDown />}
        />

        <StatCard
          title="Investimentos"
          value={formatCurrency(overview.investments)}
          change={`${overview.portfolioPerformance.toFixed(2)}% de performance média`}
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
          value={formatCurrency(overview.emergencyFund)}
          change={`${emergencyProgress.toFixed(1)}% da meta (${formatCurrency(overview.emergencyGoal)})`}
          changeType={emergencyProgress >= 100 ? "positive" : emergencyProgress >= 50 ? "neutral" : "negative"}
          icon={<Target />}
          className="md:col-span-1"
        />
      </div>
    </div>
  );
}