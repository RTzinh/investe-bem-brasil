import { useState } from "react";
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

interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  month: string;
}

export default function Orcamentos() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([
    {
      id: "1",
      category: "Alimentação",
      limit: 1000,
      spent: 1245.80,
      month: "2024-01",
    },
    {
      id: "2", 
      category: "Transporte",
      limit: 500,
      spent: 380.45,
      month: "2024-01",
    },
    {
      id: "3",
      category: "Lazer",
      limit: 300,
      spent: 125.30,
      month: "2024-01",
    },
    {
      id: "4",
      category: "Saúde",
      limit: 400,
      spent: 450.00,
      month: "2024-01",
    },
  ]);

  const [newBudget, setNewBudget] = useState({
    category: "",
    limit: "",
    month: new Date().toISOString().slice(0, 7),
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
    if (percentage >= 100) return { status: 'exceeded', color: 'destructive' };
    if (percentage >= 80) return { status: 'warning', color: 'warning' };
    return { status: 'good', color: 'default' };
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

  const handleAddBudget = () => {
    if (!newBudget.category || !newBudget.limit) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const budget: Budget = {
      id: Date.now().toString(),
      category: newBudget.category,
      limit: parseFormattedCurrency(newBudget.limit),
      spent: 0,
      month: newBudget.month,
    };

    setBudgets(prev => [budget, ...prev]);
    setNewBudget({
      category: "",
      limit: "",
      month: new Date().toISOString().slice(0, 7),
    });

    toast({
      title: "Orçamento Criado",
      description: `Orçamento para ${budget.category} foi criado com sucesso.`,
    });
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
                      onChange={(e) => setNewBudget(prev => ({...prev, month: e.target.value}))}
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Orçamento Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gasto Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-loss">{formatCurrency(totalSpent)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Restante</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                  {formatCurrency(totalBudget - totalSpent)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-warning">{exceededBudgets + warningBudgets}</p>
              </CardContent>
            </Card>
          </div>

          {(exceededBudgets > 0 || warningBudgets > 0) && (
            <Card className="border-warning bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Alertas de Orçamento</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {exceededBudgets > 0 && (
                    <p className="text-sm">
                      <span className="font-medium">{exceededBudgets}</span> categoria(s) excederam o orçamento
                    </p>
                  )}
                  {warningBudgets > 0 && (
                    <p className="text-sm">
                      <span className="font-medium">{warningBudgets}</span> categoria(s) estão próximas do limite (&gt;80%)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {budgets.map((budget) => {
              const status = getBudgetStatus(budget);
              const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
              
              return (
                <Card key={budget.id} className="transition-all hover:shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">{budget.category}</CardTitle>
                    <Badge variant={status.color as any} className="flex items-center space-x-1">
                      {getStatusIcon(status.status)}
                      <span>{status.status === 'exceeded' ? 'Excedido' : status.status === 'warning' ? 'Atenção' : 'OK'}</span>
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Gasto</p>
                        <p className="text-xl font-bold">{formatCurrency(budget.spent)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Limite</p>
                        <p className="text-xl font-bold">{formatCurrency(budget.limit)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span className={percentage > 100 ? 'text-destructive font-medium' : ''}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={percentage} 
                        className={`h-3 ${percentage >= 100 ? 'bg-destructive/20' : percentage >= 80 ? 'bg-warning/20' : ''}`}
                      />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Restante:</span>
                      <span className={`font-medium ${budget.limit - budget.spent >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                        {formatCurrency(budget.limit - budget.spent)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}