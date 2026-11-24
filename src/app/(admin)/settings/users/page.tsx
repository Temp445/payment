"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import {
  Users,
  Settings,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  UserCheck,
  Clock,
  Mail,
  UserPlus,
  ExternalLink,
  Lock,
  Unlock,
  ShieldAlert,
  Power,
  UserX,
  Sparkles,
  X,
  XCircle,
  Layers,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ApplicationOption {
  id: string;
  appCode: string;
  appName: string;
}

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EMPLOYEE";
  status: "ACTIVE" | "DEACTIVATED" | "PENDING_APPROVAL" | "REJECTED";
  isApproved: boolean;
  isVerified: boolean;
  allowedAppIds?: string[];
  createdAt: string | null;
  updatedAt: string | null;
  lastSignInAt: string | null;
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [availableApps, setAvailableApps] = useState<ApplicationOption[]>([]);
  const [allowPublicSignup, setAllowPublicSignup] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DEACTIVATED" | "PENDING_APPROVAL" | "REJECTED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Invite User state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE");
  const [inviteAllowedAppIds, setInviteAllowedAppIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl: string;
    email: string;
    role: string;
    emailSent?: boolean;
    emailStatusMessage?: string;
  } | null>(null);
  const [copiedInviteUrl, setCopiedInviteUrl] = useState(false);

  // Modal for assigning apps to an employee
  const [assignModalUser, setAssignModalUser] = useState<UserItem | null>(null);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [savingApps, setSavingApps] = useState(false);

  // Modal for permanently deleting a user
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users");
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        setAllowPublicSignup(Boolean(data.allowPublicSignup));
        if (Array.isArray(data.availableApps)) {
          setAvailableApps(data.availableApps);
        }
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to load user list" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Network error loading users" });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          allowedAppIds: inviteRole === "EMPLOYEE" ? inviteAllowedAppIds : [],
        }),
      });
      const data = await res.json();
      if (data.success && data.invite) {
        setInviteResult({
          inviteUrl: data.invite.inviteUrl,
          email: data.invite.email,
          role: data.invite.role,
          emailSent: Boolean(data.emailSent),
          emailStatusMessage: data.emailStatusMessage,
        });
        setStatusMsg({
          type: "success",
          text: data.emailSent
            ? `Invitation email successfully dispatched directly to ${data.invite.email}!`
            : data.emailStatusMessage || `Invitation link generated for ${data.invite.email}`,
        });
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to create invitation" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to send invitation" });
    } finally {
      setInviting(false);
    }
  }

  function handleCloseInviteModal() {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("EMPLOYEE");
    setInviteAllowedAppIds([]);
    setInviteResult(null);
    setCopiedInviteUrl(false);
  }

  function handleToggleInviteApp(appId: string) {
    setInviteAllowedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  }

  function handleOpenAssignApps(user: UserItem) {
    setAssignModalUser(user);
    setSelectedAppIds(Array.isArray(user.allowedAppIds) ? [...user.allowedAppIds] : []);
  }

  function handleToggleAppSelection(appId: string) {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  }

  function handleSelectAllApps() {
    setSelectedAppIds(availableApps.map((a) => a.id));
  }

  function handleClearAllApps() {
    setSelectedAppIds([]);
  }

  async function handleSaveAllowedApps() {
    if (!assignModalUser) return;
    setSavingApps(true);
    try {
      const res = await fetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_ALLOWED_APPS",
          userId: assignModalUser.id,
          allowedAppIds: selectedAppIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: "success",
          text: `Application visibility updated for ${assignModalUser.email} (${selectedAppIds.length} app(s) permitted).`,
        });
        setUsers((prev) =>
          prev.map((u) =>
            u.id === assignModalUser.id ? { ...u, allowedAppIds: selectedAppIds } : u
          )
        );
        setAssignModalUser(null);
      } else {
        alert(data.error || "Failed to save application permissions");
      }
    } catch (err: any) {
      alert(err.message || "Network error saving application permissions");
    } finally {
      setSavingApps(false);
    }
  }

  // Toggle Public Sign-up Lock
  async function handleToggleSignupLock() {
    const nextState = !allowPublicSignup;
    setActionLoading("toggle-lock");
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_SIGNUP_LOCK",
          allowPublicSignup: nextState,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAllowPublicSignup(nextState);
        setStatusMsg({
          type: "success",
          text: nextState
            ? "Public Sign-Up is now UNLOCKED. New users may register (will require admin approval)."
            : "Public Sign-Up is now LOCKED. The registration screen is disabled.",
        });
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to toggle sign-up lock" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error toggling sign-up lock" });
    } finally {
      setActionLoading(null);
    }
  }

  // Approve User
  async function handleApprove(userId: string, role: "ADMIN" | "EMPLOYEE") {
    setActionLoading(`approve-${userId}`);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          userId,
          role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: data.message });
        await fetchUsers();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to approve user" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error approving user" });
    } finally {
      setActionLoading(null);
    }
  }

  // Reject User
  async function handleReject(userId: string) {
    if (!confirm("Are you sure you want to reject this user's registration request?")) {
      return;
    }
    setActionLoading(`reject-${userId}`);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: data.message });
        await fetchUsers();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to reject user" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error rejecting user" });
    } finally {
      setActionLoading(null);
    }
  }

  // Set Active / Deactivated Status
  async function handleSetStatus(userId: string, nextStatus: "ACTIVE" | "DEACTIVATED") {
    setActionLoading(`status-${userId}`);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_STATUS",
          userId,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: data.message });
        await fetchUsers();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to update status" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error updating status" });
    } finally {
      setActionLoading(null);
    }
  }

  // Change Role (Admin ↔ Employee)
  async function handleSetRole(userId: string, nextRole: "ADMIN" | "EMPLOYEE") {
    setActionLoading(`role-${userId}`);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_ROLE",
          userId,
          role: nextRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: data.message });
        await fetchUsers();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to update role" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error updating role" });
    } finally {
      setActionLoading(null);
    }
  }

  // Permanently Delete User
  async function handleDeleteUser() {
    if (!userToDelete) return;
    setDeletingUser(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/v1/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userToDelete.id }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: "success", text: data.message });
        setUserToDelete(null);
        await fetchUsers();
      } else {
        setStatusMsg({ type: "error", text: data.error || "Failed to delete user" });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error deleting user" });
    } finally {
      setDeletingUser(false);
    }
  }

  // Filtered users
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((u) => {
      // Search match
      const matchesSearch =
        !query ||
        u.email.toLowerCase().includes(query) ||
        (u.name && u.name.toLowerCase().includes(query)) ||
        u.id.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === "ACTIVE") return u.status === "ACTIVE";
      if (statusFilter === "DEACTIVATED") return u.status === "DEACTIVATED";
      if (statusFilter === "PENDING_APPROVAL") return u.status === "PENDING_APPROVAL";
      if (statusFilter === "REJECTED") return u.status === "REJECTED";

      return true;
    });
  }, [users, searchQuery, statusFilter]);

  // Aggregate stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
  const deactivatedUsers = users.filter((u) => u.status === "DEACTIVATED").length;
  const pendingUsers = users.filter((u) => u.status === "PENDING_APPROVAL");
  const rejectedUsers = users.filter((u) => u.status === "REJECTED").length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const employeeCount = users.filter((u) => u.role === "EMPLOYEE").length;

  return (
    <>
      <Header title="User Management & Role Permissions" />

      <div className="w-full space-y-4 sm:space-y-6">
        {/* Navigation Tabs under Settings */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 overflow-x-auto no-scrollbar">
          <Link
            href="/settings?tab=gateway"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800/60 transition shrink-0 whitespace-nowrap"
          >
            <Settings className="w-4 h-4" />
            <span>Gateway & System Settings</span>
          </Link>
          <Link
            href="/settings?tab=email"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800/60 transition shrink-0 whitespace-nowrap"
          >
            <Mail className="w-4 h-4" />
            <span>Email Gateway (SMTP)</span>
          </Link>
          <Link
            href="/settings/users"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-sm transition shrink-0 whitespace-nowrap"
          >
            <Users className="w-4 h-4" />
            <span>Users & Access Control</span>
          </Link>
        </div>

        {/* Public Sign-Up Lock & Policy Card */}
        <div className="p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                allowPublicSignup
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {allowPublicSignup ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--foreground)]">Sign-Up Screen Lock</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    allowPublicSignup
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {allowPublicSignup ? "REGISTRATIONS OPEN" : "LOCKED"}
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] max-w-xl leading-relaxed">
                {allowPublicSignup
                  ? "Self-registration is permitted. New accounts default to Employee with Pending Approval (they cannot log in until an Admin approves them)."
                  : "Public registration is completely locked. The /signup screen is disabled, preventing new users from registering."}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSignupLock}
            disabled={actionLoading === "toggle-lock"}
            className={`w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
              allowPublicSignup
                ? "bg-red-600/10 hover:bg-red-600/20 text-red-300 border border-red-500/30"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
            }`}
          >
            {actionLoading === "toggle-lock" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : allowPublicSignup ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Lock Sign-Up Screen</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Sign-Up Screen</span>
              </>
            )}
          </button>
        </div>

        {/* Pending Approval Banner */}
        {pendingUsers.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-300">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <span className="font-bold">{pendingUsers.length} user(s)</span> are awaiting administrator approval before they can log in.
              </div>
            </div>
            <button
              onClick={() => setStatusFilter("PENDING_APPROVAL")}
              className="w-full sm:w-auto text-center px-3 py-1.5 sm:py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-semibold transition shrink-0"
            >
              Filter Pending ({pendingUsers.length})
            </button>
          </div>
        )}

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
              statusMsg.type === "success"
                ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-200"
                : "bg-red-950/40 border-red-800/50 text-red-200"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[var(--muted-foreground)]">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{totalUsers}</div>
            <p className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] truncate">
              {adminCount} Admins • {employeeCount} Employees
            </p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[var(--muted-foreground)]">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Active Users</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">{activeUsers}</div>
            <p className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] truncate">Permitted to sign in</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[var(--muted-foreground)]">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Pending</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400">{pendingUsers.length}</div>
            <p className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] truncate">Awaiting authorization</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between text-[var(--muted-foreground)]">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Deactivated</span>
              <UserX className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-400">{deactivatedUsers}</div>
            <p className="text-[10px] sm:text-[11px] text-[var(--muted-foreground)] truncate">Access suspended</p>
          </div>
        </div>

        {/* User List Table Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-3.5 sm:p-5 border-b border-[var(--border)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, name, or UUID..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter users by status"
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500 transition"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active ({activeUsers})</option>
                <option value="PENDING_APPROVAL">Pending Approval ({pendingUsers.length})</option>
                <option value="DEACTIVATED">Deactivated ({deactivatedUsers})</option>
                <option value="REJECTED">Rejected ({rejectedUsers})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 justify-end sm:justify-start md:justify-end">
              <button
                onClick={fetchUsers}
                disabled={loading}
                title="Reload users"
                className="p-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800/60 transition disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
              </button>

              <button
                onClick={() => {
                  setInviteResult(null);
                  setShowInviteModal(true);
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Team Member</span>
              </button>
            </div>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1050px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] bg-slate-900/30">
                  <th className="py-3 px-4 font-semibold min-w-[200px]">User</th>
                  <th className="py-3 px-4 font-semibold min-w-[110px]">Role</th>
                  <th className="py-3 px-4 font-semibold min-w-[130px]">Account Status</th>
                  <th className="py-3 px-4 font-semibold min-w-[170px]">App Access</th>
                  <th className="py-3 px-4 font-semibold min-w-[130px]">Registered</th>
                  <th className="py-3 px-4 font-semibold min-w-[140px]">Last Sign In</th>
                  <th className="py-3 px-4 font-semibold text-right min-w-[360px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--muted-foreground)]">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Loading user directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[var(--muted-foreground)]">
                      {searchQuery || statusFilter !== "ALL"
                        ? "No users match your search and filter criteria."
                        : "No users found in database."}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const initials = (user.name || user.email)
                      .substring(0, 2)
                      .toUpperCase();
                    const isSelf = currentUserId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition">
                        {/* User Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[var(--foreground)] truncate max-w-[180px]">
                                  {user.name || user.email}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                                <span className="truncate max-w-[180px]">{user.email}</span>
                                <button
                                  onClick={() => handleCopy(user.id)}
                                  title="Copy UUID"
                                  className="text-slate-500 hover:text-white"
                                >
                                  {copiedId === user.id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                user.role === "ADMIN"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              {user.role}
                            </span>
                          </div>
                        </td>

                        {/* Account Status */}
                        <td className="py-3 px-4">
                          {user.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          ) : user.status === "PENDING_APPROVAL" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                              <ShieldAlert className="w-3 h-3" />
                              Pending Approval
                            </span>
                          ) : user.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                              <XCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <UserX className="w-3 h-3" />
                              Deactivated
                            </span>
                          )}
                        </td>

                        {/* App Access */}
                        <td className="py-3 px-4">
                          {user.role === "ADMIN" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <ShieldCheck className="w-3 h-3 text-amber-400" />
                              All Apps (Admin)
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <button
                                onClick={() => handleOpenAssignApps(user)}
                                title="Configure which application amounts this employee can view"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition"
                              >
                                <Layers className="w-3 h-3 text-blue-400" />
                                <span>
                                  {user.allowedAppIds && user.allowedAppIds.length > 0
                                    ? `${user.allowedAppIds.length} App${user.allowedAppIds.length > 1 ? "s" : ""} Allowed`
                                    : "Assign Apps"}
                                </span>
                              </button>
                              {user.allowedAppIds && user.allowedAppIds.length > 0 ? (
                                <span className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[150px]">
                                  {availableApps
                                    .filter((a) => user.allowedAppIds?.includes(a.id))
                                    .map((a) => a.appCode)
                                    .slice(0, 2)
                                    .join(", ")}
                                  {user.allowedAppIds.length > 2 ? ` +${user.allowedAppIds.length - 2} more` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">None assigned</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Created Date */}
                        <td className="py-3 px-4 text-[var(--muted-foreground)] whitespace-nowrap">
                          {formatDate(user.createdAt)}
                        </td>

                        {/* Last Sign In */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {user.lastSignInAt ? (
                            <div className="flex items-center gap-1.5 text-[var(--foreground)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span>{formatDate(user.lastSignInAt)}</span>
                            </div>
                          ) : (
                            <span className="text-[var(--muted-foreground)] italic">Never</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {/* PENDING APPROVAL ACTIONS */}
                            {user.status === "PENDING_APPROVAL" ? (
                              <>
                                <button
                                  onClick={() => handleApprove(user.id, "EMPLOYEE")}
                                  disabled={actionLoading === `approve-${user.id}`}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition shadow flex items-center gap-1 shrink-0"
                                >
                                  {actionLoading === `approve-${user.id}` ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Approve (Employee)</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleApprove(user.id, "ADMIN")}
                                  disabled={actionLoading === `approve-${user.id}`}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition shadow flex items-center gap-1 shrink-0"
                                >
                                  <span>Approve (Admin)</span>
                                </button>
                                <button
                                  onClick={() => handleReject(user.id)}
                                  disabled={actionLoading === `reject-${user.id}`}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-[11px] transition shadow-sm flex items-center gap-1 shrink-0"
                                >
                                  {actionLoading === `reject-${user.id}` ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <X className="w-3 h-3" />
                                      <span>Reject</span>
                                    </>
                                  )}
                                </button>
                                {!isSelf && (
                                  <button
                                    onClick={() => setUserToDelete(user)}
                                    title="Permanently Delete User"
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : user.status === "REJECTED" ? (
                              <>
                                <button
                                  onClick={() => handleApprove(user.id, "EMPLOYEE")}
                                  disabled={actionLoading === `approve-${user.id}`}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition shadow flex items-center gap-1 shrink-0"
                                >
                                  {actionLoading === `approve-${user.id}` ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Re-evaluate & Approve</span>
                                    </>
                                  )}
                                </button>
                                {!isSelf && (
                                  <button
                                    onClick={() => setUserToDelete(user)}
                                    title="Permanently Delete User"
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {/* ASSIGN APPS QUICK BUTTON FOR EMPLOYEES */}
                                {user.role === "EMPLOYEE" && (
                                  <button
                                    onClick={() => handleOpenAssignApps(user)}
                                    title="Assign allowed applications"
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-[11px] font-medium transition flex items-center gap-1 shrink-0"
                                  >
                                    <Layers className="w-3 h-3 text-blue-400" />
                                    <span>Apps</span>
                                  </button>
                                )}

                                {/* ROLE TOGGLE BUTTON */}
                                {!isSelf && (
                                  <button
                                    onClick={() =>
                                      handleSetRole(user.id, user.role === "ADMIN" ? "EMPLOYEE" : "ADMIN")
                                    }
                                    disabled={actionLoading === `role-${user.id}`}
                                    title={`Switch role to ${user.role === "ADMIN" ? "Employee" : "Admin"}`}
                                    className="px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800 transition text-[11px] shrink-0"
                                  >
                                    {actionLoading === `role-${user.id}` ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : user.role === "ADMIN" ? (
                                      "Demote to Employee"
                                    ) : (
                                      "Promote to Admin"
                                    )}
                                  </button>
                                )}

                                {/* ACTIVATE / DEACTIVATE BUTTON */}
                                {!isSelf ? (
                                  <>
                                    {user.status === "ACTIVE" ? (
                                      <button
                                        onClick={() => handleSetStatus(user.id, "DEACTIVATED")}
                                        disabled={actionLoading === `status-${user.id}`}
                                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium text-[11px] transition flex items-center gap-1 shrink-0"
                                      >
                                        {actionLoading === `status-${user.id}` ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>
                                            <UserX className="w-3 h-3" />
                                            <span>Deactivate</span>
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleSetStatus(user.id, "ACTIVE")}
                                        disabled={actionLoading === `status-${user.id}`}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium text-[11px] transition flex items-center gap-1 shrink-0"
                                      >
                                        {actionLoading === `status-${user.id}` ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>
                                            <UserCheck className="w-3 h-3" />
                                            <span>Activate</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {/* PERMANENT DELETE BUTTON */}
                                    <button
                                      onClick={() => setUserToDelete(user)}
                                      title="Permanently Delete User"
                                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-500 italic pr-2">Your Account</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View (< 768px) */}
          <div className="block md:hidden divide-y divide-[var(--border)]">
            {loading ? (
              <div className="py-12 text-center text-[var(--muted-foreground)]">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Loading user directory...</span>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 text-center text-[var(--muted-foreground)] text-xs">
                {searchQuery || statusFilter !== "ALL"
                  ? "No users match your search and filter criteria."
                  : "No users found in database."}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const initials = (user.name || user.email)
                  .substring(0, 2)
                  .toUpperCase();
                const isSelf = currentUserId === user.id;

                return (
                  <div key={user.id} className="p-4 space-y-3 hover:bg-slate-800/20 transition">
                    {/* Top Row: User Avatar, Name/Email, Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-[var(--foreground)] truncate">
                              {user.name || user.email}
                            </span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                            <span className="truncate max-w-[180px]">{user.email}</span>
                            <button
                              onClick={() => handleCopy(user.id)}
                              title="Copy UUID"
                              className="text-slate-500 hover:text-white"
                            >
                              {copiedId === user.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Role Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          user.role === "ADMIN"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </div>

                    {/* Metadata & Status Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/50">
                      <div>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Status</span>
                        {user.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : user.status === "PENDING_APPROVAL" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 animate-pulse">
                            <ShieldAlert className="w-3 h-3" /> Pending Approval
                          </span>
                        ) : user.status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400">
                            <UserX className="w-3 h-3" /> Deactivated
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">App Permissions</span>
                        {user.role === "ADMIN" ? (
                          <span className="text-[11px] font-semibold text-amber-300">All Apps</span>
                        ) : (
                          <button
                            onClick={() => handleOpenAssignApps(user)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition"
                          >
                            <Layers className="w-3 h-3" />
                            <span>
                              {user.allowedAppIds && user.allowedAppIds.length > 0
                                ? `${user.allowedAppIds.length} App${user.allowedAppIds.length > 1 ? "s" : ""} Allowed`
                                : "Assign Apps"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] pt-0.5">
                      <span>Registered: {formatDate(user.createdAt)}</span>
                      <span>Last Sign In: {user.lastSignInAt ? formatDate(user.lastSignInAt) : "Never"}</span>
                    </div>

                    {/* Touch-Friendly Action Buttons */}
                    <div className="pt-2 border-t border-slate-800/60">
                      {user.status === "PENDING_APPROVAL" ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              onClick={() => handleApprove(user.id, "EMPLOYEE")}
                              disabled={actionLoading === `approve-${user.id}`}
                              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow flex items-center justify-center gap-1.5"
                            >
                              {actionLoading === `approve-${user.id}` ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve (Employee)</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleApprove(user.id, "ADMIN")}
                              disabled={actionLoading === `approve-${user.id}`}
                              className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition shadow flex items-center justify-center gap-1.5"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Approve (Admin)</span>
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              disabled={actionLoading === `reject-${user.id}`}
                              className="w-full py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs transition shadow flex items-center justify-center gap-1.5"
                            >
                              {actionLoading === `reject-${user.id}` ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject Request</span>
                                </>
                              )}
                            </button>
                          </div>
                          {!isSelf && (
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="w-full py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Permanently Delete User</span>
                            </button>
                          )}
                        </div>
                      ) : user.status === "REJECTED" ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <button
                            onClick={() => handleApprove(user.id, "EMPLOYEE")}
                            disabled={actionLoading === `approve-${user.id}`}
                            className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === `approve-${user.id}` ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Re-evaluate & Approve</span>
                              </>
                            )}
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="w-full sm:w-auto py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {user.role === "EMPLOYEE" && (
                            <button
                              onClick={() => handleOpenAssignApps(user)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Assign Apps</span>
                            </button>
                          )}

                          {!isSelf && (
                            <button
                              onClick={() =>
                                handleSetRole(user.id, user.role === "ADMIN" ? "EMPLOYEE" : "ADMIN")
                              }
                              disabled={actionLoading === `role-${user.id}`}
                              className="flex-1 py-1.5 px-3 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-white hover:bg-slate-800 transition text-xs flex items-center justify-center gap-1"
                            >
                              {actionLoading === `role-${user.id}` ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : user.role === "ADMIN" ? (
                                "Demote to Employee"
                              ) : (
                                "Promote to Admin"
                              )}
                            </button>
                          )}

                          {!isSelf && (
                            <>
                              {user.status === "ACTIVE" ? (
                                <button
                                  onClick={() => handleSetStatus(user.id, "DEACTIVATED")}
                                  disabled={actionLoading === `status-${user.id}`}
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition flex items-center justify-center gap-1"
                                >
                                  {actionLoading === `status-${user.id}` ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Deactivate</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSetStatus(user.id, "ACTIVE")}
                                  disabled={actionLoading === `status-${user.id}`}
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition flex items-center justify-center gap-1"
                                >
                                  {actionLoading === `status-${user.id}` ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Activate</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* PERMANENT DELETE BUTTON ON MOBILE */}
                              <button
                                onClick={() => setUserToDelete(user)}
                                className="py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition flex items-center justify-center gap-1 shrink-0"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Invite / Add User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm text-white">Invite Team Member</h3>
                </div>
                <button
                  onClick={handleCloseInviteModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  ✕
                </button>
              </div>

              {inviteResult ? (
                <div className="space-y-4">
                  {inviteResult.emailSent ? (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Invitation Email Dispatched!</p>
                        <p className="text-[11px] text-emerald-400/90 mt-0.5 leading-relaxed">
                          An invitation email has been sent directly to <strong className="text-white">{inviteResult.email}</strong>. They can click the link in their inbox to activate their account as <strong>{inviteResult.role}</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                      <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Invitation Link Created</p>
                        <p className="text-[11px] text-amber-400/90 mt-0.5 leading-relaxed">
                          {inviteResult.emailStatusMessage || `Share this link with ${inviteResult.email} to register as ${inviteResult.role}.`}
                        </p>
                        <Link
                          href="/settings"
                          className="inline-block mt-2 text-[10px] text-blue-400 hover:underline font-medium"
                        >
                          Configure SMTP in Settings to send directly to inboxes →
                        </Link>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300">Shareable Invite Link (Backup):</label>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.inviteUrl}
                        className="bg-transparent text-xs text-blue-300 font-mono flex-1 outline-none select-all"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.inviteUrl);
                          setCopiedInviteUrl(true);
                          setTimeout(() => setCopiedInviteUrl(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition shrink-0"
                      >
                        {copiedInviteUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedInviteUrl ? "Copied!" : "Copy Link"}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">This invitation link will expire in 7 days.</p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleCloseInviteModal}
                      className="w-full sm:w-auto px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Invitee Email Address <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="colleague@yourcompany.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Assigned Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setInviteRole("EMPLOYEE")}
                        className={`p-3 rounded-xl border text-left transition ${
                          inviteRole === "EMPLOYEE"
                            ? "bg-blue-600/15 border-blue-500 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span>Employee</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          Restricted access to authorized applications only.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInviteRole("ADMIN")}
                        className={`p-3 rounded-xl border text-left transition ${
                          inviteRole === "ADMIN"
                            ? "bg-purple-600/15 border-purple-500 text-white"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                          <span>Administrator</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          Full hub access, credentials management & user controls.
                        </p>
                      </button>
                    </div>
                  </div>

                  {inviteRole === "EMPLOYEE" && (
                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 font-medium text-[11px]">
                          Authorized Applications ({inviteAllowedAppIds.length} of {availableApps.length})
                        </label>
                        <div className="flex items-center gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setInviteAllowedAppIds(availableApps.map((a) => a.id))}
                            className="text-blue-400 hover:underline"
                          >
                            Select All
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={() => setInviteAllowedAppIds([])}
                            className="text-slate-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {availableApps.length === 0 ? (
                        <p className="text-slate-500 text-[11px] italic">No active applications registered yet.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                          {availableApps.map((app) => {
                            const isSelected = inviteAllowedAppIds.includes(app.id);
                            return (
                              <button
                                key={app.id}
                                type="button"
                                onClick={() => handleToggleInviteApp(app.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition ${
                                  isSelected
                                    ? "bg-blue-950/40 border-blue-500/40 text-white"
                                    : "bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                <div>
                                  <span className="font-mono text-[11px] font-semibold text-blue-300 mr-2">
                                    {app.appCode}
                                  </span>
                                  <span className="text-[11px]">{app.appName}</span>
                                </div>
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleCloseInviteModal}
                      className="px-3.5 py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting || !inviteEmail.trim()}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {inviting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Create Invitation Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Assign Allowed Applications Modal */}
        {assignModalUser && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white truncate">Assign Allowed Applications</h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      Configure which application metrics & orders this employee can view
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAssignModalUser(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{assignModalUser.email}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {assignModalUser.name || "Employee"} • Role:{" "}
                    <span className="text-blue-400 font-semibold">{assignModalUser.role}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 shrink-0">
                  {selectedAppIds.length} of {availableApps.length} Permitted
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-slate-300">Available Applications</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllApps}
                      className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllApps}
                      className="text-[11px] font-medium text-slate-400 hover:text-white transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {availableApps.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                      No active applications found in the system.
                    </div>
                  ) : (
                    availableApps.map((app) => {
                      const isSelected = selectedAppIds.includes(app.id);
                      return (
                        <div
                          key={app.id}
                          onClick={() => handleToggleAppSelection(app.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between select-none ${
                            isSelected
                              ? "bg-blue-950/30 border-blue-600/50 shadow-sm"
                              : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition ${
                                isSelected
                                  ? "bg-blue-600 text-white"
                                  : "border border-slate-700 text-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white tracking-wide truncate">
                                  {app.appCode}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">{app.appName}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  When this employee logs into the dashboard, transactions, volumes, charts, and orders will be scoped exclusively to their selected application(s).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignModalUser(null)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllowedApps}
                  disabled={savingApps}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingApps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Permissions...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save App Permissions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5 text-red-400">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--foreground)]">Permanently Delete User</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">Irreversible action</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !deletingUser && setUserToDelete(null)}
                  disabled={deletingUser}
                  className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[var(--foreground)] leading-relaxed">
                  Are you sure you want to permanently delete the account for:
                </p>

                <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[var(--foreground)]">
                      {userToDelete.name || "No Display Name"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {userToDelete.role}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-red-400 truncate">{userToDelete.email}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono truncate">ID: {userToDelete.id}</p>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    This user will immediately lose all access, their auth credentials will be erased, and they will no longer be able to log in.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={deletingUser}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deletingUser}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {deletingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting User...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete User Account</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
