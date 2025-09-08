import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface Investment {
  id: string;
  symbol: string;
  name: string;
  type: 'ACAO' | 'ETF' | 'FII' | 'RF' | 'CRIPTO';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  performance: number;
  dividends: number;
  lastUpdate: Date;
}

interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  date: Date;
}

export default function Investimentos() {
  const { toast } = useToast();
  
  const [investments, setInvestments] = useState<Investment[]>([
    {
      id: "1",
      symbol: "BOVA11",
      name: "iShares Ibovespa ETF",
      type: "ETF",
      quantity: 100,
      avgPrice: 98.50,
      currentPrice: 108.20,
      totalValue: 10820.00,
      performance: 9.8,
      dividends: 145.30,
      lastUpdate: new Date(),
    },
    {
      id: "2",
      symbol: "PETR4",
      name: "Petrobras PN",
      type: "ACAO",
      quantity: 200,
      avgPrice: 28.45,
      currentPrice: 32.10,
      totalValue: 6420.00,
      performance: 12.8,
      dividends: 280.50,
      lastUpdate: new Date(),
    },
    {
      id: "3",
      symbol: "MXRF11",
      name: "Maxi Renda FII",
      type: "FII",
      quantity: 300,
      avgPrice: 9.80,
      currentPrice: 10.45,
      totalValue: 3135.00,
      performance: 6.6,
      dividends: 189.70,
      lastUpdate: new Date(),
    },
    {
      id: "4",
      symbol: "TESOURO_SELIC",
      name: "Tesouro Selic 2029",
      type: "RF",
      quantity: 1,
      avgPrice: 12000.00,
      currentPrice: 12624.00,
      totalValue: 12624.00,
      performance: 5.2,
      dividends: 0,
      lastUpdate: new Date(),
    },
  ]);

  const [newTrade, setNewTrade] = useState({
    symbol: "",
    type: "buy" as "buy" | "sell",
    quantity: "",
    price: "",
    fees: "",
  });

  const [targetAllocation] = useState({
    rf: 30, // Renda Fixa
    acoes: 40, // Ações/ETFs
    fiis: 20, // FIIs
    cripto: 10, // Cripto
  });

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

  const totalPortfolioValue = investments.reduce((acc, inv) => acc + inv.totalValue, 0);
  const totalDividends = investments.reduce((acc, inv) => acc + inv.dividends, 0);
  const portfolioPerformance = investments.reduce((acc, inv) => acc + (inv.performance * inv.totalValue / totalPortfolioValue), 0);

  const getCurrentAllocation = () => {
    const rf = investments.filter(i => i.type === 'RF').reduce((acc, i) => acc + i.totalValue, 0);
    const acoes = investments.filter(i => ['ACAO', 'ETF'].includes(i.type)).reduce((acc, i) => acc + i.totalValue, 0);
    const fiis = investments.filter(i => i.type === 'FII').reduce((acc, i) => acc + i.totalValue, 0);
    const cripto = investments.filter(i => i.type === 'CRIPTO').reduce((acc, i) => acc + i.totalValue, 0);

    return {
      rf: (rf / totalPortfolioValue) * 100,
      acoes: (acoes / totalPortfolioValue) * 100,
      fiis: (fiis / totalPortfolioValue) * 100,
      cripto: (cripto / totalPortfolioValue) * 100,
    };
  };

  const currentAllocation = getCurrentAllocation();

  const handleAddTrade = () => {
    if (!newTrade.symbol || !newTrade.quantity || !newTrade.price) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(newTrade.quantity);
    const price = parseFormattedCurrency(newTrade.price);
    const fees = parseFormattedCurrency(newTrade.fees) || 0;

    // Simular atualização da carteira
    const existingIndex = investments.findIndex(inv => inv.symbol === newTrade.symbol);
    
    if (existingIndex >= 0) {
      setInvestments(prev => prev.map((inv, index) => {
        if (index === existingIndex) {
          const newQuantity = newTrade.type === 'buy' 
            ? inv.quantity + quantity 
            : inv.quantity - quantity;
          
          const newAvgPrice = newTrade.type === 'buy'
            ? ((inv.avgPrice * inv.quantity) + (price * quantity)) / newQuantity
            : inv.avgPrice;

          return {
            ...inv,
            quantity: newQuantity,
            avgPrice: newAvgPrice,
            totalValue: newQuantity * inv.currentPrice,
            lastUpdate: new Date(),
          };
        }
        return inv;
      }));
    } else if (newTrade.type === 'buy') {
      // Adicionar novo ativo
      const newInvestment: Investment = {
        id: Date.now().toString(),
        symbol: newTrade.symbol,
        name: newTrade.symbol,
        type: "ACAO", // Default, seria obtido de API
        quantity,
        avgPrice: price,
        currentPrice: price,
        totalValue: quantity * price,
        performance: 0,
        dividends: 0,
        lastUpdate: new Date(),
      };
      setInvestments(prev => [newInvestment, ...prev]);
    }

    setNewTrade({
      symbol: "",
      type: "buy",
      quantity: "",
      price: "",
      fees: "",
    });

    toast({
      title: "Operação Registrada",
      description: `${newTrade.type === 'buy' ? 'Compra' : 'Venda'} de ${quantity} ${newTrade.symbol} registrada.`,
    });
  };

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
                      <Label htmlFor="quantity">Quantidade</Label>
                      <Input
                        id="quantity"
                        value={newTrade.quantity}
                        onChange={(e) => setNewTrade(prev => ({...prev, quantity: e.target.value}))}
                        placeholder="100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Preço (R$)</Label>
                      <Input
                        id="price"
                        value={newTrade.price}
                        onChange={(e) => setNewTrade(prev => ({...prev, price: e.target.value}))}
                        placeholder="98,50"
                      />
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
                  </div>
                  <Button onClick={handleAddTrade} className="w-full">
                    Registrar Operação
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Portfolio Summary */}
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
                <p className="text-2xl font-bold text-financial-gain">+{formatPercentage(portfolioPerformance)}</p>
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
            {/* Asset Allocation */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Alocação de Ativos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Renda Fixa</span>
                      <span>{currentAllocation.rf.toFixed(1)}% / {targetAllocation.rf}%</span>
                    </div>
                    <Progress value={currentAllocation.rf} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Ações/ETFs</span>
                      <span>{currentAllocation.acoes.toFixed(1)}% / {targetAllocation.acoes}%</span>
                    </div>
                    <Progress value={currentAllocation.acoes} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>FIIs</span>
                      <span>{currentAllocation.fiis.toFixed(1)}% / {targetAllocation.fiis}%</span>
                    </div>
                    <Progress value={currentAllocation.fiis} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Cripto</span>
                      <span>{currentAllocation.cripto.toFixed(1)}% / {targetAllocation.cripto}%</span>
                    </div>
                    <Progress value={currentAllocation.cripto} className="h-2" />
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Sugestão de Rebalanceamento
                </Button>
              </CardContent>
            </Card>

            {/* Portfolio Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Posições da Carteira</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>P.M.</TableHead>
                      <TableHead>Atual</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-semibold">{investment.symbol}</p>
                            <p className="text-xs text-muted-foreground">{investment.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{investment.type}</Badge>
                        </TableCell>
                        <TableCell>{investment.quantity}</TableCell>
                        <TableCell>{formatCurrency(investment.avgPrice)}</TableCell>
                        <TableCell>{formatCurrency(investment.currentPrice)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(investment.totalValue)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {investment.performance > 0 ? (
                              <TrendingUp className="h-4 w-4 text-financial-gain" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-financial-loss" />
                            )}
                            <span className={investment.performance > 0 ? 'text-financial-gain' : 'text-financial-loss'}>
                              {investment.performance > 0 ? '+' : ''}{formatPercentage(investment.performance)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Disclaimer */}
          <Card className="border-warning bg-warning/5">
            <CardContent className="p-4">
              <p className="text-sm text-center text-muted-foreground">
                ⚠️ <strong>Aviso Legal:</strong> As informações apresentadas são para fins educacionais e não constituem recomendação de investimento. 
                Consulte sempre um profissional qualificado. Rentabilidade passada não garante resultado futuro.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}