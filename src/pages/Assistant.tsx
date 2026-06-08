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
  'Explain Tesouro Selic',
  'Analyze my risk profile',
  'Suggest a balanced allocation',
  'Financial summary for the month',
  'What are FIIs?',
  'How do I diversify my portfolio?'
];

export default function Assistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I am your educational finance assistant. I can explain concepts, help with comparisons and walk through simulated scenarios. How can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');

  const sendMutation = useMutation({
    mutationFn: (history: AssistantMessage[]) => api.assistant.chat(history),
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Unable to respond right now',
        description: 'Check your connection and try again.',
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
          content: data.reply.trim() || 'I processed your request but did not get enough detail. Could you rephrase the question?'
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

    setMessages((prev) => [...prev, userMessage, { id: 'typing', role: 'assistant', content: 'Typing…' }]);
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
                <span>Financial AI Assistant</span>
              </h1>
              <p className="text-muted-foreground">Educational content in plain language to support your decisions.</p>
              <Badge variant="outline" className="border-warning bg-warning/10 text-warning">
                <AlertTriangle className="mr-1 h-3 w-3" /> Educational Content (not investment advice)
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
                <CardTitle>Conversation</CardTitle>
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
                    placeholder="Type your question..."
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
