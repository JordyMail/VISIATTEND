import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
    label: string;
  };
  description?: string;
  className?: string;
  color?: "primary" | "success" | "warning" | "info" | "error";
}

const colorClasses = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-status-success/10 text-status-success border-status-success/20",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
  info: "bg-accent/10 text-accent border-accent/20",
  error: "bg-status-error/10 text-status-error border-status-error/20",
};

const iconColorClasses = {
  primary: "bg-primary/20 text-primary",
  success: "bg-status-success/20 text-status-success",
  warning: "bg-status-warning/20 text-status-warning",
  info: "bg-accent/20 text-accent",
  error: "bg-status-error/20 text-status-error",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  color = "primary",
}: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {title}
            </p>
            <h3 className="text-3xl font-bold text-foreground mb-2">
              {value}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="mt-3 flex items-center gap-1 text-xs font-medium">
                <span
                  className={cn(
                    "inline-block",
                    trend.direction === "up"
                      ? "text-status-success"
                      : "text-status-error"
                  )}
                >
                  {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "p-3 rounded-lg",
              iconColorClasses[color]
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
