"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CreditCard,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invite data
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("EMPLOYEE");
  const [allowedAppCount, setAllowedAppCount] = useState(0);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    });

    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setErrorMessage("No invitation token provided. Please check the invitation link.");
      return;
    }

    validateToken(token);
  }, [token]);

  async function validateToken(inviteToken: string) {
    setVerifying(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/users/invite?token=${encodeURIComponent(inviteToken)}`);
      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        setTokenValid(false);
        setErrorMessage("Server returned an invalid response. Please refresh or try again.");
        return;
      }

      const data = await res.json();
      if (data.success && data.valid) {
        setTokenValid(true);
        setInviteEmail(data.email);
        setInviteRole(data.role);
        setAllowedAppCount(Array.isArray(data.allowedAppIds) ? data.allowedAppIds.length : 0);
      } else {
        setTokenValid(false);
        setErrorMessage(data.error || "This invitation is invalid or has expired.");
      }
    } catch (err: any) {
      setTokenValid(false);
      setErrorMessage(err.message || "Network error verifying invitation.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create account via Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: inviteRole,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      // 2. Accept invite & attach pre-configured role & application permissions
      const acceptRes = await fetch("/api/v1/users/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          userId: authData.user?.id,
        }),
      });

      const acceptContentType = acceptRes.headers.get("content-type") || "";
      if (!acceptContentType.includes("application/json")) {
        throw new Error("Activation server returned an invalid response. Please try again.");
      }

      const acceptData = await acceptRes.json();
      if (!acceptData.success) {
        throw new Error(acceptData.error || "Failed to finalize account activation.");
      }

      // 3. Authenticate session
      await supabase.auth.signInWithPassword({
        email: inviteEmail,
        password: password,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete registration");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 selection:bg-blue-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3 shadow-lg shadow-blue-500/10">
            <CreditCard className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Ace Payment Hub</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-tenant Gateway & Licensing Platform</p>
        </div>

        {/* Verification Loading State */}
        {verifying && (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-300">Verifying your invitation...</p>
          </div>
        )}

        {/* Invalid Token State */}
        {!verifying && !tokenValid && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Invitation Unavailable</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {errorMessage || "This invitation link is invalid, expired, or has already been used."}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Valid Invite Form */}
        {!verifying && tokenValid && (
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Invitation Accepted
                </span>
              </div>
              <h2 className="text-base font-bold text-white">Join Your Team</h2>
              <p className="text-xs text-slate-400 mt-1">
                You have been invited to collaborate on Ace Central Payment Hub.
              </p>
            </div>

            {/* Current Active Session Notice */}
            {currentUserEmail && currentUserEmail.toLowerCase() !== inviteEmail.toLowerCase() && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    You are currently signed in as <strong>{currentUserEmail}</strong>.
                  </span>
                </div>
                <p className="text-[11px] text-amber-400/80 leading-relaxed">
                  To register this new account for <strong>{inviteEmail}</strong>, please sign out first or open this link in an Incognito / private window.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setCurrentUserEmail(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold transition cursor-pointer"
                >
                  Sign Out and Register
                </button>
              </div>
            )}

            {currentUserEmail && currentUserEmail.toLowerCase() === inviteEmail.toLowerCase() && (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Already Signed In</p>
                  <p className="text-[11px] text-blue-300/80">You are already signed in as {inviteEmail}.</p>
                </div>
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
                >
                  Go to Dashboard →
                </Link>
              </div>
            )}

            {/* Success Feedback */}
            {success && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Account Created & Activated!</p>
                  <p className="text-[11px] text-emerald-400/90 mt-0.5">Logging you in to your dashboard...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!success && (
              <form onSubmit={handleAcceptInvite} className="space-y-4 text-xs">
                {/* Invitee Email (Locked) */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={inviteEmail}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono cursor-not-allowed select-all"
                    />
                  </div>
                </div>

                {/* Pre-assigned Role Badge */}
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Assigned Role:</span>
                  <div className="flex items-center gap-1 font-semibold text-blue-400">
                    {inviteRole === "ADMIN" ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-purple-300">Administrator</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                        <span>Employee ({allowedAppCount} app{allowedAppCount === 1 ? "" : "s"})</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Your Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Create Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 disabled:opacity-50 mt-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Activating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2 border-t border-slate-800/80">
              <Link href="/login" className="text-xs text-slate-500 hover:text-slate-300 transition">
                Already have an active account? Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}

