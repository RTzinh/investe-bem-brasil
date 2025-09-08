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

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date;
}

export function RecentTransactions() {
  // Mock data
  const transactions: Transaction[] = [
    {
      id: "1",
      description: "Salário - Empresa XYZ",
      amount: 8500.00,
      type: "income",
      category: "Salário",
      date: new Date("2024-01-05"),
    },
    {
      id: "2",
      description: "Supermercado Extra",
      amount: -245.80,
      type: "expense",
      category: "Alimentação",
      date: new Date("2024-01-04"),
    },
    {
      id: "3",
      description: "Investimento - BOVA11",
      amount: -1000.00,
      type: "expense",
      category: "Investimentos",
      date: new Date("2024-01-03"),
    },
    {
      id: "4",
      description: "Freelance - Projeto ABC",
      amount: 1200.00,
      type: "income",
      category: "Freelance",
      date: new Date("2024-01-02"),
    },
    {
      id: "5",
      description: "Aluguel",
      amount: -1800.00,
      type: "expense",
      category: "Moradia",
      date: new Date("2024-01-01"),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Transações Recentes</CardTitle>
        <Button variant="outline" size="sm">
          Ver Todas
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
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
                    {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
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
      </CardContent>
    </Card>
  );
}