import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Plus, Filter, Download, Search, RefreshCcw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrency, formatDate, parseFormattedCurrency } from '@/lib/formatters';
import { api, TransactionPayload, TransactionResponse } from '@/lib/api';

interface Filters {
  search: string;
  type: 'all' | 'income' | 'expense';
  category: string;
  account: string;
}

const TODAY = new Date().toISOString().split('T')[0];

const INITIAL_FORM: TransactionForm = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  account: '',
  date: TODAY,
  notes: '',
};

interface TransactionForm {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  account: string;
  date: string;
  notes: string;
}

const BASE_CATEGORIES = [
  'Alimentação > Mercado',
  'Alimentação > Restaurante',
  'Moradia > Aluguel',
  'Transporte > Combustível',
  'Saúde > Farmácia',
  'Educação > Cursos',
  'Investimentos',
  'Salário',
  'Freelance',
];

const BASE_ACCOUNTS = ['Conta Corrente', 'Poupança', 'Cartão de Crédito', 'Carteira', 'Corretora'];

export default function Transacoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', type: 'all', category: 'all', account: 'all' });
  const [newTransaction, setNewTransaction] = useState<TransactionForm>(INITIAL_FORM);

  const queryParams = useMemo(() => ({
    search: filters.search || undefined,
    type: filters.type !== 'all' ? filters.type : undefined,
    category: filters.category !== 'all' ? filters.category : undefined,
    account: filters.account !== 'all' ? filters.account : undefined,
  }), [filters]);

  const transactionsQuery = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => api.transactions.list(queryParams),
  });

  const transactions = transactionsQuery.data?.data ?? [];

  const dynamicCategories = useMemo(() => {
    const set = new Set<string>(BASE_CATEGORIES);
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  const dynamicAccounts = useMemo(() => {
    const set = new Set<string>(BASE_ACCOUNTS);
    transactions.forEach((t) => set.add(t.account));
    return Array.from(set).sort();
  }, [transactions]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
          acc.balance += transaction.amount;
        } else {
          acc.expenses += transaction.amount;
          acc.balance -= transaction.amount;
        }
        acc.count += 1;
        return acc;
      },
      { income: 0, expenses: 0, balance: 0, count: 0 }
    );
  }, [transactions]);

  const createMutation = useMutation({
    mutationFn: (payload: TransactionPayload) => api.transactions.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setNewTransaction(INITIAL_FORM);
      toast({
        title: 'Transação registrada',
        description: 'Os dados foram salvos com sucesso.',
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Erro ao salvar transação',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => api.transactions.import(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Importação concluída',
        description: `${result.imported} transações foram adicionadas com sucesso.`,
      });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Falha ao importar',
        description: 'Não foi possível processar o extrato informado.',
        variant: 'destructive',
      });
    },
  });

  const handleAddTransaction = () => {
    const amountValue = parseFormattedCurrency(newTransaction.amount);
    if (!newTransaction.description || amountValue <= 0 || !newTransaction.category || !newTransaction.account) {
      toast({
        title: 'Preencha todos os campos obrigatórios',
        description: 'Descrição, valor, categoria e conta são necessários.',
        variant: 'destructive',
      });
      return;
    }

    const payload: TransactionPayload = {
      description: newTransaction.description,
      amount: amountValue,
      type: newTransaction.type,
      category: newTransaction.category,
      account: newTransaction.account,
      date: newTransaction.date,
      notes: newTransaction.notes,
    };

    createMutation.mutate(payload);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    importMutation.mutate(file);
    event.target.value = '';
  };

  const handleExport = () => {
    if (!transactions.length) {
      toast({
        title: 'Nenhuma transação para exportar',
        description: 'Registre ou importe transações antes de exportar.',
      });
      return;
    }

    const header = 'Descrição,Valor,Tipo,Categoria,Conta,Data\n';
    const body = transactions
      .map((transaction) => [
        transaction.description,
        transaction.amount.toFixed(2),
        transaction.type,
        transaction.category,
        transaction.account,
        formatDate(transaction.date),
      ].join(','))
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transacoes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportação concluída',
      description: 'Arquivo CSV gerado com sucesso.',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-8 animate-fade-in">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
              <p className="text-muted-foreground">Gerencie seus lançamentos financeiros, importações e conciliações.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar Extrato CSV
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Transação
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Registrar transação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={newTransaction.description}
                        onChange={(event) => setNewTransaction((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Ex.: Supermercado, salário, etc."
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={newTransaction.type} onValueChange={(value: 'income' | 'expense') => setNewTransaction((prev) => ({ ...prev, type: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Despesa</SelectItem>
                            <SelectItem value="income">Receita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Valor (R$)</Label>
                        <Input
                          id="amount"
                          value={newTransaction.amount}
                          onChange={(event) => setNewTransaction((prev) => ({ ...prev, amount: event.target.value }))}
                          placeholder="1.234,56"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <Label>Categoria</Label>
                        <Select value={newTransaction.category} onValueChange={(value) => setNewTransaction((prev) => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
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
                      <div>
                        <Label>Conta</Label>
                        <Select value={newTransaction.account} onValueChange={(value) => setNewTransaction((prev) => ({ ...prev, account: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {dynamicAccounts.map((account) => (
                              <SelectItem key={account} value={account}>
                                {account}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <Label htmlFor="date">Data</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newTransaction.date}
                          onChange={(event) => setNewTransaction((prev) => ({ ...prev, date: event.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={newTransaction.notes}
                          onChange={(event) => setNewTransaction((prev) => ({ ...prev, notes: event.target.value }))}
                          placeholder="Anotações adicionais"
                          rows={2}
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddTransaction} disabled={createMutation.isPending} className="w-full">
                      {createMutation.isPending ? 'Salvando...' : 'Adicionar Transação'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-gain">{formatCurrency(summary.income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-loss">{formatCurrency(summary.expenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.balance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.count}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>Histórico de Transações</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar descrição, categoria ou conta..."
                      className="pl-9"
                      value={filters.search}
                      onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                    />
                  </div>
                  <Select value={filters.type} onValueChange={(value: Filters['type']) => setFilters((prev) => ({ ...prev, type: value }))}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Receitas</SelectItem>
                      <SelectItem value="expense">Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.category} onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas categorias</SelectItem>
                      {dynamicCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.account} onValueChange={(value) => setFilters((prev) => ({ ...prev, account: value }))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas contas</SelectItem>
                      {dynamicAccounts.map((account) => (
                        <SelectItem key={account} value={account}>
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['transactions'] })}>
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsQuery.isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : transactions.length ? (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium leading-none">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category} • {transaction.account} • {formatDate(transaction.date)}
                        </p>
                        {transaction.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{transaction.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${transaction.type === 'income' ? 'text-financial-gain' : 'text-financial-loss'}`}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhuma transação encontrada com os filtros selecionados.
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
