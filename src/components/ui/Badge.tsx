import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  const variants = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    neutral: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
    PAID: "success",
    SUCCESS: "success",
    DELIVERED: "success",
    ACTIVE: "info",
    CREATED: "neutral",
    PENDING: "warning",
    PROCESSING: "warning",
    FAILED: "danger",
    USER_DROPPED: "warning",
    CANCELLED: "danger",
    EXPIRED: "neutral",
    PARTIALLY_REFUNDED: "warning",
    REFUNDED: "info",
  };

  return <Badge variant={map[status] || "neutral"}>{status}</Badge>;
}

