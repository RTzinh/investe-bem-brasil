import { Brain, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, Insight } from "@/lib/api";

export function AIInsights() {
  const { data, isLoading } = useQuery({
    queryKey: ["insights"],
    queryFn: api.getInsights,
  });

  const insights = data ?? [];

  if (isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }

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
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum insight disponível no momento. Continue alimentando sua conta com transações para obter recomendações.
            </p>
          ) : (
            insights.map((insight) => (
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
            ))
          )}

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