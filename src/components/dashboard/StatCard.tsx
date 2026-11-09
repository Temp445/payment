import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
}: StatCardProps) {
  return (
    <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          {title}
        </span>
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold",
              trendPositive ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{subtitle}</p>
      )}
    </div>
  );
}

