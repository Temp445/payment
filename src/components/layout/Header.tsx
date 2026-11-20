"use client";

import React, { useEffect, useState } from "react";
import { Shield, LogOut, User, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";

export function Header({ title }: { title: string }) {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="min-h-14 sm:h-16 py-2.5 sm:py-0 border-b border-[var(--border)] bg-[var(--card)] px-3 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20 backdrop-blur">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={toggleSidebar}
          aria-label="Open navigation menu"
          className="lg:hidden p-1.5 -ml-1 rounded-lg text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-[var(--foreground)] truncate" title={title}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Environment Badge */}
        <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="hidden sm:inline">Cashfree Live / Sandbox</span>
          <span className="sm:hidden font-mono">Live</span>
        </div>

        {/* User Info & Sign Out */}
        {userEmail ? (
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-[var(--border)]">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-medium text-[var(--foreground)] max-w-[120px] lg:max-w-[160px] truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pl-2 sm:pl-3 border-l border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-medium text-[var(--foreground)] hidden sm:inline">Admin Portal</span>
          </div>
        )}
      </div>
    </header>
  );
}
