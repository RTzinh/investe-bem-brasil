import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, PieChart, BarChart3 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, formatPercentage, parseFormattedCurrency } from "@/lib/formatters";
import { api, Investment } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const assetTypes = [
  { value: "ACAO", label: "Ação" },
  { value: "ETF", label: "ETF" },
  { value: "FII", label: "FII" },
  { value: "RF", label: "Renda Fixa" },
  { value: "CRIPTO", label: "Criptomoeda" },
];

const popularAssets = [
  "BOVA11", "IVVB11", "SMAL11", "PETR4", "VALE3", "ITUB4",
  "MXRF11", "HGLG11", "XPML11", "TESOURO_SELIC", "CDB_CDI"
];

export default function Investimentos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: api.getInvestments,
  });

  const registerTradeMutation = useMutation({
    mutationFn: api.registerTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });

  const [newTrade, setNewTrade] = useState({
    symbol: "",
    type: "buy" as "buy" | "sell",
    quantity: "",
    price: "",
    fees: "",
    assetType: "ACAO" as Investment["assetType"],
  });

  const investments = data?.investments ?? [];
  const totals = data?.totals ?? { totalValue: 0, dividends: 0, performance: 0 };
  const allocation = data?.allocation ?? { total: 0, breakdown: [] };

  const totalPortfolioValue = totals.totalValue;
  const totalDividends = totals.dividends;
  const portfolioPerformance = totals.performance;

  const handleAddTrade = async () => {
    if (!newTrade.symbol || !newTrade.quantity || !newTrade.price) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(newTrade.quantity, 10);
    const price = parseFormattedCurrency(newTrade.price);
    const fees = parseFormattedCurrency(newTrade.fees) || 0;

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      toast({
        title: "Erro",
        description: "Informe valores válidos.",
        variant: "destructive",
      });
      return;
    }

    try {
      await registerTradeMutation.mutateAsync({
        symbol: newTrade.symbol,
        type: newTrade.type,
        quantity,
        price,
        fees,
        assetType: newTrade.assetType,
      });

      toast({
        title: "Operação Registrada",
        description: `${newTrade.type === 'buy' ? 'Compra' : 'Venda'} de ${quantity} ${newTrade.symbol} registrada.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar a operação.';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setNewTrade({
      symbol: "",
      type: "buy",
      quantity: "",
      price: "",
      fees: "",
      assetType: "ACAO",
    });
  };

  const holdingsByType = allocation.breakdown.map((item) => ({
    ...item,
    label: assetTypes.find(type => type.value === item.assetType)?.label ?? item.assetType,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Investimentos</h1>
              <p className="text-muted-foreground">Sua carteira de investimentos</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Operação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Operação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="symbol">Ativo</Label>
                    <Select value={newTrade.symbol} onValueChange={(value) => setNewTrade(prev => ({...prev, symbol: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ativo" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularAssets.map(asset => (
                          <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={newTrade.type} onValueChange={(value: "buy" | "sell") => setNewTrade(prev => ({...prev, type: value}))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Compra</SelectItem>
                          <SelectItem value="sell">Venda</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="assetType">Classe</Label>
                      <Select value={newTrade.assetType} onValueChange={(value: Investment["assetType"]) => setNewTrade(prev => ({...prev, assetType: value}))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantidade</Label>
                      <Input
                        id="quantity"
                        value={newTrade.quantity}
                        onChange={(e) => setNewTrade(prev => ({...prev, quantity: e.target.value}))}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Preço (R$)</Label>
                      <Input
                        id="price"
                        value={newTrade.price}
                        onChange={(e) => setNewTrade(prev => ({...prev, price: e.target.value}))}
                        placeholder="98,50"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="fees">Taxas (R$)</Label>
                    <Input
                      id="fees"
                      value={newTrade.fees}
                      onChange={(e) => setNewTrade(prev => ({...prev, fees: e.target.value}))}
                      placeholder="5,00"
                    />
                  </div>
                  <Button onClick={handleAddTrade} className="w-full" disabled={registerTradeMutation.isPending}>
                    Registrar Operação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-4">
                <Card className="bg-gradient-primary text-white border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/80">Patrimônio Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</p>
                    <p className="text-xs text-white/70">Valor atual da carteira</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Rentabilidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${portfolioPerformance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                      {portfolioPerformance >= 0 ? '+' : ''}{formatPercentage(portfolioPerformance)}
                    </p>
                    <p className="text-xs text-muted-foreground">Performance média</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Dividendos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-financial-gain">{formatCurrency(totalDividends)}</p>
                    <p className="text-xs text-muted-foreground">Recebidos no período</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{investments.length}</p>
                    <p className="text-xs text-muted-foreground">Na carteira</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChart className="h-5 w-5" />
                      <span>Alocação de Ativos</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {holdingsByType.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum dado de alocação disponível.</p>
                    ) : (
                      holdingsByType.map((item) => (
                        <div key={item.assetType} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{item.label}</span>
                            <span>{item.percentage.toFixed(1)}%</span>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Carteira Detalhada</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ativo</TableHead>
                          <TableHead>Classe</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Preço Médio</TableHead>
                          <TableHead>Preço Atual</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Rentabilidade</TableHead>
                          <TableHead>Atualização</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investments.map((investment) => (
                          <TableRow key={investment.id}>
                            <TableCell className="font-medium">{investment.symbol}</TableCell>
                            <TableCell>{investment.assetType}</TableCell>
                            <TableCell>{investment.quantity}</TableCell>
                            <TableCell>{formatCurrency(investment.avgPrice)}</TableCell>
                            <TableCell>{formatCurrency(investment.currentPrice)}</TableCell>
                            <TableCell>{formatCurrency(investment.totalValue)}</TableCell>
                            <TableCell>
                              <span className={investment.performance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}>
                                {investment.performance >= 0 ? '+' : ''}{formatPercentage(investment.performance)}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(investment.lastUpdate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
