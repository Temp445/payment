"use client";

import React, { useEffect } from "react";
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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";

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
  const { mobileOpen, closeSidebar } = useSidebar();

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        closeSidebar();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, closeSidebar]);

  const navContent = (
    <>
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-[var(--foreground)] tracking-tight">Payment Hub</h2>
            <p className="text-[11px] text-[var(--muted-foreground)]">Cashfree Aggregator</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          aria-label="Close navigation"
          className="lg:hidden p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
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
              onClick={closeSidebar}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg text-xs font-medium transition",
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
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
      <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <span>Gateway:</span>
          <span className="font-semibold text-emerald-400">Cashfree v2023</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Database:</span>
          <span className="font-semibold text-blue-400">Supabase PG</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Sidebar (Sticky, visible on lg and up) */}
      <aside className="hidden lg:flex w-64 border-r border-[var(--border)] bg-[var(--card)] flex-col shrink-0 min-h-screen sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* 2. Mobile & Tablet Drawer (< lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            onClick={closeSidebar}
            aria-hidden="true"
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Off-canvas panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--card)] border-r border-[var(--border)] flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 z-50">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
