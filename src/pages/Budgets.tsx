import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, parseFormattedCurrency } from '@/lib/formatters';
import { api, BudgetPayload, BudgetResponse } from '@/lib/api';

const INITIAL_FORM = {
  name: '',
  category: '',
  limit: '',
  period: 'mensal',
  notes: '',
};

const CATEGORIES = [
  'Food',
  'Housing',
  'Transport',
  'Health',
  'Leisure',
  'Education',
  'Insurance',
  'Taxes',
  'Other',
];

const PERIODS = [
  { value: 'mensal', label: 'Monthly' },
  { value: 'trimestral', label: 'Quarterly' },
  { value: 'anual', label: 'Annual' },
];

const getBudgetStatus = (budget: BudgetResponse) => {
  if (budget.usage >= 1) return { status: 'exceeded', color: 'destructive', label: 'Exceeded' };
  if (budget.usage >= 0.8) return { status: 'warning', color: 'secondary', label: 'Attention' };
  return { status: 'good', color: 'default', label: 'Healthy' };
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'exceeded':
      return <AlertTriangle className="h-4 w-4" />;
    case 'warning':
      return <TrendingUp className="h-4 w-4" />;
    case 'good':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
};

export default function Budgets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_FORM);

  const budgetsQuery = useQuery({
    queryKey: ['budgets'],
    queryFn: api.budgets.list,
  });

  const summaryQuery = useQuery({
    queryKey: ['budgets', 'summary'],
    queryFn: api.budgets.summary,
  });

  const budgets = budgetsQuery.data?.data ?? [];
  const summary = summaryQuery.data ?? { totalLimit: 0, totalSpent: 0, exceeded: 0, warning: 0 };

  const dynamicCategories = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    budgets.forEach((budget) => set.add(budget.category));
    return Array.from(set).sort();
  }, [budgets]);

  const createBudget = useMutation({
    mutationFn: (payload: BudgetPayload) => api.budgets.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'summary'] });
      setForm(INITIAL_FORM);
      toast({
        title: 'Budget created',
        description: 'The category was configured successfully.',
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Failed to create budget',
        description: 'Check the data and try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateBudget = () => {
    const limitValue = parseFormattedCurrency(form.limit);
    if (!form.name || !form.category || limitValue <= 0) {
      toast({
        title: 'Required fields',
        description: 'Provide a name, category and budget limit.',
        variant: 'destructive',
      });
      return;
    }

    const payload: BudgetPayload = {
      name: form.name,
      category: form.category,
      limit: limitValue,
      period: form.period,
      notes: form.notes,
    };

    createBudget.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-8 animate-fade-in">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
              <p className="text-muted-foreground">Track spending limits and spot critical categories.</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New budget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create budget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Family groceries"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {dynamicCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="limit">Monthly limit (R$)</Label>
                    <Input
                      id="limit"
                      placeholder="1.500,00"
                      value={form.limit}
                      onChange={(event) => setForm((prev) => ({ ...prev, limit: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Period</Label>
                    <Select value={form.period} onValueChange={(value) => setForm((prev) => ({ ...prev, period: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional details about this budget"
                      rows={2}
                      value={form.notes}
                      onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                    />
                  </div>
                  <Button onClick={handleCreateBudget} disabled={createBudget.isPending} className="w-full">
                    {createBudget.isPending ? 'Saving...' : 'Create budget'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total budget</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold">{formatCurrency(summary.totalLimit)}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total spent</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold text-financial-loss">{formatCurrency(summary.totalSpent)}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <p className={`text-2xl font-bold ${summary.totalLimit - summary.totalSpent >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                    {formatCurrency(summary.totalLimit - summary.totalSpent)}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-warning">{summary.exceeded + summary.warning}</p>}
              </CardContent>
            </Card>
          </div>

          {(summary.exceeded > 0 || summary.warning > 0) && (
            <Card className="border-warning bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Budget alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {summary.exceeded > 0 && (
                    <p>
                      <span className="font-medium">{summary.exceeded}</span> category(ies) exceeded the planned limit.
                    </p>
                  )}
                  {summary.warning > 0 && (
                    <p>
                      <span className="font-medium">{summary.warning}</span> are above 80% of the limit.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {budgetsQuery.isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {budgets.map((budget) => {
                const status = getBudgetStatus(budget);
                const percentage = Math.min(budget.usage * 100, 100);
                const remaining = budget.remaining;

                return (
                  <Card key={budget.id} className="transition-all hover:shadow-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-semibold">{budget.name || budget.category}</CardTitle>
                      <Badge variant={status.color} className="flex items-center space-x-1">
                        {getStatusIcon(status.status)}
                        <span>{status.label}</span>
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Spent</p>
                          <p className="text-xl font-bold">{formatCurrency(budget.spent)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Limit</p>
                          <p className="text-xl font-bold">{formatCurrency(budget.limit)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className={percentage > 100 ? 'text-destructive font-medium' : ''}>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={percentage} className="h-3" />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className={`font-medium ${remaining >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {!budgets.length && (
                <Card className="md:col-span-2 border-dashed">
                  <CardContent className="flex h-32 flex-col items-center justify-center space-y-2 text-center text-muted-foreground">
                    <p>No budgets registered for the selected period.</p>
                    <p>Start by adding a budget to track your spending.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
