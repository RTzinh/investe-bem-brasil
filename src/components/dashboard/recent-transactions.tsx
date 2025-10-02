import { Link } from 'react-router-dom';
import { MoreHorizontal, ArrowUpCircle, ArrowDownCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useDashboardOverview } from '@/hooks/use-dashboard';

export function RecentTransactions() {
  const { data, isLoading } = useDashboardOverview();
  const transactions = data?.recentTransactions ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-2 pb-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle className="text-lg font-semibold">Transacoes recentes</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/transacoes" className="flex items-center">
              Ver todas
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/orcamentos" className="flex items-center">
              Revisar gastos
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading && !transactions.length ? (
            [0, 1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-16 w-full rounded-lg" />
            ))
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between space-x-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'rounded-full p-2',
                      transaction.type === 'income'
                        ? 'bg-financial-gain/10 text-financial-gain'
                        : 'bg-financial-loss/10 text-financial-loss'
                    )}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="h-4 w-4" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category} - {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        transaction.type === 'income' ? 'text-financial-gain' : 'text-financial-loss'
                      )}
                    >
                      {transaction.type === 'income' ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/transacoes?edit=${transaction.id}`}>Editar</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Categorizar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}

          {!isLoading && !transactions.length && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma transacao encontrada recentemente.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
