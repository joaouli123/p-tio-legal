import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  variant?: "gold" | "success" | "destructive" | "info";
}

const variants = {
  gold: "from-gold/20 to-transparent text-gold border-gold/30",
  success: "from-success/20 to-transparent text-success border-success/30",
  destructive: "from-destructive/20 to-transparent text-destructive border-destructive/30",
  info: "from-info/20 to-transparent text-info border-info/30",
};

export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  icon: Icon,
  variant = "gold",
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-card border border-border p-5 shadow-elegant hover:border-gold-subtle transition-all group">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 group-hover:opacity-50 transition-opacity", variants[variant])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {delta && (
            <p
              className={cn(
                "text-xs mt-2 font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {delta}
            </p>
          )}
        </div>
        <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center border", variants[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
