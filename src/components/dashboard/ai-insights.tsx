import { Link } from 'react-router-dom';
import { Brain, AlertTriangle, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'suggestion';
  title: string;
  description: string;
  action?: { label: string; to: string };
}

export function AIInsights() {
  const insights: Insight[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Categoria Alimentacao acima do orcamento',
      description: 'Gastos registrados de R$ 1.245,80 no mes, 18% acima da meta definida de R$ 1.000,00.',
      action: { label: 'Revisar orcamentos', to: '/orcamentos' },
    },
    {
      id: '2',
      type: 'success',
      title: 'Meta de reserva de emergencia em progresso',
      description: 'Voce atingiu 75% da meta. Mantendo aportes de R$ 500 por mes a meta sera atingida em aproximadamente 3 meses.',
    },
    {
      id: '3',
      type: 'suggestion',
      title: 'Rebalanceamento recomendado',
      description: 'A carteira atual tem 45% em renda variavel. Avalie migrar parte para FIIs e renda fixa para reduzir volatilidade.',
      action: { label: 'Ver sugestao detalhada', to: '/assistente' },
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'suggestion':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'warning':
        return 'destructive';
      case 'success':
        return 'default';
      case 'suggestion':
        return 'secondary';
      default:
        return 'outline';
    }
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
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-lg border p-4 space-y-3 transition-colors hover:bg-muted/50">
              <div className="flex items-center space-x-2">
                <Badge variant={getBadgeVariant(insight.type)} className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                  {getIcon(insight.type)}
                </Badge>
                <h4 className="text-sm font-medium">{insight.title}</h4>
              </div>
              <p className="pl-8 text-sm text-muted-foreground">{insight.description}</p>
              {insight.action && (
                <div className="pl-8">
                  <Button asChild variant="outline" size="sm">
                    <Link to={insight.action.to} className="flex items-center">
                      {insight.action.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ))}

          <div className="border-t pt-4">
            <Button asChild className="w-full">
              <Link to="/assistente" className="flex items-center justify-center">
                <Brain className="mr-2 h-4 w-4" />
                Conversar com assistente IA
              </Link>
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Conteudo educacional. Nao constitui recomendacao de investimento.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
