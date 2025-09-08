import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
  gradient?: boolean;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  className,
  gradient = false 
}: StatCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-elevated",
      gradient && "bg-gradient-primary text-white border-0",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className={cn(
            "text-sm font-medium",
            gradient ? "text-white/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          {icon && (
            <div className={cn(
              "h-4 w-4",
              gradient ? "text-white/80" : "text-muted-foreground"
            )}>
              {icon}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-2xl font-bold",
            gradient ? "text-white" : "text-foreground"
          )}>
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-xs font-medium",
              gradient ? "text-white/70" : "",
              changeType === 'positive' && !gradient && "text-financial-gain",
              changeType === 'negative' && !gradient && "text-financial-loss",
              changeType === 'neutral' && !gradient && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}