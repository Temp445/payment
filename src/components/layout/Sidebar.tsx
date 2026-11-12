"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  RotateCcw,
  Scale,
  Send,
  ShieldCheck,
  CreditCard,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Integration Guides", href: "/guide", icon: BookOpen },
  { label: "Applications", href: "/apps", icon: Layers },
  { label: "Orders & Payments", href: "/orders", icon: ShoppingBag },
  { label: "Refunds", href: "/refunds", icon: RotateCcw },
  { label: "Reconciliation", href: "/reconciliation", icon: Scale },
  { label: "Outbox Queue", href: "/outbox", icon: Send },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck },
  { label: "System Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[var(--border)] bg-[var(--card)] flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-[var(--border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-[var(--foreground)] tracking-tight">Payment Hub</h2>
          <p className="text-[11px] text-[var(--muted-foreground)]">Cashfree Aggregator</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800/60"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-1">
        <div className="flex items-center justify-between">
          <span>Gateway:</span>
          <span className="font-semibold text-emerald-400">Cashfree v2023</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Database:</span>
          <span className="font-semibold text-blue-400">Supabase PG</span>
        </div>
      </div>
    </aside>
  );
}

