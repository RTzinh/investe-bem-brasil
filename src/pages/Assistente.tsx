import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Brain, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api, AssistantMessage } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_ACTIONS = [
  'Explique Tesouro Selic',
  'Analise meu perfil de risco',
  'Sugira alocação equilibrada',
  'Resumo financeiro do mês',
  'O que são FIIs?',
  'Como diversificar minha carteira?'
];

export default function Assistente() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou seu assistente financeiro educacional. Posso explicar conceitos, ajudar com comparações e trazer cenários simulados. Como posso ajudar hoje?'
    }
  ]);
  const [input, setInput] = useState('');

  const sendMutation = useMutation({
    mutationFn: (history: AssistantMessage[]) => api.assistant.chat(history),
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Não foi possível responder agora',
        description: 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      });
      setMessages((prev) => prev.filter((message) => message.id !== 'typing'));
    },
    onSuccess: (data) => {
      setMessages((prev) => prev
        .filter((message) => message.id !== 'typing')
        .concat({
          id: Date.now().toString(),
          role: 'assistant',
          content: data.reply.trim() || 'Consegui processar sua solicitação, mas não recebi detalhes suficientes. Poderia reformular a pergunta?'
        }));
    },
  });

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage, { id: 'typing', role: 'assistant', content: 'Digitando…' }]);
    setInput('');

    const payload = [...messages, userMessage]
      .filter((message) => message.id !== 'typing')
      .map<AssistantMessage>((message) => ({ role: message.role, content: message.content }));

    sendMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6">
          <div className="mx-auto flex max-w-4xl flex-col space-y-6">
            <div className="text-center space-y-2">
              <h1 className="flex items-center justify-center space-x-2 text-3xl font-bold">
                <Brain className="h-8 w-8 text-primary" />
                <span>Assistente IA Financeiro</span>
              </h1>
              <p className="text-muted-foreground">Conteúdo educacional em linguagem simples para apoiar suas decisões.</p>
              <Badge variant="outline" className="border-warning bg-warning/10 text-warning">
                <AlertTriangle className="mr-1 h-3 w-3" /> Conteúdo Educacional (não é recomendação)
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {QUICK_ACTIONS.map((action) => (
                <Button key={action} variant="outline" className="h-auto justify-start p-4 text-left" onClick={() => handleSend(action)}>
                  {action}
                </Button>
              ))}
            </div>

            <Card className="flex h-[460px] flex-col">
              <CardHeader>
                <CardTitle>Conversa</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 overflow-y-auto pr-2">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {message.content}
                    </div>
                  </div>
                ))}
              </CardContent>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Digite sua pergunta..."
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSend(input);
                      }
                    }}
                    disabled={sendMutation.isPending}
                  />
                  <Button onClick={() => handleSend(input)} disabled={sendMutation.isPending}>
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
