import { useState } from "react";
import { Plus, Target, Calendar, DollarSign, TrendingUp } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, parseFormattedCurrency } from "@/lib/formatters";

interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  priority: 'low' | 'medium' | 'high';
  category: string;
  monthlyContribution: number;
}

export default function Metas() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      name: "Reserva de Emergência",
      description: "6 meses de despesas essenciais",
      targetAmount: 24000,
      currentAmount: 18000,
      deadline: new Date("2024-12-31"),
      priority: 'high',
      category: "Emergência",
      monthlyContribution: 1000,
    },
    {
      id: "2",
      name: "Viagem para Europa",
      description: "Férias de 15 dias na Europa",
      targetAmount: 15000,
      currentAmount: 4500,
      deadline: new Date("2024-07-01"),
      priority: 'medium',
      category: "Lazer",
      monthlyContribution: 1750,
    },
    {
      id: "3",
      name: "Notebook Novo",
      description: "MacBook Pro para trabalho",
      targetAmount: 8000,
      currentAmount: 2400,
      deadline: new Date("2024-05-01"),
      priority: 'medium',
      category: "Equipamentos",
      monthlyContribution: 800,
    },
    {
      id: "4",
      name: "Casa Própria",
      description: "Entrada para financiamento imobiliário",
      targetAmount: 80000,
      currentAmount: 12000,
      deadline: new Date("2026-12-31"),
      priority: 'high',
      category: "Imóvel",
      monthlyContribution: 2000,
    },
  ]);

  const [newGoal, setNewGoal] = useState({
    name: "",
    description: "",
    targetAmount: "",
    deadline: "",
    priority: "medium" as "low" | "medium" | "high",
    category: "",
    monthlyContribution: "",
  });

  const categories = [
    "Emergência",
    "Lazer",
    "Equipamentos",
    "Imóvel",
    "Educação",
    "Saúde",
    "Investimentos",
    "Outros",
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Indefinida';
    }
  };

  const calculateMonthsToGoal = (goal: Goal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (goal.monthlyContribution <= 0) return Infinity;
    return Math.ceil(remaining / goal.monthlyContribution);
  };

  const isGoalOnTrack = (goal: Goal) => {
    const today = new Date();
    const monthsRemaining = (goal.deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const monthsNeeded = calculateMonthsToGoal(goal);
    return monthsNeeded <= monthsRemaining;
  };

  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      name: newGoal.name,
      description: newGoal.description,
      targetAmount: parseFormattedCurrency(newGoal.targetAmount),
      currentAmount: 0,
      deadline: new Date(newGoal.deadline),
      priority: newGoal.priority,
      category: newGoal.category,
      monthlyContribution: parseFormattedCurrency(newGoal.monthlyContribution),
    };

    setGoals(prev => [goal, ...prev]);
    setNewGoal({
      name: "",
      description: "",
      targetAmount: "",
      deadline: "",
      priority: "medium",
      category: "",
      monthlyContribution: "",
    });

    toast({
      title: "Meta Criada",
      description: `Meta "${goal.name}" foi criada com sucesso.`,
    });
  };

  const handleContribute = (goalId: string, amount: number) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, currentAmount: goal.currentAmount + amount }
        : goal
    ));

    toast({
      title: "Contribuição Adicionada",
      description: `${formatCurrency(amount)} foram adicionados à meta.`,
    });
  };

  const totalTargetAmount = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalCurrentAmount = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const completedGoals = goals.filter(g => (g.currentAmount / g.targetAmount) >= 1).length;
  const onTrackGoals = goals.filter(g => isGoalOnTrack(g)).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Metas Financeiras</h1>
              <p className="text-muted-foreground">Defina e acompanhe seus objetivos</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Meta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome da Meta</Label>
                    <Input
                      id="name"
                      value={newGoal.name}
                      onChange={(e) => setNewGoal(prev => ({...prev, name: e.target.value}))}
                      placeholder="Ex: Reserva de Emergência"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <Textarea
                      id="description"
                      value={newGoal.description}
                      onChange={(e) => setNewGoal(prev => ({...prev, description: e.target.value}))}
                      placeholder="Descreva sua meta..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="targetAmount">Valor Alvo (R$)</Label>
                      <Input
                        id="targetAmount"
                        value={newGoal.targetAmount}
                        onChange={(e) => setNewGoal(prev => ({...prev, targetAmount: e.target.value}))}
                        placeholder="10.000,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyContribution">Contribuição Mensal (R$)</Label>
                      <Input
                        id="monthlyContribution"
                        value={newGoal.monthlyContribution}
                        onChange={(e) => setNewGoal(prev => ({...prev, monthlyContribution: e.target.value}))}
                        placeholder="500,00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="deadline">Data Limite</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newGoal.deadline}
                      onChange={(e) => setNewGoal(prev => ({...prev, deadline: e.target.value}))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Prioridade</Label>
                      <Select value={newGoal.priority} onValueChange={(value: "low" | "medium" | "high") => setNewGoal(prev => ({...prev, priority: value}))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select value={newGoal.category} onValueChange={(value) => setNewGoal(prev => ({...prev, category: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={handleAddGoal} className="w-full">
                    Criar Meta
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total das Metas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalTargetAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Poupado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-gain">{formatCurrency(totalCurrentAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Metas Concluídas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{completedGoals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">No Cronograma</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-gain">{onTrackGoals}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {goals.map((goal) => {
              const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const monthsToGoal = calculateMonthsToGoal(goal);
              const onTrack = isGoalOnTrack(goal);
              
              return (
                <Card key={goal.id} className="transition-all hover:shadow-card">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-2">
                      <CardTitle className="text-lg font-semibold">{goal.name}</CardTitle>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge variant={getPriorityColor(goal.priority) as any}>
                        {getPriorityLabel(goal.priority)}
                      </Badge>
                      {percentage >= 100 && (
                        <Badge variant="default" className="bg-financial-gain">
                          Concluída
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Atual</p>
                        <p className="text-xl font-bold">{formatCurrency(goal.currentAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Meta</p>
                        <p className="text-xl font-bold">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Prazo</p>
                          <p className="font-medium">{formatDate(goal.deadline)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Mensal</p>
                          <p className="font-medium">{formatCurrency(goal.monthlyContribution)}</p>
                        </div>
                      </div>
                    </div>

                    {percentage < 100 && (
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {monthsToGoal === Infinity ? 'Defina contribuição mensal' : `${monthsToGoal} meses restantes`}
                          </span>
                          <span className={`font-medium ${onTrack ? 'text-financial-gain' : 'text-warning'}`}>
                            {onTrack ? 'No cronograma' : 'Atraso previsto'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <Input placeholder="R$ 100,00" className="text-sm" />
                          <Button 
                            size="sm" 
                            onClick={() => handleContribute(goal.id, 100)}
                          >
                            Contribuir
                          </Button>
                        </div>
                      </div>
                    )}
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