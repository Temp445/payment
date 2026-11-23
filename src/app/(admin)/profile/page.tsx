"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Mail,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  Key,
  Send,
  BadgeCheck,
  Clock,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface ProfileData {
  id: string;
  email: string | null;
  name: string;
  role: string;
  status: string;
  isApproved: boolean;
  emailConfirmedAt: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  // Name update states
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password update states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Email reset link states
  const [sendingResetEmail, setSendingResetEmail] = useState(false);
  const [resetEmailStatus, setResetEmailStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/profile");
      const data = await res.json();
      if (data.success && data.user) {
        setProfile(data.user);
        setName(data.user.name || "");
      } else {
        // Fallback directly to supabase client
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const appMeta = (user.app_metadata || {}) as Record<string, any>;
          const userMeta = (user.user_metadata || {}) as Record<string, any>;
          const fallbackData: ProfileData = {
            id: user.id,
            email: user.email || null,
            name: userMeta.full_name || userMeta.name || "",
            role: (appMeta.role || userMeta.role || "EMPLOYEE").toUpperCase(),
            status: appMeta.status || "ACTIVE",
            isApproved: appMeta.is_approved === true || userMeta.is_approved === true,
            emailConfirmedAt: user.email_confirmed_at || null,
            createdAt: user.created_at || null,
            lastSignInAt: user.last_sign_in_at || null,
          };
          setProfile(fallbackData);
          setName(fallbackData.name);
        }
      }
    } catch (err: any) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameStatus(null);

    try {
      const res = await fetch("/api/v1/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setNameStatus({ type: "success", text: "User name updated successfully!" });
        if (profile) {
          setProfile({ ...profile, name: data.name });
        }
        // Also refresh Supabase client session in background
        await supabase.auth.updateUser({
          data: { full_name: name.trim(), name: name.trim() },
        });
      } else {
        setNameStatus({ type: "error", text: data.error || "Failed to update user name." });
      }
    } catch (err: any) {
      setNameStatus({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSavingName(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", text: "Passwords do not match." });
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordStatus({ type: "error", text: error.message });
      } else {
        setPasswordStatus({
          type: "success",
          text: "Password updated successfully! Your new password is now active.",
        });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordStatus({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setUpdatingPassword(false);
    }
  }

  async function handleSendResetEmail() {
    if (!profile?.email) return;
    setSendingResetEmail(true);
    setResetEmailStatus(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        setResetEmailStatus({ type: "error", text: error.message });
      } else {
        setResetEmailStatus({
          type: "success",
          text: `A password reset link has been dispatched to ${profile.email}.`,
        });
      }
    } catch (err: any) {
      setResetEmailStatus({ type: "error", text: err.message || "Failed to send reset link." });
    } finally {
      setSendingResetEmail(false);
    }
  }

  const initials = (profile?.name || profile?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6 w-full">
      <Header title="User Profile" />

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          Loading profile details...
        </div>
      ) : profile ? (
        <div className="space-y-6 w-full">
          {/* User Hero Summary Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 p-6 sm:p-8 backdrop-blur shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4 sm:gap-5">
                {/* User Avatar with Initials */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-lg shadow-blue-500/20 shrink-0 border border-blue-400/30">
                  {initials}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {profile.name || "Payment Hub User"}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                        profile.role === "ADMIN"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {profile.role === "ADMIN" ? "Administrator" : "Staff Employee"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {profile.status}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {profile.email}
                  </p>
                </div>
              </div>

              {/* Quick Meta Stats */}
              <div className="flex sm:flex-col gap-4 sm:gap-2 text-[11px] text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                {profile.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Joined{" "}
                      {new Date(profile.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {profile.lastSignInAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Last active{" "}
                      {new Date(profile.lastSignInAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: User Profile & Name Settings */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg backdrop-blur flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">General Information</h3>
                    <p className="text-[11px] text-slate-400">Update your account name and public identity</p>
                  </div>
                </div>

                {nameStatus && (
                  <div
                    className={`mb-5 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                      nameStatus.type === "success"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                    }`}
                  >
                    {nameStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{nameStatus.text}</span>
                  </div>
                )}

                <form id="profile-name-form" onSubmit={handleSaveName} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Full Name / Display Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Shown across dashboard reports, audit logs, and in the header menu.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        disabled
                        value={profile.email || ""}
                        className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-xs sm:text-sm cursor-not-allowed select-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <BadgeCheck className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      System Permissions
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        disabled
                        value={profile.role === "ADMIN" ? "System Administrator (Full Access)" : "Staff Employee"}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-xs sm:text-sm cursor-not-allowed select-none"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-800">
                <button
                  type="submit"
                  form="profile-name-form"
                  disabled={savingName}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savingName ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Name
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Security & Password Reset */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg backdrop-blur flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Security & Password</h3>
                    <p className="text-[11px] text-slate-400">Update your account password or send a reset link</p>
                  </div>
                </div>

                {passwordStatus && (
                  <div
                    className={`mb-5 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                      passwordStatus.type === "success"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                    }`}
                  >
                    {passwordStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{passwordStatus.text}</span>
                  </div>
                )}

                <form id="password-reset-form" onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Email Reset Link Secondary Action */}
                <div className="mt-6 pt-5 border-t border-slate-800/80">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200">Reset Link via Email</div>
                      <div className="text-[11px] text-slate-400">Receive a secure reset link to your email inbox</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendResetEmail}
                      disabled={sendingResetEmail}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {sendingResetEmail ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          Send Link
                        </>
                      )}
                    </button>
                  </div>
                  {resetEmailStatus && (
                    <div
                      className={`mt-2.5 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        resetEmailStatus.type === "success"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {resetEmailStatus.type === "success" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      )}
                      <span>{resetEmailStatus.text}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-slate-800">
                <button
                  type="submit"
                  form="password-reset-form"
                  disabled={updatingPassword}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {updatingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Updating password...
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Appearance & Theme Changer */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Appearance & Theme</h3>
                <p className="text-[11px] text-slate-400">Choose between the dark slate interface and the crisp white theme</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Theme Option */}
              <div
                onClick={() => setTheme("dark")}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  theme === "dark"
                    ? "bg-slate-950/80 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shadow">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      Dark Theme
                      {theme === "dark" && (
                        <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Deep slate aesthetic, easy on eyes
                    </div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${theme === "dark" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-700"}`}>
                  {theme === "dark" && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>

              {/* White Theme Option */}
              <div
                onClick={() => setTheme("light")}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  theme === "light"
                    ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-md text-slate-900"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-amber-500 shadow">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      White Theme
                      {theme === "light" && (
                        <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Crisp bright background, high contrast
                    </div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${theme === "light" ? "border-blue-500 bg-blue-600 text-white" : "border-slate-700"}`}>
                  {theme === "light" && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm">Profile not found.</div>
      )}
    </div>
  );
}

