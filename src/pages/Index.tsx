import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { FinancialOverview } from "@/components/dashboard/financial-overview";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { InvestmentSummary } from "@/components/dashboard/investment-summary";
import { AIInsights } from "@/components/dashboard/ai-insights";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 ml-64 p-6 space-y-8 animate-fade-in">
          <FinancialOverview />
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentTransactions />
            </div>
            <div className="space-y-6">
              <InvestmentSummary />
              <AIInsights />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
