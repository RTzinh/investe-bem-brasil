import { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { useDashboardOverview } from '@/hooks/use-dashboard';

const LoadingState = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-foreground">Visao geral financeira</h2>
      <p className="text-muted-foreground">Carregando dados atualizados...</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-32 rounded-xl" />
      ))}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {[4, 5].map((item) => (
        <Skeleton key={item} className="h-32 rounded-xl" />
      ))}
    </div>
  </div>
);

export function FinancialOverview() {
  const { data, isLoading } = useDashboardOverview();

  const metrics = data?.metrics ?? {
    income: 0,
    expenses: 0,
    balance: 0,
    totalInvestments: 0,
    totalDividends: 0,
    warningBudgets: 0,
    exceededBudgets: 0,
    completedGoals: 0,
  };

  const emergencyGoal = useMemo(() => {
    return data?.goals?.find((goal) => goal.name.toLowerCase().includes('emerg'));
  }, [data]);

  const emergencyFund = emergencyGoal?.current_amount ?? 0;
  const emergencyTarget = emergencyGoal?.target_amount ?? 1;
  const emergencyProgress = emergencyGoal ? (emergencyFund / emergencyTarget) * 100 : 0;

  if (isLoading && !data) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Visao geral financeira</h2>
        <p className="text-muted-foreground">Sua situacao financeira em tempo real</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo total"
          value={formatCurrency(metrics.balance)}
          change={`Investimentos: ${formatCurrency(metrics.totalInvestments)}`}
          changeType={metrics.balance >= 0 ? 'positive' : 'negative'}
          icon={<DollarSign />}
          gradient
        />

        <StatCard
          title="Receitas do mes"
          value={formatCurrency(metrics.income)}
          change={`Metas concluidas: ${metrics.completedGoals}`}
          changeType="neutral"
          icon={<TrendingUp />}
        />

        <StatCard
          title="Gastos do mes"
          value={formatCurrency(metrics.expenses)}
          change={`${metrics.warningBudgets} orcamentos em atencao`}
          changeType={metrics.warningBudgets > 0 ? 'negative' : 'positive'}
          icon={<TrendingDown />}
        />

        <StatCard
          title="Investimentos"
          value={formatCurrency(metrics.totalInvestments)}
          change={`Dividendos acumulados: ${formatCurrency(metrics.totalDividends)}`}
          changeType={metrics.totalDividends >= 0 ? 'positive' : 'neutral'}
          icon={<TrendingUp />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Resultado do mes"
          value={formatCurrency(metrics.income - metrics.expenses)}
          change={metrics.balance >= 0 ? 'Superavit' : 'Deficit'}
          changeType={metrics.balance >= 0 ? 'positive' : 'negative'}
          className="md:col-span-1"
        />

        <StatCard
          title="Reserva de emergencia"
          value={formatCurrency(emergencyFund)}
          change={emergencyGoal
            ? `${formatPercentage(emergencyProgress)} da meta (${formatCurrency(emergencyTarget)})`
            : 'Cadastre uma meta de reserva para acompanhar aqui'}
          changeType={emergencyProgress >= 100 ? 'positive' : emergencyProgress >= 50 ? 'neutral' : 'negative'}
          icon={<Target />}
          className="md:col-span-1"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/orcamentos" className="flex items-center">
            Revisar gastos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/relatorios" className="flex items-center">
            Ver relatorios completos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild>
          <Link to="/assistente" className="flex items-center">
            Chamar assistente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
