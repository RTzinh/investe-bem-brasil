import { Link } from 'react-router-dom';
import { PieChart, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { useDashboardOverview } from '@/hooks/use-dashboard';

export function InvestmentSummary() {
  const { data, isLoading } = useDashboardOverview();
  const investments = data?.investments ?? [];
  const totalValue = investments.reduce((acc, inv) => acc + inv.totalValue, 0);
  const totalPerformance = totalValue > 0
    ? investments.reduce((acc, inv) => acc + inv.performance * (inv.totalValue / totalValue), 0)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Investment portfolio</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading && !investments.length ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground">Invested assets</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-semibold ${totalPerformance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                  {totalPerformance >= 0 ? '+' : ''}{formatPercentage(totalPerformance * 100)}
                </p>
                <p className="text-xs text-muted-foreground">Weighted return</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Allocation by asset</p>
              {investments.map((investment) => {
                const allocation = totalValue > 0 ? (investment.totalValue / totalValue) * 100 : 0;
                return (
                  <div key={investment.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{investment.symbol}</span>
                        <span className="text-muted-foreground">({investment.type})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatCurrency(investment.totalValue)}</span>
                        <span className={`text-xs ${investment.performance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                          {investment.performance >= 0 ? '+' : ''}{formatPercentage(investment.performance * 100)}
                        </span>
                      </div>
                    </div>
                    <Progress value={allocation} className="h-2" />
                  </div>
                );
              })}
              {!investments.length && (
                <p className="text-sm text-muted-foreground">No assets registered yet. Record trades to start tracking.</p>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground">Review real-time allocation suggestions</span>
              <Button asChild variant="link" className="px-0 text-primary">
                <Link to="/assistant" className="flex items-center">
                  See AI suggestion
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
