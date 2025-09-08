import { useState } from "react";
import { Send, Brain, AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Assistente() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Olá! Sou seu assistente financeiro educacional. Posso ajudar com explicações sobre investimentos, análise do seu perfil de risco e sugestões de alocação. Como posso ajudar hoje?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");

  const quickActions = [
    "Explicar Tesouro Selic",
    "Meu perfil de risco",
    "Sugestão de alocação",
    "Resumo financeiro do mês",
    "O que são FIIs?",
    "Como diversificar carteira?"
  ];

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Simular resposta da IA
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Esta é uma simulação da resposta da IA. Para funcionalidade completa, conecte uma API de IA (OpenAI/Anthropic) via Supabase Edge Functions.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);

    setInput("");
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center justify-center space-x-2">
                <Brain className="h-8 w-8 text-primary" />
                <span>Assistente IA Financeiro</span>
              </h1>
              <p className="text-muted-foreground">Educação financeira personalizada e inteligente</p>
              <Badge variant="outline" className="bg-warning/10 border-warning text-warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Conteúdo Educacional
              </Badge>
            </div>

            <Card className="border-warning bg-warning/5">
              <CardContent className="p-4">
                <p className="text-sm text-center">
                  <strong>Aviso Legal:</strong> Este assistente fornece informações educacionais e não constitui recomendação de investimento. 
                  Sempre consulte um profissional credenciado antes de tomar decisões financeiras.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map((action, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => handleQuickAction(action)}
                >
                  {action}
                </Button>
              ))}
            </div>

            <Card className="h-96 flex flex-col">
              <CardHeader>
                <CardTitle>Conversa</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Digite sua pergunta..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}