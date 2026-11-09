"use client";

import React from "react";
import { Bell, Shield } from "lucide-react";

export function Header({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--card)] px-6 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Environment Badge */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Cashfree Sandbox / Live Ready
        </div>

        {/* Admin Tag */}
        <div className="flex items-center gap-2 pl-3 border-l border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="font-medium text-[var(--foreground)]">Admin Portal</span>
        </div>
      </div>
    </header>
  );
}

