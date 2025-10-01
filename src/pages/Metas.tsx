import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { api, Goal } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function Metas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: api.getGoals,
  });

  const createGoalMutation = useMutation({
    mutationFn: api.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const contributeMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => api.contributeGoal(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

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
    const deadline = new Date(goal.deadline);
    const monthsRemaining = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const monthsNeeded = calculateMonthsToGoal(goal);
    return monthsNeeded <= monthsRemaining;
  };

  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createGoalMutation.mutateAsync({
        name: newGoal.name,
        description: newGoal.description,
        targetAmount: parseFormattedCurrency(newGoal.targetAmount),
        deadline: newGoal.deadline,
        priority: newGoal.priority,
        category: newGoal.category || 'Outros',
        monthlyContribution: parseFormattedCurrency(newGoal.monthlyContribution) || 0,
      });

      toast({
        title: "Meta Criada",
        description: `Meta "${newGoal.name}" foi criada com sucesso.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a meta.';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setNewGoal({
      name: "",
      description: "",
      targetAmount: "",
      deadline: "",
      priority: "medium",
      category: "",
      monthlyContribution: "",
    });
  };

  const handleContribute = async (goalId: string, amount: number) => {
    try {
      await contributeMutation.mutateAsync({ id: goalId, amount });
      toast({
        title: "Contribuição Adicionada",
        description: `${formatCurrency(amount)} foram adicionados à meta.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar a contribuição.';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
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
              <h1 className="text-3xl font-bold text-foreground">Metas</h1>
              <p className="text-muted-foreground">Planeje e acompanhe seus objetivos financeiros</p>
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
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newGoal.name}
                      onChange={(e) => setNewGoal(prev => ({...prev, name: e.target.value}))}
                      placeholder="Ex: Reserva de Emergência"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newGoal.description}
                      onChange={(e) => setNewGoal(prev => ({...prev, description: e.target.value}))}
                      placeholder="Descreva sua meta"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="targetAmount">Valor Alvo</Label>
                      <Input
                        id="targetAmount"
                        value={newGoal.targetAmount}
                        onChange={(e) => setNewGoal(prev => ({...prev, targetAmount: e.target.value}))}
                        placeholder="10.000,00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deadline">Prazo</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={newGoal.deadline}
                        onChange={(e) => setNewGoal(prev => ({...prev, deadline: e.target.value}))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Prioridade</Label>
                      <Select value={newGoal.priority} onValueChange={(value: "low" | "medium" | "high") => setNewGoal(prev => ({...prev, priority: value}))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="low">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select value={newGoal.category} onValueChange={(value) => setNewGoal(prev => ({...prev, category: value}))}>
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
                  </div>
                  <div>
                    <Label htmlFor="monthlyContribution">Contribuição Mensal</Label>
                    <Input
                      id="monthlyContribution"
                      value={newGoal.monthlyContribution}
                      onChange={(e) => setNewGoal(prev => ({...prev, monthlyContribution: e.target.value}))}
                      placeholder="500,00"
                    />
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Valor Alvo Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalTargetAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Valor Já Economizado</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">No Caminho Certo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-secondary">{onTrackGoals}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-64 w-full" />
              ))
            ) : goals.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="py-10 text-center text-muted-foreground">
                  Nenhuma meta cadastrada ainda.
                </CardContent>
              </Card>
            ) : (
              goals.map((goal) => {
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const monthsToGoal = calculateMonthsToGoal(goal);
                const onTrack = isGoalOnTrack(goal);

                return (
                  <Card key={goal.id} className="border">
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-semibold flex items-center space-x-2">
                            <Target className="h-5 w-5 text-primary" />
                            <span>{goal.name}</span>
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">Meta: {formatCurrency(goal.targetAmount)}</p>
                        </div>
                        <Badge variant={getPriorityColor(goal.priority)}>
                          Prioridade {getPriorityLabel(goal.priority)}
                        </Badge>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formatCurrency(goal.currentAmount)} economizados</span>
                          <span>Restam {formatCurrency(goal.targetAmount - goal.currentAmount)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Prazo</p>
                          <p className="font-semibold">{formatDate(goal.deadline)}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Contribuição Mensal</p>
                          <p className="font-semibold text-primary">{formatCurrency(goal.monthlyContribution)}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">Tempo estimado</p>
                        <p className="font-semibold">{Number.isFinite(monthsToGoal) ? `${monthsToGoal} meses` : 'Defina uma contribuição mensal'}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          <span>Status:</span>
                          <Badge variant={onTrack ? 'secondary' : 'outline'}>
                            {onTrack ? 'No ritmo certo' : 'Requer atenção'}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContribute(goal.id, goal.monthlyContribution || 0)}
                          disabled={goal.monthlyContribution <= 0 || contributeMutation.isPending}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Contribuir {formatCurrency(goal.monthlyContribution || 0)}
                        </Button>
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
