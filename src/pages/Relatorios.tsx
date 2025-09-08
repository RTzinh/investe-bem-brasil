import { useState } from "react";
import { Calendar, Download, Filter, TrendingUp, TrendingDown } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface ReportData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  investments: number;
}

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  budget?: number;
}

export default function Relatorios() {
  const [selectedPeriod, setSelectedPeriod] = useState("6m");
  const [selectedReport, setSelectedReport] = useState("fluxo");

  // Mock data
  const cashFlowData: ReportData[] = [
    { month: "2023-08", income: 8500, expenses: 6200, balance: 2300, investments: 1000 },
    { month: "2023-09", income: 8500, expenses: 5800, balance: 2700, investments: 1200 },
    { month: "2023-10", income: 9200, expenses: 6100, balance: 3100, investments: 1500 },
    { month: "2023-11", income: 8500, expenses: 6800, balance: 1700, investments: 800 },
    { month: "2023-12", income: 10500, expenses: 7200, balance: 3300, investments: 2000 },
    { month: "2024-01", income: 8500, expenses: 6200, balance: 2300, investments: 1000 },
  ];

  const categoryData: CategoryData[] = [
    { category: "Alimentação", amount: 1245.80, percentage: 28.5, budget: 1000 },
    { category: "Moradia", amount: 1800.00, percentage: 41.2, budget: 1800 },
    { category: "Transporte", amount: 380.45, percentage: 8.7, budget: 500 },
    { category: "Lazer", amount: 425.30, percentage: 9.7, budget: 300 },
    { category: "Saúde", amount: 280.50, percentage: 6.4, budget: 400 },
    { category: "Educação", amount: 245.00, percentage: 5.6, budget: 300 },
  ];

  const totalExpenses = categoryData.reduce((acc, cat) => acc + cat.amount, 0);

  const exportReport = (format: 'csv' | 'pdf') => {
    // Mock export functionality
    alert(`Exportando relatório em formato ${format.toUpperCase()}`);
  };

  const renderCashFlowReport = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashFlowData.map((data, index) => {
              const monthName = new Date(data.month + "-01").toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
              });
              
              return (
                <div key={data.month} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <h4 className="font-medium capitalize">{monthName}</h4>
                    <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Receitas</p>
                        <p className="font-semibold text-financial-gain">{formatCurrency(data.income)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Despesas</p>
                        <p className="font-semibold text-financial-loss">{formatCurrency(data.expenses)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saldo</p>
                        <p className={`font-semibold ${data.balance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                          {formatCurrency(data.balance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Investimentos</p>
                        <p className="font-semibold text-primary">{formatCurrency(data.investments)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    {data.balance >= 0 ? (
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
                  {formatCurrency(cashFlowData.reduce((acc, d) => acc + d.income, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de Despesas:</span>
                <span className="font-semibold text-financial-loss">
                  {formatCurrency(cashFlowData.reduce((acc, d) => acc + d.expenses, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo Acumulado:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(cashFlowData.reduce((acc, d) => acc + d.balance, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Investido:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(cashFlowData.reduce((acc, d) => acc + d.investments, 0))}
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
                  {formatCurrency(Math.max(...cashFlowData.map(d => d.balance)))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pior mês (saldo)</p>
                <p className="text-lg font-semibold text-financial-loss">
                  {formatCurrency(Math.min(...cashFlowData.map(d => d.balance)))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média de gastos</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(cashFlowData.reduce((acc, d) => acc + d.expenses, 0) / cashFlowData.length)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCategoryReport = () => (
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
                    <p className="text-xs text-muted-foreground">{category.percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                {category.budget && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Orçamento: {formatCurrency(category.budget)}</span>
                    <span>
                      {category.amount > category.budget ? 'Excesso: ' : 'Restante: '}
                      {formatCurrency(Math.abs(category.budget - category.amount))}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Maior Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categoryData[0].category}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(categoryData[0].amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{categoryData.length}</p>
            <p className="text-sm text-muted-foreground">Com movimentação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Concentração</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(categoryData.slice(0, 3).reduce((acc, cat) => acc + cat.percentage, 0)).toFixed(0)}%
            </p>
            <p className="text-sm text-muted-foreground">Top 3 categorias</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
              <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => exportReport('csv')}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => exportReport('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros do Relatório</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label htmlFor="report-type">Tipo de Relatório</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fluxo">Fluxo de Caixa</SelectItem>
                      <SelectItem value="categorias">Por Categorias</SelectItem>
                      <SelectItem value="investimentos">Investimentos</SelectItem>
                      <SelectItem value="metas">Metas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="period">Período</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">Último mês</SelectItem>
                      <SelectItem value="3m">Últimos 3 meses</SelectItem>
                      <SelectItem value="6m">Últimos 6 meses</SelectItem>
                      <SelectItem value="1y">Último ano</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start-date">Data Início</Label>
                  <Input type="date" id="start-date" />
                </div>
                <div>
                  <Label htmlFor="end-date">Data Fim</Label>
                  <Input type="date" id="end-date" />
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedReport === "fluxo" && renderCashFlowReport()}
          {selectedReport === "categorias" && renderCategoryReport()}
          
          {selectedReport === "investimentos" && (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">Relatório de Investimentos</h3>
                <p className="text-muted-foreground">
                  Funcionalidade em desenvolvimento. Em breve você poderá analisar a performance da sua carteira.
                </p>
              </CardContent>
            </Card>
          )}

          {selectedReport === "metas" && (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-2">Relatório de Metas</h3>
                <p className="text-muted-foreground">
                  Funcionalidade em desenvolvimento. Em breve você poderá acompanhar o progresso das suas metas.
                </p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}