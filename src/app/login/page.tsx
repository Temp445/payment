"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

type LoadingState = "idle" | "authenticating" | "authorizing" | "redirecting";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const urlError = searchParams.get("error");
  const urlNotice = searchParams.get("notice");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(urlError);

  const inviteToken = searchParams.get("token");

  // If user arrives at /login with an invite token, forward them directly to /invite
  React.useEffect(() => {
    if (inviteToken) {
      router.replace(`/invite?token=${encodeURIComponent(inviteToken)}`);
    }
  }, [inviteToken, router]);

  const [notice, setNotice] = useState<string | null>(
    urlNotice === "pending_approval"
      ? "Account created successfully! Your account is pending administrator approval before you can sign in."
      : urlNotice === "admin_created"
      ? "Administrator account created successfully! You can now sign in with your credentials."
      : urlNotice
  );

  const supabase = createClient();
  const isLoading = loadingState !== "idle";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoadingState("authenticating");
    setError(null);
    setNotice(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoadingState("idle");
        return;
      }

      if (data.session) {
        setLoadingState("authorizing");

        let appMeta = (data.session.user.app_metadata || {}) as Record<string, any>;
        const userMeta = (data.session.user.user_metadata || {}) as Record<string, any>;
        let isApproved = appMeta.is_approved === true || userMeta.is_approved === true;
        let status = appMeta.status || userMeta.status || (isApproved ? "ACTIVE" : "PENDING_APPROVAL");
        const role = (appMeta.role || userMeta.role || "EMPLOYEE").toUpperCase();

        if (status === "DEACTIVATED") {
          await supabase.auth.signOut();
          setError("Your account has been deactivated by an administrator. Please contact your admin for access.");
          setLoadingState("idle");
          return;
        }

        if (status === "REJECTED") {
          await supabase.auth.signOut();
          setError("Your account registration was rejected by an administrator. Please contact your admin for assistance.");
          setLoadingState("idle");
          return;
        }

        if (!isApproved || status === "PENDING_APPROVAL") {
          // Safeguard: Check if this user qualifies as the first admin (zero admins exist)
          try {
            const promoRes = await fetch("/api/v1/auth/signup-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: data.session.user.id }),
            });
            const promoData = await promoRes.json();
            if (promoData.success && promoData.isFirstAdmin) {
              setLoadingState("redirecting");
              router.push(next);
              router.refresh();
              return;
            }
          } catch {
            // Ignore and fall back to pending approval block
          }

          await supabase.auth.signOut();
          setError("Your account is pending administrator approval. You will be able to log in once an administrator approves your account.");
          setLoadingState("idle");
          return;
        }

        setLoadingState("redirecting");
        router.push(next);
        router.refresh();
        return;
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoadingState("idle");
    }
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8 backdrop-blur relative overflow-hidden transition-all duration-300">
        {/* Animated Top Progress Bar */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden bg-slate-800/80">
            <div className="h-full w-full bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400 animate-indeterminate" />
          </div>
        )}

        {/* Redirecting Overlay Transition */}
        {loadingState === "redirecting" && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20 animate-in fade-in duration-300">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 animate-ping absolute" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 relative">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Access Granted</h3>
            <p className="text-xs text-slate-400 mt-1 text-center">
              Launching your Payment Hub dashboard...
            </p>
            <div className="w-44 h-1.5 bg-slate-800 rounded-full mt-5 overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-indeterminate" />
            </div>
          </div>
        )}

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-3 relative group">
            <CreditCard className="w-6 h-6 transition-transform group-hover:scale-105" />
            {isLoading && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Payment Hub</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to manage your gateway & subscriptions</p>
        </div>

        {notice && (
          <div
            className={`mb-6 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
              urlNotice === "admin_created"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
            }`}
          >
            {urlNotice === "admin_created" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            )}
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 ${
              loadingState === "redirecting"
                ? "bg-emerald-600 text-white shadow-emerald-600/20"
                : "bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white shadow-blue-600/20"
            }`}
          >
            {loadingState === "authenticating" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-200" />
                <span>Authenticating credentials...</span>
              </>
            )}
            {loadingState === "authorizing" && (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-200" />
                <span>Verifying permissions...</span>
              </>
            )}
            {loadingState === "redirecting" && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-pulse" />
                <span>Redirecting...</span>
              </>
            )}
            {loadingState === "idle" && (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
          Registration is invite-only. Received an invitation?{" "}
          <span className="text-blue-400 font-semibold">Open your invite link</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 animate-pulse">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Loading Payment Hub...</span>
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
