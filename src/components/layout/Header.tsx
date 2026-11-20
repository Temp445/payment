"use client";

import React, { useEffect, useState } from "react";
import { Shield, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header({ title }: { title: string }) {
  const router = useRouter();
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
    <header className="h-16 border-b border-[var(--border)] bg-[var(--card)] px-6 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Environment Badge */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Cashfree Live / Sandbox
        </div>

        {/* User Info & Sign Out */}
        {userEmail ? (
          <div className="flex items-center gap-3 pl-3 border-l border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium text-[var(--foreground)] max-w-[150px] truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-3 border-l border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-[var(--foreground)]">Admin Portal</span>
          </div>
        )}
      </div>
    </header>
  );
}

