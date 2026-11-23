"use client";

import React, { useEffect, useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Integration Guides", href: "/guide", icon: BookOpen },
  { label: "Applications", href: "/apps", icon: Layers },
  { label: "Orders & Payments", href: "/orders", icon: ShoppingBag },
  { label: "Refunds", href: "/refunds", icon: RotateCcw },
  { label: "Reconciliation", href: "/reconciliation", icon: Scale },
  { label: "Outbox Queue", href: "/outbox", icon: Send },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck },
  { label: "System Settings", href: "/settings", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mobileOpen, closeSidebar } = useSidebar();
  const [userRole, setUserRole] = useState<string>("ADMIN");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const role = (user.app_metadata?.role || "EMPLOYEE").toUpperCase();
        setUserRole(role);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = (session.user.app_metadata?.role || "EMPLOYEE").toUpperCase();
        setUserRole(role);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  // Hide admin-only routes (System Settings) if user has role EMPLOYEE
  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && userRole === "EMPLOYEE") {
      return false;
    }
    return true;
  });

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
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          <span>Management</span>
        </div>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 sm:py-2 rounded-lg text-xs font-medium transition",
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800/60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <span>Portal Access:</span>
          <span
            className={cn(
              "font-semibold uppercase text-[11px] px-1.5 py-0.5 rounded",
              userRole === "ADMIN"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            )}
          >
            {userRole}
          </span>
        </div>
        <div className="text-[10px] text-slate-500">Payment Hub Multi-Tenant v1.0.0</div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-[var(--border)] bg-[var(--card)] shrink-0 min-h-screen">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={closeSidebar}
          aria-hidden="true"
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Mobile Sliding Drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[var(--card)] border-r border-[var(--border)] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
