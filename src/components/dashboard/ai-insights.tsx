import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, InsightResponse } from '@/lib/api';

type InsightTone = 'warning' | 'success' | 'suggestion';

const resolveTone = (insight: InsightResponse): InsightTone => {
  const text = `${insight.summary ?? ''} ${insight.impact ?? ''}`.toLowerCase();
  if (text.includes('risco') || text.includes('alerta') || text.includes('queda')) {
    return 'warning';
  }
  if (text.includes('atingiu') || text.includes('conclu') || text.includes('meta')) {
    return 'success';
  }
  return 'suggestion';
};

const toneIcon: Record<InsightTone, JSX.Element> = {
  warning: <AlertTriangle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
  suggestion: <TrendingUp className="h-4 w-4" />,
};

const toneBadgeVariant: Record<InsightTone, 'destructive' | 'default' | 'secondary'> = {
  warning: 'destructive',
  success: 'default',
  suggestion: 'secondary',
};

export function AIInsights() {
  const insightsQuery = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: api.ai.insights,
    staleTime: 60_000,
  });

  const insights = useMemo(
    () => (insightsQuery.data?.data ?? []).map((insight) => ({ ...insight, tone: resolveTone(insight) })),
    [insightsQuery.data],
  );

  const renderContent = () => {
    if (insightsQuery.isLoading) {
      return (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando insights atualizados...
        </div>
      );
    }

    if (insightsQuery.isError) {
      return (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>Não foi possível carregar os insights agora.</p>
          <Button variant="outline" size="sm" onClick={() => insightsQuery.refetch()}>
            <RefreshCw className="mr-2 h-3 w-3" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    if (!insights.length) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum insight gerado até o momento. Mantenha o monitoramento inteligente ativo para receber alertas e
          recomendações assim que disponíveis.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={toneBadgeVariant[insight.tone]}
                    className="h-6 w-6 rounded-full p-0 flex items-center justify-center"
                  >
                    {toneIcon[insight.tone]}
                  </Badge>
                  <h4 className="text-sm font-medium">{insight.title}</h4>
                </div>
                {insight.asset_symbol && (
                  <Badge variant="outline" className="text-xs uppercase">
                    {insight.asset_symbol}
                  </Badge>
                )}
              </div>
              <p className="pl-8 text-sm text-muted-foreground">{insight.summary}</p>
              {insight.impact && (
                <p className="pl-8 text-xs font-medium text-primary">{insight.impact}</p>
              )}
              <div className="pl-8 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(insight.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
          <Brain className="h-5 w-5 text-primary" />
          <span>Insights da IA</span>
        </CardTitle>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          Educacional
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderContent()}
        <div className="border-t pt-4">
          <Button asChild className="w-full">
            <Link to="/assistente" className="flex items-center justify-center">
              <Brain className="mr-2 h-4 w-4" />
              Conversar com assistente IA
            </Link>
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Conteúdo educacional. Não constitui recomendação de investimento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
