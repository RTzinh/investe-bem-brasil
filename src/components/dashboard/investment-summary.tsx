import { TrendingUp, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

interface Investment {
  asset: string;
  type: string;
  value: number;
  allocation: number;
  performance: number;
}

export function InvestmentSummary() {
  // Mock data
  const investments: Investment[] = [
    { asset: "BOVA11", type: "ETF", value: 15420.50, allocation: 33.8, performance: 12.4 },
    { asset: "Tesouro Selic", type: "Renda Fixa", value: 12000.00, allocation: 26.3, performance: 5.2 },
    { asset: "IVVB11", type: "ETF", value: 8750.30, allocation: 19.2, performance: 18.7 },
    { asset: "MXRF11", type: "FII", value: 6800.00, allocation: 14.9, performance: 8.9 },
    { asset: "CDB Banco XYZ", type: "Renda Fixa", value: 2700.00, allocation: 5.9, performance: 6.1 },
  ];

  const totalValue = investments.reduce((acc, inv) => acc + inv.value, 0);
  const totalPerformance = investments.reduce((acc, inv) => acc + (inv.performance * inv.allocation / 100), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Carteira de Investimentos</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-muted-foreground">
                Patrimônio Investido
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-financial-gain">
                +{formatPercentage(totalPerformance)}
              </p>
              <p className="text-xs text-muted-foreground">Rentabilidade</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Alocação por Ativo</p>
            {investments.map((investment) => (
              <div key={investment.asset} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{investment.asset}</span>
                    <span className="text-muted-foreground">({investment.type})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{formatCurrency(investment.value)}</span>
                    <span className={`text-xs ${
                      investment.performance > 0 ? 'text-financial-gain' : 'text-financial-loss'
                    }`}>
                      {investment.performance > 0 ? '+' : ''}{formatPercentage(investment.performance)}
                    </span>
                  </div>
                </div>
                <Progress 
                  value={investment.allocation} 
                  className="h-2"
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Alocação Recomendada</span>
              <span className="text-primary font-medium cursor-pointer hover:underline">
                Ver Sugestão IA →
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}