import { 
  BarChart3, 
  CreditCard, 
  PieChart, 
  Target, 
  TrendingUp, 
  MessageSquare,
  Home
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { 
    icon: Home, 
    label: "Dashboard", 
    href: "/", 
    active: true 
  },
  {
    icon: CreditCard,
    label: "Transactions",
    href: "/transactions"
  },
  {
    icon: PieChart,
    label: "Budgets",
    href: "/budgets"
  },
  {
    icon: Target,
    label: "Goals",
    href: "/goals"
  },
  {
    icon: TrendingUp,
    label: "Investments",
    href: "/investments"
  },
  {
    icon: BarChart3,
    label: "Reports",
    href: "/reports"
  },
  {
    icon: MessageSquare,
    label: "AI Assistant",
    href: "/assistant"
  },
];

export function Navigation() {
  return (
    <nav className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="space-y-2 p-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-accent/50",
                item.active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}