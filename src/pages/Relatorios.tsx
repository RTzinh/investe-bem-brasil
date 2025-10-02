import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { api, CashflowPoint, CategoryBreakdown } from '@/lib/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PERIOD_OPTIONS = [
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
];

const COLORS = ['#2563eb', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#0ea5e9'];

export default function Relatorios() {
  const [period, setPeriod] = useState('6m');
  const [reportType, setReportType] = useState<'fluxo' | 'categorias'>('fluxo');

  const cashflowQuery = useQuery({
    queryKey: ['reports', 'cashflow', period],
    queryFn: () => api.reports.cashflow(period),
  });

  const categoryQuery = useQuery({
    queryKey: ['reports', 'categories', period],
    queryFn: () => api.reports.categories(period),
  });

  const overviewQuery = useQuery({
    queryKey: ['reports', 'overview', period],
    queryFn: () => api.reports.overview(period),
  });

  const cashflow = cashflowQuery.data?.data ?? [];
  const categories = categoryQuery.data?.data ?? [];
  const overview = overviewQuery.data ?? { income: 0, expenses: 0, balance: 0 };

  const categorySummary = useMemo(() => {
    const total = categories.reduce((acc, item) => acc + item.expenses, 0);
    return {
      total,
      top: categories.slice(0, 3),
    };
  }, [categories]);

  const exportCsv = () => {
    const header = 'Tipo,Valor\n';
    const rows = [
      ['Receitas', overview.income],
      ['Despesas', overview.expenses],
      ['Saldo', overview.balance],
    ];
    const blob = new Blob([header + rows.map((row) => `${row[0]},${row[1]}`).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${reportType}-${period}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Relatórios</h1>
              <p className="text-muted-foreground">Insights e tendências das suas finanças pessoais.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Tipo de relatório</Label>
                  <Select value={reportType} onValueChange={(value: 'fluxo' | 'categorias') => setReportType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fluxo">Fluxo de caixa</SelectItem>
                      <SelectItem value="categorias">Gastos por categoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Atualizado em {new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo do período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Receitas</p>
                  {overviewQuery.isLoading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="text-2xl font-semibold text-financial-gain">{formatCurrency(overview.income)}</p>}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Despesas</p>
                  {overviewQuery.isLoading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="text-2xl font-semibold text-financial-loss">{formatCurrency(overview.expenses)}</p>}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  {overviewQuery.isLoading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className={`text-2xl font-semibold ${overview.balance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>{formatCurrency(overview.balance)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {reportType === 'fluxo' ? (
            <Card>
              <CardHeader>
                <CardTitle>Evolução do fluxo de caixa</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                {cashflowQuery.isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : cashflow.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashflow}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#22c55e55" name="Receitas" />
                      <Area type="monotone" dataKey="expenses" stackId="1" stroke="#ef4444" fill="#ef444455" name="Despesas" />
                      <Area type="monotone" dataKey="balance" stroke="#2563eb" fill="#2563eb40" name="Saldo" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Nenhum dado encontrado para o período selecionado.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="h-80">
                <CardHeader>
                  <CardTitle>Distribuição de despesas por categoria</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  {categoryQuery.isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : categories.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categories} dataKey="expenses" nameKey="category" innerRadius={50} outerRadius={90}>
                          {categories.map((entry, index) => (
                            <Cell key={entry.category} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name) => [formatCurrency(value), name as string]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Nenhuma despesa registrada no período.
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Maiores categorias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categorySummary.top.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{category.category}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(category.expenses)}</p>
                      </div>
                      <Badge>{category.percentage.toFixed(1)}%</Badge>
                    </div>
                  ))}
                  <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                    Total gasto: <span className="font-semibold text-foreground">{formatCurrency(categorySummary.total)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
