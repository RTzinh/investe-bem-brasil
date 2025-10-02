import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart as LineChartIcon, PieChart as PieChartIcon, Plus, PauseCircle, PlayCircle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatPercentage, parseFormattedCurrency } from '@/lib/formatters';
import { api, InvestmentResponse, TradePayload } from '@/lib/api';
import { getInvestmentSocket, disconnectSocket } from '@/lib/socket';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

interface PricePoint {
  time: string;
  price: number;
}

const ASSET_TYPES = [
  { value: 'ACAO', label: 'Acao' },
  { value: 'ETF', label: 'ETF' },
  { value: 'FII', label: 'FII' },
  { value: 'RF', label: 'Renda Fixa' },
  { value: 'CRIPTO', label: 'Cripto' },
];

const COLORS = ['#2563eb', '#fb7185', '#f97316', '#22c55e', '#a855f7', '#0ea5e9'];

const INITIAL_FORM = {
  symbol: '',
  name: '',
  type: 'buy' as TradePayload['type'],
  assetType: 'ACAO',
  quantity: '',
  price: '',
  fees: '',
};

const formatTimeLabel = (value: string) =>
  new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

export default function Investimentos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tradeForm, setTradeForm] = useState(INITIAL_FORM);
  const [liveInvestments, setLiveInvestments] = useState<InvestmentResponse[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, PricePoint[]>>({});
  const [portfolioHistory, setPortfolioHistory] = useState<PricePoint[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(undefined);
  const [isStreaming, setIsStreaming] = useState(true);

  const investmentsQuery = useQuery({
    queryKey: ['investments'],
    queryFn: api.investments.list,
  });

  const summaryQuery = useQuery({
    queryKey: ['investments', 'summary'],
    queryFn: api.investments.summary,
  });

  const investments = investmentsQuery.data?.data ?? [];
  const summary = summaryQuery.data ?? {
    totalValue: 0,
    totalDividends: 0,
    performance: 0,
    allocationByType: {},
  };

  const latestInvestmentsRef = useRef<InvestmentResponse[]>(investments);

  useEffect(() => {
    latestInvestmentsRef.current = investments;
  }, [investments]);

  useEffect(() => {
    if (!selectedSymbol && investments.length) {
      setSelectedSymbol(investments[0].symbol);
    }
  }, [investments, selectedSymbol]);

  useEffect(() => {
    if (!investments.length) return;
    const timestamp = new Date().toISOString();

    setPriceHistory((prev) => {
      const next = { ...prev };
      investments.forEach((investment) => {
        if (!(investment.symbol in next) || next[investment.symbol].length === 0) {
          next[investment.symbol] = [{ time: timestamp, price: investment.current_price }];
        }
      });
      return next;
    });

    setPortfolioHistory((prev) => {
      if (prev.length) return prev;
      const total = investments.reduce((acc, investment) => acc + investment.totalValue, 0);
      return [{ time: timestamp, price: total }];
    });
  }, [investments]);

  useEffect(() => {
    const socket = getInvestmentSocket();

    const handler = (payload: { data: Record<string, unknown>[]; timestamp: string }) => {
      if (!isStreaming) {
        return;
      }

      const baseInvestments = latestInvestmentsRef.current;

      const normalized: InvestmentResponse[] = payload.data.map((item) => {
        const symbol = String(item.symbol);
        const match = baseInvestments.find((investment) => investment.symbol === symbol);

        const quantity = Number(item.quantity ?? match?.quantity ?? 0);
        const avgPrice = Number(item.avg_price ?? match?.avg_price ?? 0);
        const currentPrice = Number(item.current_price ?? match?.current_price ?? 0);
        const totalValue = Number(item.total_value ?? match?.totalValue ?? quantity * currentPrice);

        return {
          id: match?.id ?? symbol,
          symbol,
          name: String(item.name ?? match?.name ?? symbol),
          type: String(item.type ?? match?.type ?? 'ACAO'),
          quantity,
          avg_price: avgPrice,
          current_price: currentPrice,
          dividends: match?.dividends ?? 0,
          target_allocation: match?.target_allocation ?? 0,
          totalValue,
          investedValue: match?.investedValue ?? quantity * (avgPrice || match?.avg_price || currentPrice),
          performance: Number(item.performance ?? match?.performance ?? 0),
        };
      });

      latestInvestmentsRef.current = normalized;
      setLiveInvestments(normalized);

      setPriceHistory((prev) => {
        const next = { ...prev };
        normalized.forEach((investment) => {
          const history = next[investment.symbol] ?? [];
          const updated = [...history, { time: payload.timestamp, price: investment.current_price }];
          next[investment.symbol] = updated.slice(-180);
        });
        return next;
      });

      setPortfolioHistory((prev) => {
        const total = normalized.reduce((acc, investment) => acc + investment.totalValue, 0);
        return [...prev, { time: payload.timestamp, price: total }].slice(-180);
      });
    };

    socket.on('investment:stream', handler);

    return () => {
      socket.off('investment:stream', handler);
    };
  }, [isStreaming]);

  useEffect(() => () => disconnectSocket(), []);

  const displayInvestments = liveInvestments.length && isStreaming ? liveInvestments : investments;

  useEffect(() => {
    if (displayInvestments.length) {
      latestInvestmentsRef.current = displayInvestments;
    }
  }, [displayInvestments]);

  const allocationData = useMemo(() => {
    const entries = Object.entries(summary.allocationByType ?? {});
    return entries.map(([type, value], index) => ({
      name: type,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [summary.allocationByType]);

  const selectedHistory = selectedSymbol ? priceHistory[selectedSymbol] ?? [] : [];

  const tradeMutation = useMutation({
    mutationFn: (payload: TradePayload) => api.investments.trade(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', 'summary'] });
      setTradeForm(INITIAL_FORM);
      toast({ title: 'Operacao registrada', description: 'A posicao foi atualizada com sucesso.' });
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Erro ao registrar operacao',
        description: 'Confira os dados informados e tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleTrade = () => {
    if (!tradeForm.symbol || !tradeForm.name || !tradeForm.price || !tradeForm.quantity) {
      toast({
        title: 'Preencha os campos obrigatorios',
        description: 'Simbolo, nome, preco e quantidade sao necessarios.',
        variant: 'destructive',
      });
      return;
    }

    const quantity = Number(tradeForm.quantity);
    const price = parseFormattedCurrency(tradeForm.price);
    const fees = parseFormattedCurrency(tradeForm.fees);

    if (!Number.isFinite(quantity) || quantity <= 0 || price <= 0) {
      toast({
        title: 'Valores invalidos',
        description: 'Quantidade e preco devem ser maiores que zero.',
        variant: 'destructive',
      });
      return;
    }

    tradeMutation.mutate({
      symbol: tradeForm.symbol.toUpperCase(),
      name: tradeForm.name,
      type: tradeForm.type,
      quantity,
      price,
      fees,
      assetType: tradeForm.assetType,
    });
  };

  const toggleStreaming = () => {
    setIsStreaming((prev) => {
      const next = !prev;
      if (!next) {
        toast({ title: 'Streaming pausado', description: 'Os dados permanecem visiveis e podem ser retomados quando quiser.' });
      } else {
        toast({ title: 'Streaming retomado', description: 'Cotas em tempo real reativadas.' });
        queryClient.invalidateQueries({ queryKey: ['investments'] });
        queryClient.invalidateQueries({ queryKey: ['investments', 'summary'] });
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-8 animate-fade-in">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Carteira de investimentos</h1>
              <p className="text-muted-foreground">Acompanhe desempenho, rebalanceie em tempo real e registre novas operacoes.</p>
            </div>
            <Button variant="outline" onClick={toggleStreaming} size="sm">
              {isStreaming ? (
                <>
                  <PauseCircle className="mr-2 h-4 w-4" /> Pausar streaming
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" /> Retomar streaming
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Patrimonio investido</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dividendos acumulados</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <p className="text-2xl font-bold text-financial-gain">{formatCurrency(summary.totalDividends)}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Performance media</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className={`text-2xl font-bold ${summary.performance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                    {formatPercentage(summary.performance * 100)}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ativos monitorados</CardTitle>
              </CardHeader>
              <CardContent>
                {investmentsQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{displayInvestments.length}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center space-x-2">
                  <LineChartIcon className="h-5 w-5 text-primary" />
                  <span>Preco em tempo real</span>
                </CardTitle>
                <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayInvestments.map((investment) => (
                      <SelectItem key={investment.symbol} value={investment.symbol}>
                        {investment.symbol} — {investment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-72">
                {selectedHistory.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedHistory}>
                      <XAxis dataKey="time" tickFormatter={formatTimeLabel} minTickGap={32} />
                      <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={120} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={formatTimeLabel} />
                      <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Aguardando atualizacao de precos para o ativo selecionado.
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center space-x-2">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  <span>Alocacao por classe</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {allocationData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                        {allocationData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name) => [formatCurrency(value), name as string]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Cadastre operacoes para visualizar a distribuicao.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Valor total da carteira (tempo real)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {portfolioHistory.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tickFormatter={formatTimeLabel} minTickGap={32} />
                    <YAxis tickFormatter={(value: number) => formatCurrency(value)} width={120} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={formatTimeLabel} />
                    <Area type="monotone" dataKey="price" stroke="#22c55e" fill="#22c55e33" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Os dados da carteira serao exibidos assim que as operacoes forem registradas.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registrar operacao</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <div className="md:col-span-1">
                  <Label htmlFor="symbol">Ticker</Label>
                  <Input
                    id="symbol"
                    placeholder="PETR4"
                    value={tradeForm.symbol}
                    onChange={(event) => setTradeForm((prev) => ({ ...prev, symbol: event.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="name">Nome do ativo</Label>
                  <Input
                    id="name"
                    placeholder="Petrobras PN"
                    value={tradeForm.name}
                    onChange={(event) => setTradeForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div>
                  <Label>Classe</Label>
                  <Select value={tradeForm.assetType} onValueChange={(value) => setTradeForm((prev) => ({ ...prev, assetType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Operacao</Label>
                  <Select value={tradeForm.type} onValueChange={(value: TradePayload['type']) => setTradeForm((prev) => ({ ...prev, type: value }))}>
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
                    type="number"
                    min="0"
                    value={tradeForm.quantity}
                    onChange={(event) => setTradeForm((prev) => ({ ...prev, quantity: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preco (R$)</Label>
                  <Input
                    id="price"
                    placeholder="30,50"
                    value={tradeForm.price}
                    onChange={(event) => setTradeForm((prev) => ({ ...prev, price: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fees">Taxas (R$)</Label>
                  <Input
                    id="fees"
                    placeholder="0,00"
                    value={tradeForm.fees}
                    onChange={(event) => setTradeForm((prev) => ({ ...prev, fees: event.target.value }))}
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleTrade} disabled={tradeMutation.isPending}>
                  {tradeMutation.isPending ? 'Registrando...' : 'Salvar operacao'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Posicoes atuais</CardTitle>
            </CardHeader>
            <CardContent>
              {investmentsQuery.isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((item) => (
                    <Skeleton key={item} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : displayInvestments.length ? (
                <div className="space-y-3">
                  {displayInvestments.map((investment) => (
                    <div key={investment.symbol} className="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold">{investment.symbol}</p>
                          <Badge variant="outline">{investment.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{investment.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-6 text-sm md:text-right">
                        <div>
                          <p className="text-muted-foreground">Quantidade</p>
                          <p className="font-medium">{investment.quantity}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Preco atual</p>
                          <p className="font-medium">{formatCurrency(investment.current_price)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor total</p>
                          <p className="font-medium">{formatCurrency(investment.totalValue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Performance</p>
                          <p className={`font-medium ${investment.performance >= 0 ? 'text-financial-gain' : 'text-financial-loss'}`}>
                            {formatPercentage(investment.performance * 100)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhuma posicao cadastrada ainda. Registre uma operacao para iniciar o acompanhamento.
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
