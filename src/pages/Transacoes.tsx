import { useState, useRef } from "react";
import { Upload, Plus, Filter, Download, Search } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date;
  account: string;
  tags?: string[];
}

export default function Transacoes() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      description: "Salário - Empresa XYZ",
      amount: 8500.00,
      type: "income",
      category: "Salário",
      date: new Date("2024-01-05"),
      account: "Conta Corrente",
    },
    {
      id: "2",
      description: "Supermercado Extra",
      amount: -245.80,
      type: "expense",
      category: "Alimentação > Mercado",
      date: new Date("2024-01-04"),
      account: "Cartão de Crédito",
    },
  ]);

  const [newTransaction, setNewTransaction] = useState({
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "",
    account: "",
    date: new Date().toISOString().split('T')[0],
  });

  const categories = [
    "Alimentação > Mercado",
    "Alimentação > Restaurante", 
    "Moradia > Aluguel",
    "Moradia > Condomínio",
    "Transporte > Combustível",
    "Transporte > Uber",
    "Saúde > Farmácia",
    "Saúde > Consultas",
    "Lazer > Streaming",
    "Lazer > Cinema",
    "Educação > Cursos",
    "Salário",
    "Freelance",
    "Investimentos",
  ];

  const accounts = [
    "Conta Corrente",
    "Poupança", 
    "Cartão de Crédito",
    "Carteira",
    "Corretora",
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo CSV válido.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',');
      
      const importedTransactions: Transaction[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= 4) {
          const transaction: Transaction = {
            id: `imported_${Date.now()}_${i}`,
            description: values[0]?.trim() || "Transação Importada",
            amount: parseFloat(values[1]?.replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
            type: parseFloat(values[1]?.replace(/[R$\s.]/g, '').replace(',', '.')) > 0 ? 'income' : 'expense',
            category: values[2]?.trim() || "Sem Categoria",
            date: new Date(values[3]?.trim() || new Date()),
            account: values[4]?.trim() || "Conta Importada",
          };
          importedTransactions.push(transaction);
        }
      }

      setTransactions(prev => [...importedTransactions, ...prev]);
      toast({
        title: "Importação Concluída",
        description: `${importedTransactions.length} transações foram importadas com sucesso.`,
      });
    };

    reader.readAsText(file);
  };

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFormattedCurrency(newTransaction.amount);
    const transaction: Transaction = {
      id: Date.now().toString(),
      description: newTransaction.description,
      amount: newTransaction.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      type: newTransaction.type,
      category: newTransaction.category,
      date: new Date(newTransaction.date),
      account: newTransaction.account,
    };

    setTransactions(prev => [transaction, ...prev]);
    setNewTransaction({
      description: "",
      amount: "",
      type: "expense",
      category: "",
      account: "",
      date: new Date().toISOString().split('T')[0],
    });

    toast({
      title: "Transação Adicionada",
      description: "Nova transação foi registrada com sucesso.",
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
              <h1 className="text-3xl font-bold text-foreground">Transações</h1>
              <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Transação
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Transação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Input
                        id="description"
                        value={newTransaction.description}
                        onChange={(e) => setNewTransaction(prev => ({...prev, description: e.target.value}))}
                        placeholder="Ex: Supermercado Extra"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={newTransaction.type} onValueChange={(value: "income" | "expense") => setNewTransaction(prev => ({...prev, type: value}))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Despesa</SelectItem>
                            <SelectItem value="income">Receita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Valor (R$)</Label>
                        <Input
                          id="amount"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction(prev => ({...prev, amount: e.target.value}))}
                          placeholder="1.234,56"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select value={newTransaction.category} onValueChange={(value) => setNewTransaction(prev => ({...prev, category: value}))}>
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
                    <div>
                      <Label htmlFor="account">Conta</Label>
                      <Select value={newTransaction.account} onValueChange={(value) => setNewTransaction(prev => ({...prev, account: value}))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma conta" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction(prev => ({...prev, date: e.target.value}))}
                      />
                    </div>
                    <Button onClick={handleAddTransaction} className="w-full">
                      Adicionar Transação
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-gain">
                  {formatCurrency(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-financial-loss">
                  {formatCurrency(Math.abs(transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(transactions.reduce((acc, t) => acc + t.amount, 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Histórico de Transações</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar transações..." className="pl-9" />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RecentTransactions />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}