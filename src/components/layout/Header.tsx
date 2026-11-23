"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, LogOut, User, Menu, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header({ title }: { title: string }) {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("EMPLOYEE");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        const userMeta = (user.user_metadata || {}) as Record<string, any>;
        setUserName(userMeta.full_name || userMeta.name || null);
        const role = (user.app_metadata?.role || userMeta.role || "EMPLOYEE").toUpperCase();
        setUserRole(role);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
      if (session?.user) {
        const userMeta = (session.user.user_metadata || {}) as Record<string, any>;
        setUserName(userMeta.full_name || userMeta.name || null);
        const role = (session.user.app_metadata?.role || userMeta.role || "EMPLOYEE").toUpperCase();
        setUserRole(role);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
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
        {/* <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="hidden sm:inline">Cashfree Live / Sandbox</span>
          <span className="sm:hidden font-mono">Live</span>
        </div> */}

        {/* Theme Changer */}
        <ThemeToggle />

        {/* User Info & Profile & Sign Out */}
        {userEmail ? (
          <div className="flex items-center gap-1.5 sm:gap-3 pl-2 sm:pl-3 border-l border-[var(--border)]">
            {/* Mobile Profile Link */}
            <Link
              href="/profile"
              title="My Profile"
              className="md:hidden flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                  userRole === "ADMIN"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                }`}
              >
                {userRole}
              </span>
            </Link>

            {/* Desktop Profile Link */}
            <Link
              href="/profile"
              title="View and Edit Profile"
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-800/80 transition text-xs text-[var(--muted-foreground)] hover:text-white group border border-transparent hover:border-slate-800"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                <User className="w-3.5 h-3.5 shrink-0" />
              </div>
              <span className="font-semibold text-[var(--foreground)] max-w-[130px] lg:max-w-[170px] truncate" title={userName ? `${userName} (${userEmail})` : userEmail}>
                {userName || userEmail}
              </span>
              {/* <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                  userRole === "ADMIN"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                }`}
              >
                {userRole}
              </span> */}
            </Link>

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
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
