import { Brain, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'suggestion';
  title: string;
  description: string;
  action?: string;
}

export function AIInsights() {
  // Mock data
  const insights: Insight[] = [
    {
      id: "1",
      type: "warning",
      title: "Categoria Alimentação acima do orçamento",
      description: "Você gastou R$ 1.245,80 este mês, 18% acima da meta de R$ 1.000,00.",
      action: "Revisar gastos"
    },
    {
      id: "2",
      type: "success",
      title: "Meta de reserva de emergência em progresso",
      description: "Você está a 75% da sua meta! Continue poupando R$ 500/mês para atingir em 3 meses.",
    },
    {
      id: "3",
      type: "suggestion",
      title: "Rebalanceamento recomendado",
      description: "Sua carteira tem 45% em renda variável. Considere diversificar com FIIs.",
      action: "Ver sugestão"
    }
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
        <CardTitle className="text-lg font-semibold flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary" />
          <span>Insights da IA</span>
        </CardTitle>
        <Badge variant="outline" className="bg-gradient-accent border-0 text-accent-foreground">
          Educacional
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-lg border p-4 space-y-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between space-x-3">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={getBadgeVariant(insight.type)}
                    className="h-6 w-6 rounded-full p-0 flex items-center justify-center"
                  >
                    {getIcon(insight.type)}
                  </Badge>
                  <h4 className="text-sm font-medium">{insight.title}</h4>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                {insight.description}
              </p>
              {insight.action && (
                <div className="pl-8">
                  <Button variant="outline" size="sm">
                    {insight.action}
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <Button variant="default" className="w-full bg-gradient-primary border-0">
              <Brain className="mr-2 h-4 w-4" />
              Conversar com Assistente IA
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Conteúdo educacional • Não constitui recomendação de investimento
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}