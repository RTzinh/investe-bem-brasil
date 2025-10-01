import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseFormattedCurrency } from "@/lib/formatters";
import { api, Budget } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function Orcamentos() {
  const { toast } = useToast();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", selectedMonth],
    queryFn: () => api.getBudgets(selectedMonth),
  });

  const createBudgetMutation = useMutation({
    mutationFn: api.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });

  const [newBudget, setNewBudget] = useState({
    category: "",
    limit: "",
    month: currentMonth,
  });

  const categories = [
    "Alimentação",
    "Moradia",
    "Transporte",
    "Saúde",
    "Lazer",
    "Educação",
    "Roupas",
    "Seguros",
    "Impostos",
    "Outros",
  ];

  const getBudgetStatus = (budget: Budget) => {
    const percentage = (budget.spent / budget.limit) * 100;
    if (percentage >= 100) return { status: 'exceeded', color: 'destructive' } as const;
    if (percentage >= 80) return { status: 'warning', color: 'warning' } as const;
    return { status: 'good', color: 'default' } as const;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const handleAddBudget = async () => {
    if (!newBudget.category || !newBudget.limit) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createBudgetMutation.mutateAsync({
        category: newBudget.category,
        limit: parseFormattedCurrency(newBudget.limit),
        month: newBudget.month,
      });

      toast({
        title: "Orçamento Criado",
        description: `Orçamento para ${newBudget.category} foi criado com sucesso.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar o orçamento.';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setNewBudget({
      category: "",
      limit: "",
      month: currentMonth,
    });
    setSelectedMonth(currentMonth);
  };

  const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const exceededBudgets = budgets.filter(b => getBudgetStatus(b).status === 'exceeded').length;
  const warningBudgets = budgets.filter(b => getBudgetStatus(b).status === 'warning').length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
              <p className="text-muted-foreground">Controle seus gastos por categoria</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Orçamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Orçamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={newBudget.category} onValueChange={(value) => setNewBudget(prev => ({...prev, category: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="limit">Limite (R$)</Label>
                    <Input
                      id="limit"
                      value={newBudget.limit}
                      onChange={(e) => setNewBudget(prev => ({...prev, limit: e.target.value}))}
                      placeholder="1.000,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="month">Mês</Label>
                    <Input
                      id="month"
                      type="month"
                      value={newBudget.month}
                      onChange={(e) => {
                        setNewBudget(prev => ({...prev, month: e.target.value}));
                        setSelectedMonth(e.target.value || currentMonth);
                      }}
                    />
                  </div>
                  <Button onClick={handleAddBudget} className="w-full">
                    Criar Orçamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Planejado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-loss">{formatCurrency(totalSpent)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Orçamentos Estourados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{exceededBudgets}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Em Atenção</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-warning">{warningBudgets}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full" />
              ))
            ) : budgets.length === 0 ? (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-10 text-center text-muted-foreground">
                  Nenhum orçamento cadastrado para este mês.
                </CardContent>
              </Card>
            ) : (
              budgets.map((budget) => {
                const status = getBudgetStatus(budget);
                const percentage = (budget.spent / budget.limit) * 100;

                return (
                  <Card key={budget.id} className="relative overflow-hidden">
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold">{budget.category}</CardTitle>
                          <p className="text-sm text-muted-foreground">Meta: {formatCurrency(budget.limit)}</p>
                        </div>
                        <Badge variant={status.color} className="flex items-center space-x-1">
                          {getStatusIcon(status.status)}
                          <span className="capitalize">
                            {status.status === 'good' ? 'No controle' : status.status === 'warning' ? 'Atenção' : 'Estourado'}
                          </span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Gasto</span>
                          <span>{formatCurrency(budget.spent)}</span>
                        </div>
                        <Progress value={Math.min(percentage, 100)} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{percentage.toFixed(1)}% do limite</span>
                          <span>Restante: {formatCurrency(budget.limit - budget.spent)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
