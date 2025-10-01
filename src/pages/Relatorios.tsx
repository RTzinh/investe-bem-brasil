import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";
import { api, ReportSummary } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const periodMap: Record<string, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
  '24m': 24,
};

export default function Relatorios() {
  const [selectedPeriod, setSelectedPeriod] = useState("6m");
  const [selectedReport, setSelectedReport] = useState("fluxo");

  const months = periodMap[selectedPeriod] ?? 6;

  const { data, isLoading } = useQuery({
    queryKey: ["reports", months],
    queryFn: () => api.getReportSummary(months),
  });

  const summary: ReportSummary = data ?? { cashFlow: [], categories: [], totals: { totalIncome: 0, totalExpenses: 0, totalInvested: 0 } };

  const exportReport = (format: 'csv' | 'pdf') => {
    alert(`Exportando relatório em formato ${format.toUpperCase()}`);
  };

  const renderCashFlowReport = () => {
    if (isLoading) {
      return <Skeleton className="h-64 w-full" />;
    }

    const cashFlowData = summary.cashFlow;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cashFlowData.map((dataRow) => {
                const monthName = new Date(dataRow.month + "-01").toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric'
                });

                return (
                  <div key={dataRow.month} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <h4 className="font-medium capitalize">{monthName}</h4>
                      <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Receitas</p>
                          <p className="font-semibold text-financial-gain">{formatCurrency(dataRow.income)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Despesas</p>
                          <p className="font-semibold text-financial-loss">{formatCurrency(dataRow.expenses)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Saldo</p>
                          <p className={`font-semibold ${dataRow.balance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                            {formatCurrency(dataRow.balance)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Investimentos</p>
                          <p className="font-semibold text-primary">{formatCurrency(dataRow.investments)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center ml-4">
                      {dataRow.balance >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-financial-gain" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-financial-loss" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Receitas:</span>
                  <span className="font-semibold text-financial-gain">
                    {formatCurrency(summary.totals.totalIncome)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de Despesas:</span>
                  <span className="font-semibold text-financial-loss">
                    {formatCurrency(summary.totals.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo Acumulado:</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(summary.totals.totalIncome - summary.totals.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Investido:</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(summary.totals.totalInvested)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Melhor mês (saldo)</p>
                  <p className="text-lg font-semibold text-financial-gain">
                    {cashFlowData.length > 0 ? formatCurrency(Math.max(...cashFlowData.map(d => d.balance))) : formatCurrency(0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pior mês (saldo)</p>
                  <p className="text-lg font-semibold text-financial-loss">
                    {cashFlowData.length > 0 ? formatCurrency(Math.min(...cashFlowData.map(d => d.balance))) : formatCurrency(0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média de gastos</p>
                  <p className="text-lg font-semibold">
                    {cashFlowData.length > 0 ? formatCurrency(cashFlowData.reduce((acc, d) => acc + d.expenses, 0) / cashFlowData.length) : formatCurrency(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderCategoryReport = () => {
    if (isLoading) {
      return <Skeleton className="h-64 w-full" />;
    }

    const categoryData = summary.categories;
    const totalExpenses = categoryData.reduce((acc, cat) => acc + cat.amount, 0);

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{category.category}</span>
                      {category.budget && category.amount > category.budget && (
                        <span className="text-xs text-destructive">Acima do orçamento</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(category.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.percentage.toFixed(1)}% do total
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0}
                    className="h-2"
                  />
                  {category.budget && (
                    <p className="text-xs text-muted-foreground">
                      Orçamento: {formatCurrency(category.budget)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
              <p className="text-muted-foreground">Análises detalhadas das suas finanças</p>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                  <SelectItem value="24m">Últimos 24 meses</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => exportReport('csv')}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tipo de Relatório</CardTitle>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fluxo">Fluxo de Caixa</SelectItem>
                    <SelectItem value="categorias">Categorias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedReport === 'fluxo' ? renderCashFlowReport() : renderCategoryReport()}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
