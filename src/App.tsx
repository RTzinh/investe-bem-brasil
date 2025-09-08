import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Transacoes from "./pages/Transacoes";
import Orcamentos from "./pages/Orcamentos";
import Metas from "./pages/Metas";
import Investimentos from "./pages/Investimentos";
import Relatorios from "./pages/Relatorios";
import Assistente from "./pages/Assistente";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/transacoes" element={<Transacoes />} />
          <Route path="/orcamentos" element={<Orcamentos />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/investimentos" element={<Investimentos />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/assistente" element={<Assistente />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
