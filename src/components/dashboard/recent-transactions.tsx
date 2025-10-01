import { MoreHorizontal, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/hooks/use-transactions";
import { Transaction } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentTransactionsProps {
  limit?: number;
  transactions?: Transaction[];
  isLoading?: boolean;
}

export function RecentTransactions({ limit = 5, transactions, isLoading }: RecentTransactionsProps) {
  const { data: fetchedTransactions = [], isLoading: queryLoading } = useTransactions({
    enabled: !transactions,
  });

  const loading = isLoading ?? queryLoading;
  const list = (transactions ?? fetchedTransactions).slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Transações Recentes</CardTitle>
        <Button variant="outline" size="sm">
          Ver Todas
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: limit }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transação registrada ainda.</p>
        ) : (
          <div className="space-y-4">
            {list.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between space-x-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "rounded-full p-2",
                    transaction.type === 'income'
                      ? "bg-financial-gain/10 text-financial-gain"
                      : "bg-financial-loss/10 text-financial-loss"
                  )}>
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="h-4 w-4" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category} • {formatDate(transaction.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-semibold",
                      transaction.type === 'income'
                        ? "text-financial-gain"
                        : "text-financial-loss"
                    )}>
                      {transaction.type === 'income' ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem>Categorizar</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}