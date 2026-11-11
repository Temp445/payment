"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import {
  Sparkles,
  Plus,
  Shield,
  Layers,
  Calendar,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Power,
  AlertTriangle,
} from "lucide-react";

export default function SubscriptionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "plans">("subscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [appFilter, setAppFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "offer" | "product" | "subscription";
    id: string;
    name: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create Form states
  const [appId, setAppId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [tier, setTier] = useState("Professional");
  const [tierLevel, setTierLevel] = useState(2);
  const [offerPrice, setOfferPrice] = useState(5000);
  const [offerPeriod, setOfferPeriod] = useState(1);
  const [offerPeriodType, setOfferPeriodType] = useState<"month" | "year" | "day">("month");
  const [userLimit, setUserLimit] = useState(5);
  const [featuresStr, setFeaturesStr] = useState("crm_leads, whatsapp_inbox, export_pdf");

  // Edit Form states
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState("");
  const [editTierLevel, setEditTierLevel] = useState(1);
  const [editOfferPrice, setEditOfferPrice] = useState(0);
  const [editOfferPeriod, setEditOfferPeriod] = useState(1);
  const [editOfferPeriodType, setEditOfferPeriodType] = useState<"month" | "year" | "day">("month");
  const [editUserLimit, setEditUserLimit] = useState(5);
  const [editFeaturesStr, setEditFeaturesStr] = useState("");
  const [editOfferIsActive, setEditOfferIsActive] = useState(true);
  const [editAppName, setEditAppName] = useState("");
  const [editProductCode, setEditProductCode] = useState("");

  const authHeader = `Bearer ${process.env.NEXT_PUBLIC_ADMIN_KEY || "admin_secret_hub_master_key_change_me"}`;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch subscriptions data and apps in parallel
      const [subRes, appsRes] = await Promise.all([
        fetch("/api/v1/subscriptions", { headers: { Authorization: authHeader } }),
        fetch("/api/v1/apps", { headers: { Authorization: authHeader } }),
      ]);

      const subJson = await subRes.json();
      const appsJson = await appsRes.json();

      const loadedApps = appsJson.apps || subJson.apps || [];
      setData({
        ...subJson,
        apps: loadedApps,
      });

      if (loadedApps.length > 0 && !appId) {
        setAppId(loadedApps[0].id);
        setProductCode(loadedApps[0].appCode);
        setProductName(loadedApps[0].appName);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const features = featuresStr
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          applicationId: appId,
          tier,
          tierLevel: Number(tierLevel),
          offerPrice: Number(offerPrice),
          offerPeriod: Number(offerPeriod),
          offerPeriodType,
          userLimit: Number(userLimit),
          features,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create plan");
      }

      setShowCreateModal(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEditModal(prod: any, offer: any) {
    setEditingOfferId(offer.id);
    setEditTier(offer.tier);
    setEditTierLevel(offer.tierLevel || 1);
    setEditOfferPrice(offer.offerPrice);
    setEditOfferPeriod(offer.offerPeriod || 1);
    setEditOfferPeriodType(offer.offerPeriodType || "month");
    setEditUserLimit(offer.userLimit || 5);
    setEditFeaturesStr((offer.tierLimits?.features || []).join(", "));
    setEditOfferIsActive(offer.offerIsActive !== false);
    setEditAppName(prod.productName || prod.application?.appName);
    setEditProductCode(prod.productCode);
    setFormError(null);
    setShowEditModal(true);
  }

  async function handleUpdatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOfferId) return;
    setSubmitting(true);
    setFormError(null);

    const features = editFeaturesStr
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/v1/subscriptions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          offerId: editingOfferId,
          tier: editTier,
          tierLevel: Number(editTierLevel),
          offerPrice: Number(editOfferPrice),
          offerPeriod: Number(editOfferPeriod),
          offerPeriodType: editOfferPeriodType,
          userLimit: Number(editUserLimit),
          features,
          offerIsActive: editOfferIsActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update plan");
      }

      setShowEditModal(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);

    try {
      let queryParam = "";
      if (deleteConfirm.type === "offer") queryParam = `offerId=${deleteConfirm.id}`;
      else if (deleteConfirm.type === "product") queryParam = `productId=${deleteConfirm.id}`;
      else if (deleteConfirm.type === "subscription") queryParam = `subscriptionId=${deleteConfirm.id}`;

      const res = await fetch(`/api/v1/subscriptions?${queryParam}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete item");
      }

      setDeleteConfirm(null);
      await fetchData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleSubscriptionStatus(subId: string, currentStatus: boolean) {
    try {
      const res = await fetch("/api/v1/subscriptions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          subscriptionId: subId,
          licenseIsActive: !currentStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update license status");
      }

      await fetchData();
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
    }
  }

  const subscriptions = data?.subscriptions || [];
  const products = data?.products || [];
  const apps = data?.apps || [];
  const stats = data?.stats || { total: 0, active: 0, expired: 0, productsCount: 0 };

  const filteredSubs = subscriptions.filter((s: any) => {
    const matchesApp = appFilter === "ALL" || s.app_code === appFilter;
    const matchesSearch =
      searchQuery === "" ||
      s.organization_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.app_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesApp && matchesSearch;
  });

  return (
    <>
      <Header title="SaaS Subscriptions & Entitlements Hub" />

      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--foreground)]">Subscriptions Management</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Centralized licensing, multi-app tier setup, and automated expiration monitoring for 20+ tenant apps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (apps.length > 0) {
                  const targetApp = apps.find((a: any) => a.id === appId) || apps[0];
                  setAppId(targetApp.id);
                  setProductCode(targetApp.appCode);
                  setProductName(targetApp.appName);
                }
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Setup New Plan</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-1">
            <div className="flex justify-between items-center text-xs text-[var(--muted-foreground)]">
              <span>Active Licenses</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)] font-mono">{stats.active}</div>
            <div className="text-[10px] text-emerald-400">Access currently unlocked</div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-1">
            <div className="flex justify-between items-center text-xs text-[var(--muted-foreground)]">
              <span>Expired / Cutoff</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)] font-mono">{stats.expired}</div>
            <div className="text-[10px] text-rose-400">Service automatically stopped</div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-1">
            <div className="flex justify-between items-center text-xs text-[var(--muted-foreground)]">
              <span>Configured Plans</span>
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)] font-mono">{stats.productsCount}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Products & pricing tiers</div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-1">
            <div className="flex justify-between items-center text-xs text-[var(--muted-foreground)]">
              <span>Connected Apps</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)] font-mono">{apps.length}</div>
            <div className="text-[10px] text-[var(--muted-foreground)]">Tenant applications managed</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-4 border-b border-[var(--border)] text-xs font-semibold pb-1">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`pb-2 px-1 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "subscriptions"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-[var(--muted-foreground)] hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active Licenses Ledger ({subscriptions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`pb-2 px-1 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === "plans"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-[var(--muted-foreground)] hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Products & Pricing Setup ({products.length})</span>
          </button>
        </div>

        {/* TAB 1: ACTIVE LICENSES LEDGER */}
        {activeTab === "subscriptions" && (
          <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-4 shadow-sm">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Search organization or app..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg bg-black/30 border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="text-xs p-2 rounded-lg bg-black/30 border border-[var(--border)] text-[var(--foreground)]"
                >
                  <option value="ALL">All Applications</option>
                  {apps.map((a: any) => (
                    <option key={a.id} value={a.appCode}>
                      {a.appName} ({a.appCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-3 font-semibold">Application</th>
                    <th className="pb-3 font-semibold">Organization ID</th>
                    <th className="pb-3 font-semibold">Plan Tier</th>
                    <th className="pb-3 font-semibold">Valid Period</th>
                    <th className="pb-3 font-semibold">Days Remaining</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-mono">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)] font-sans">
                        No subscriptions found. Simulate a payment or setup a plan to activate licenses.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40 font-sans">
                        <td className="py-3">
                          <span className="font-semibold text-blue-400">{sub.app_code}</span>
                          <div className="text-[10px] text-[var(--muted-foreground)]">{sub.product_name}</div>
                        </td>
                        <td className="py-3 font-mono text-xs text-[var(--foreground)] font-medium">
                          {sub.organization_id}
                        </td>
                        <td className="py-3">
                          <span className="font-semibold text-slate-200">{sub.tier}</span>
                          <div className="text-[10px] text-[var(--muted-foreground)]">₹{sub.price} • {sub.user_limit} users</div>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-[var(--muted-foreground)]">
                          {sub.starts_on} <span className="text-slate-600">to</span> {sub.ends_on}
                        </td>
                        <td className="py-3">
                          {sub.is_active ? (
                            <span className="font-mono text-xs font-bold text-emerald-400">
                              {sub.days_remaining} days left
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-rose-400">0 days (Expired)</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge variant={sub.is_active ? "success" : "danger"}>
                            {sub.is_active ? "ACTIVE" : "EXPIRED"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleSubscriptionStatus(sub.id, sub.is_active)}
                              title={sub.is_active ? "Deactivate License Access" : "Reactivate License Access"}
                              className={`p-1.5 rounded transition ${
                                sub.is_active
                                  ? "text-amber-400 hover:bg-amber-500/10"
                                  : "text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "subscription",
                                  id: sub.id,
                                  name: `License for ${sub.organization_id} (${sub.app_code})`,
                                })
                              }
                              title="Delete License Record"
                              className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS & PRICING SETUP */}
        {activeTab === "plans" && (
          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-3">
                <Sparkles className="w-8 h-8 text-blue-400 mx-auto" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">No Products or Plans Configured</h3>
                <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
                  Create your first subscription tier (e.g. Starter, Pro, Enterprise) for your tenant applications.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                >
                  Create Plan Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((prod: any) => (
                  <div
                    key={prod.id}
                    className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Product Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {prod.application?.appCode}
                          </span>
                          <h4 className="font-bold text-sm text-[var(--foreground)] mt-1">{prod.productName}</h4>
                          <p className="text-[11px] text-[var(--muted-foreground)] font-mono">{prod.productCode}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={prod.productIsActive ? "success" : "neutral"}>
                            {prod.productIsActive ? "ACTIVE" : "INACTIVE"}
                          </Badge>
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                type: "product",
                                id: prod.id,
                                name: `${prod.productName} and all its tiers`,
                              })
                            }
                            title="Delete entire product and its plans"
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Pricing Tiers List */}
                      <div className="space-y-2.5 pt-2 border-t border-[var(--border)]">
                        <div className="flex justify-between items-center text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          <span>Pricing Tiers ({prod.subscriptionOffers?.length || 0})</span>
                        </div>

                        {prod.subscriptionOffers?.length === 0 ? (
                          <div className="p-4 rounded-lg bg-black/10 border border-dashed border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
                            No tiers added yet. Click "+ Add Tier" below.
                          </div>
                        ) : (
                          prod.subscriptionOffers?.map((offer: any) => (
                            <div
                              key={offer.id}
                              className="p-3 rounded-lg bg-black/25 border border-[var(--border)] space-y-2 hover:border-slate-700 transition"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-200">{offer.tier}</span>
                                  {!offer.offerIsActive && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                                      INACTIVE
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold text-emerald-400">
                                  ₹{offer.offerPrice} / {offer.offerPeriod} {offer.offerPeriodType}
                                </span>
                              </div>

                              <div className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                <span>Up to {offer.userLimit} users</span>
                              </div>

                              {offer.tierLimits?.features?.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {offer.tierLimits.features.map((feat: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                    >
                                      {feat}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Edit & Delete Action Buttons */}
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                                <button
                                  onClick={() => openEditModal(prod, offer)}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 transition"
                                >
                                  <Edit2 className="w-3 h-3 text-blue-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteConfirm({
                                      type: "offer",
                                      id: offer.id,
                                      name: `${offer.tier} Tier (₹${offer.offerPrice})`,
                                    })
                                  }
                                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 transition"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-400" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add Tier Shortcut */}
                    <div className="pt-3 border-t border-[var(--border)]">
                      <button
                        onClick={() => {
                          setAppId(prod.applicationId);
                          setProductCode(prod.productCode);
                          setProductName(prod.productName);
                          setShowCreateModal(true);
                        }}
                        className="w-full py-2 rounded-lg border border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5 text-slate-400 hover:text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Pricing Tier</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: SETUP NEW PLAN */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Setup New Subscription Plan</span>
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Application</label>
                  <select
                    value={appId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setAppId(selectedId);
                      const selectedApp = apps.find((a: any) => a.id === selectedId);
                      if (selectedApp) {
                        setProductCode(selectedApp.appCode);
                        setProductName(selectedApp.appName);
                      }
                    }}
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    required
                  >
                    {apps.length === 0 ? (
                      <option value="">Loading applications...</option>
                    ) : (
                      apps.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.appName} ({a.appCode})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Auto-derived Product Details from Selected Target Application */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Target Product Code (Auto-linked)</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {productCode || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Product Display Name</span>
                    <span className="text-[11px] font-semibold text-slate-200">
                      {productName || "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-700/40">
                    🔒 Automatically linked to the selected target application namespace. Custom product codes cannot be created arbitrarily.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tier Name</label>
                    <input
                      type="text"
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                      placeholder="Starter, Pro, Enterprise"
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Price (₹ INR)</label>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Period</label>
                    <input
                      type="number"
                      value={offerPeriod}
                      onChange={(e) => setOfferPeriod(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Cycle</label>
                    <select
                      value={offerPeriodType}
                      onChange={(e: any) => setOfferPeriodType(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                      <option value="day">Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">User Limit</label>
                    <input
                      type="number"
                      value={userLimit}
                      onChange={(e) => setUserLimit(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Features / Entitlements (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={featuresStr}
                    onChange={(e) => setFeaturesStr(e.target.value)}
                    placeholder="whatsapp_inbox, export_pdf, ai_leads"
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Client apps can check feature flags dynamically with hasFeature("whatsapp_inbox").
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Create Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: EDIT PLAN TIER */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-[var(--border)] shadow-2xl space-y-5">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Edit Subscription Plan Tier</span>
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleUpdatePlan} className="space-y-4 text-xs">
                {/* Linked Target Product Header */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Application & Product</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {editProductCode}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{editAppName}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tier Name</label>
                    <input
                      type="text"
                      value={editTier}
                      onChange={(e) => setEditTier(e.target.value)}
                      placeholder="Starter, Pro, Enterprise"
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Price (₹ INR)</label>
                    <input
                      type="number"
                      value={editOfferPrice}
                      onChange={(e) => setEditOfferPrice(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Period</label>
                    <input
                      type="number"
                      value={editOfferPeriod}
                      onChange={(e) => setEditOfferPeriod(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Cycle</label>
                    <select
                      value={editOfferPeriodType}
                      onChange={(e: any) => setEditOfferPeriodType(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    >
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                      <option value="day">Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">User Limit</label>
                    <input
                      type="number"
                      value={editUserLimit}
                      onChange={(e) => setEditUserLimit(Number(e.target.value))}
                      className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Features / Entitlements (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={editFeaturesStr}
                    onChange={(e) => setEditFeaturesStr(e.target.value)}
                    placeholder="whatsapp_inbox, export_pdf, ai_leads"
                    className="w-full p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div>
                    <span className="font-semibold text-slate-200">Plan Tier Active Status</span>
                    <p className="text-[10px] text-slate-400">Inactive tiers are hidden from new customer checkouts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditOfferIsActive(!editOfferIsActive)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      editOfferIsActive
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {editOfferIsActive ? "ACTIVE" : "INACTIVE"}
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: DELETE CONFIRMATION */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Confirm Permanent Delete</h3>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                Are you sure you want to permanently delete <span className="font-semibold text-white">"{deleteConfirm.name}"</span>?
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleting ? "Deleting..." : "Delete Permanently"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
