import { PieChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

export function InvestmentSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ["investments", "summary"],
    queryFn: api.getInvestments,
  });

  const investments = data?.investments ?? [];
  const totals = data?.totals ?? { totalValue: 0, dividends: 0, performance: 0 };
  const allocation = data?.allocation ?? { total: 0, breakdown: [] };

  const enriched = investments.map((investment) => {
    const breakdown = allocation.breakdown.find((item) => item.assetType === investment.assetType);
    return {
      asset: investment.symbol,
      type: investment.assetType,
      value: investment.totalValue,
      allocation: breakdown?.percentage ?? 0,
      performance: investment.performance,
    };
  }).sort((a, b) => b.value - a.value).slice(0, 5);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Carteira de Investimentos</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totals.totalValue)}</p>
              <p className="text-xs text-muted-foreground">
                Patrimônio Investido
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-financial-gain">
                +{formatPercentage(totals.performance)}
              </p>
              <p className="text-xs text-muted-foreground">Rentabilidade</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Alocação por Ativo</p>
            {enriched.map((investment) => (
              <div key={investment.asset} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{investment.asset}</span>
                    <span className="text-muted-foreground">({investment.type})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{formatCurrency(investment.value)}</span>
                    <span className={`text-xs ${
                      investment.performance > 0 ? 'text-financial-gain' : 'text-financial-loss'
                    }`}>
                      {investment.performance > 0 ? '+' : ''}{formatPercentage(investment.performance)}
                    </span>
                  </div>
                </div>
                <Progress
                  value={investment.allocation}
                  className="h-2"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Alocação Recomendada</span>
              <span className="text-primary font-medium cursor-pointer hover:underline">
                Ver Sugestão IA →
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}