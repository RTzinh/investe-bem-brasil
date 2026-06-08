import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, Calendar, DollarSign, TrendingUp, Trash2, CheckCircle2, RefreshCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, parseFormattedCurrency } from '@/lib/formatters';
import { api, GoalPayload, GoalResponse } from '@/lib/api';

const GOAL_CATEGORIES = [
  'Emergency',
  'Leisure',
  'Equipment',
  'Real Estate',
  'Education',
  'Health',
  'Investments',
  'Other',
];

const PRIORITY_OPTIONS = [
  { value: 'alta', label: 'High', badge: 'destructive' as const },
  { value: 'media', label: 'Medium', badge: 'default' as const },
  { value: 'baixa', label: 'Low', badge: 'secondary' as const },
];

const INITIAL_GOAL_FORM = {
  name: '',
  category: '',
  targetAmount: '',
  currentAmount: '',
  monthlyContribution: '',
  deadline: '',
  priority: 'media' as GoalPayload['priority'],
  notes: '',
};

const goalToPayload = (goal: GoalResponse, overrides?: Partial<GoalPayload>): GoalPayload => ({
  name: goal.name,
  category: goal.category,
  target_amount: goal.target_amount,
  current_amount: goal.current_amount,
  monthly_contribution: goal.monthly_contribution,
  deadline: goal.deadline,
  priority: goal.priority,
  notes: goal.notes ?? '',
  ...overrides,
});

export default function Goals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goalForm, setGoalForm] = useState(INITIAL_GOAL_FORM);
  const [contributionGoal, setContributionGoal] = useState<GoalResponse | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const goalsQuery = useQuery({
    queryKey: ['goals'],
    queryFn: api.goals.list,
  });

  const summaryQuery = useQuery({
    queryKey: ['goals', 'summary'],
    queryFn: api.goals.summary,
  });

  const goals = goalsQuery.data?.data ?? [];
  const summary = summaryQuery.data ?? {
    totalTarget: 0,
    totalCurrent: 0,
    completed: 0,
    onTrack: 0,
    goals: 0,
  };

  const isLoading = goalsQuery.isLoading || summaryQuery.isLoading;
  const hasError = goalsQuery.isError || summaryQuery.isError;

  const createGoal = useMutation({
    mutationFn: (payload: GoalPayload) => api.goals.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'summary'] });
      setGoalForm(INITIAL_GOAL_FORM);
      toast({ title: 'Goal created', description: 'Tracking started successfully.' });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Failed to create goal',
        description: 'Check the data provided and try again.',
        variant: 'destructive',
      });
    },
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GoalPayload }) => api.goals.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'summary'] });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Unable to update the goal',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    },
  });

  const removeGoal = useMutation({
    mutationFn: (id: string) => api.goals.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'summary'] });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Failed to delete goal',
        description: 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const contributeGoal = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => api.goals.contribute(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'summary'] });
      setContributionGoal(null);
      setContributionAmount('');
      toast({ title: 'Contribution recorded', description: 'Amount added successfully.' });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Failed to record contribution',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateGoal = () => {
    const targetAmount = parseFormattedCurrency(goalForm.targetAmount);
    const currentAmount = parseFormattedCurrency(goalForm.currentAmount);
    const monthlyContribution = parseFormattedCurrency(goalForm.monthlyContribution);

    if (!goalForm.name || !goalForm.category || !goalForm.deadline || targetAmount <= 0) {
      toast({
        title: 'Required fields',
        description: 'Provide a name, category, target amount and deadline.',
        variant: 'destructive',
      });
      return;
    }

    const payload: GoalPayload = {
      name: goalForm.name,
      category: goalForm.category,
      target_amount: targetAmount,
      current_amount: currentAmount,
      monthly_contribution: monthlyContribution,
      deadline: goalForm.deadline,
      priority: goalForm.priority,
      notes: goalForm.notes,
    };

    createGoal.mutate(payload);
  };

  const handleContribute = () => {
    if (!contributionGoal) return;
    const amount = parseFormattedCurrency(contributionAmount);
    if (amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Enter an amount greater than zero.',
        variant: 'destructive',
      });
      return;
    }
    contributeGoal.mutate({ id: contributionGoal.id, amount });
  };

  const handleMarkAsCompleted = (goal: GoalResponse) => {
    if (goal.status === 'completed') {
      toast({ title: 'Goal already completed' });
      return;
    }
    const payload = goalToPayload(goal, {
      current_amount: goal.target_amount,
      monthly_contribution: goal.monthly_contribution,
    });
    updateGoal.mutate({ id: goal.id, payload });
    toast({ title: 'Goal completed', description: 'Accumulated amount updated to the target.' });
  };

  const handleResetProgress = (goal: GoalResponse) => {
    const payload = goalToPayload(goal, { current_amount: 0 });
    updateGoal.mutate({ id: goal.id, payload });
    toast({ title: 'Progress reset', description: 'Useful for reviewing your plan.' });
  };

  const handleRemoveGoal = (goal: GoalResponse) => {
    removeGoal.mutate(goal.id);
    toast({ title: 'Goal removed', description: `${goal.name} will no longer appear in the list.` });
  };

  const stats = useMemo(() => {
    if (!goals.length) {
      return {
        averageProgress: 0,
        delayedGoals: 0,
        highestPriority: undefined as GoalResponse | undefined,
      };
    }
    const averageProgress = goals.reduce((acc, goal) => acc + goal.progress, 0) / goals.length;
    const delayedGoals = goals.filter((goal) => goal.status === 'delayed').length;
    const highestPriority = goals.find((goal) => goal.priority === 'alta');
    return { averageProgress, delayedGoals, highestPriority };
  }, [goals]);

  const prioritiesByValue = useMemo(() => {
    const map = new Map(PRIORITY_OPTIONS.map((priority) => [priority.value, priority]));
    return map;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-8 animate-fade-in">
          <Card className="border-none bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Sparkles className="mr-1 h-3 w-3" /> Average progress {(stats.averageProgress * 100).toFixed(1)}%
                </div>
                <h1 className="text-2xl font-semibold text-foreground">Plan and track your goals</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Create goals, log contributions and see how small monthly deposits bring you closer to your target. Use the assistant to generate personalized strategies.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link to="/assistant" className="flex items-center">
                    Ask the assistant for suggestions
                    <TrendingUp className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" /> New goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Record goal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="goal-name">Name</Label>
                        <Input
                          id="goal-name"
                          placeholder="e.g. Emergency fund"
                          value={goalForm.name}
                          onChange={(event) => setGoalForm((prev) => ({ ...prev, name: event.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Category</Label>
                        <Select value={goalForm.category} onValueChange={(value) => setGoalForm((prev) => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {GOAL_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <Label htmlFor="target-amount">Target amount (R$)</Label>
                          <Input
                            id="target-amount"
                            placeholder="50.000,00"
                            value={goalForm.targetAmount}
                            onChange={(event) => setGoalForm((prev) => ({ ...prev, targetAmount: event.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="current-amount">Already saved (R$)</Label>
                          <Input
                            id="current-amount"
                            placeholder="5.000,00"
                            value={goalForm.currentAmount}
                            onChange={(event) => setGoalForm((prev) => ({ ...prev, currentAmount: event.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <Label htmlFor="monthly">Monthly contribution (R$)</Label>
                          <Input
                            id="monthly"
                            placeholder="1.000,00"
                            value={goalForm.monthlyContribution}
                            onChange={(event) => setGoalForm((prev) => ({ ...prev, monthlyContribution: event.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="deadline">Deadline</Label>
                          <Input
                            id="deadline"
                            type="date"
                            value={goalForm.deadline}
                            onChange={(event) => setGoalForm((prev) => ({ ...prev, deadline: event.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Priority</Label>
                        <Select value={goalForm.priority} onValueChange={(value: GoalPayload['priority']) => setGoalForm((prev) => ({ ...prev, priority: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((priority) => (
                              <SelectItem key={priority.value} value={priority.value}>
                                {priority.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          placeholder="Additional details about this goal"
                          rows={2}
                          value={goalForm.notes}
                          onChange={(event) => setGoalForm((prev) => ({ ...prev, notes: event.target.value }))}
                        />
                      </div>
                      <Button onClick={handleCreateGoal} disabled={createGoal.isPending} className="w-full">
                        {createGoal.isPending ? 'Recording...' : 'Create goal'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {hasError && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="flex items-center justify-between p-4 text-sm text-destructive">
                <span>Something went wrong while loading goals. Make sure the backend is running.</span>
                <Button variant="outline" size="sm" onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['goals'] });
                  queryClient.invalidateQueries({ queryKey: ['goals', 'summary'] });
                }}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total planned</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold">{formatCurrency(summary.totalTarget)}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total saved</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-2xl font-bold text-financial-gain">{formatCurrency(summary.totalCurrent)}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Goals completed</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-primary">{summary.completed}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">On track</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-financial-gain">{summary.onTrack}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Goals behind schedule</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-warning">{stats.delayedGoals}</p>}
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {goals.map((goal) => {
                const priorityInfo = prioritiesByValue.get(goal.priority) ?? PRIORITY_OPTIONS[1];
                const progressPercent = Math.min(goal.progress * 100, 100);

                return (
                  <Card key={goal.id} className="transition-all hover:shadow-card">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold">{goal.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{goal.category}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge variant={priorityInfo.badge}>{priorityInfo.label}</Badge>
                        {goal.status === 'completed' && (
                          <Badge variant="default" className="bg-financial-gain">Completed</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Saved</p>
                          <p className="text-xl font-bold">{formatCurrency(goal.current_amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Target</p>
                          <p className="text-xl font-bold">{formatCurrency(goal.target_amount)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Deadline</p>
                            <p className="font-medium">{formatDate(goal.deadline)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Monthly contribution</p>
                            <p className="font-medium">{formatCurrency(goal.monthly_contribution)}</p>
                          </div>
                        </div>
                      </div>

                      {goal.notes && (
                        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                          Notes: {goal.notes}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {goal.status !== 'completed' && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkAsCompleted(goal)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Complete goal
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleResetProgress(goal)}>
                          <RefreshCcw className="mr-2 h-4 w-4" /> Reset progress
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveGoal(goal)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                        <Dialog
                          open={contributionGoal?.id === goal.id}
                          onOpenChange={(open) => {
                            setContributionGoal(open ? goal : null);
                            if (!open) setContributionAmount('');
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="default">
                              <TrendingUp className="mr-2 h-4 w-4" /> Contribute
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add contribution</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid gap-2">
                                <Label htmlFor="contribution">Amount (R$)</Label>
                                <Input
                                  id="contribution"
                                  placeholder="500,00"
                                  value={contributionAmount}
                                  onChange={(event) => setContributionAmount(event.target.value)}
                                />
                              </div>
                              <Button onClick={handleContribute} disabled={contributeGoal.isPending} className="w-full">
                                {contributeGoal.isPending ? 'Recording...' : 'Confirm'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {!goals.length && !hasError && (
                <Card className="md:col-span-2 border-dashed">
                  <CardContent className="flex h-32 flex-col items-center justify-center space-y-2 text-center text-muted-foreground">
                    <Target className="h-6 w-6" />
                    <p>No goals created yet. Use the buttons above to start a goal.</p>
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
