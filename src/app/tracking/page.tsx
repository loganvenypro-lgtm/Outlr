"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  Folder, 
  TrackedChannel, 
  ChannelAlert, 
  TrackingOverviewResponse 
} from "@/types/tracking";
import {
  Users,
  FolderPlus,
  Folder as FolderIcon,
  Bell,
  BellRing,
  Plus,
  Flame,
  Search,
  ExternalLink,
  Trash2,
  Edit3,
  Check,
  CheckCheck,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Tag,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Zap,
  Play
} from "lucide-react";

export default function ChannelTrackingPage() {
  const router = useRouter();

  // State
  const [data, setData] = useState<TrackingOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"channels" | "alerts" | "performers">("channels");

  // Add channel modal/form
  const [showAddModal, setShowAddModal] = useState(false);
  const [channelQuery, setChannelQuery] = useState("");
  const [targetFolderId, setTargetFolderId] = useState<string>("");
  const [channelNotes, setChannelNotes] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Create folder modal/form
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("blue");
  const [folderLoading, setFolderLoading] = useState(false);

  // Discord test status
  const [discordStatus, setDiscordStatus] = useState<string | null>(null);
  const [testingDiscord, setTestingDiscord] = useState(false);

  const handleTestDiscord = async () => {
    setTestingDiscord(true);
    setDiscordStatus(null);
    try {
      // Envoi d'une alerte réelle vers le webhook Discord configuré
      const res = await fetch("/api/pipeline/test-discord");
      const json = await res.json();
      if (json.success) {
        setDiscordStatus("✅ Envoyé à Discord !");
      } else {
        setDiscordStatus("❌ Erreur");
      }
    } catch {
      setDiscordStatus("❌ Erreur réseau");
    } finally {
      setTestingDiscord(false);
      setTimeout(() => setDiscordStatus(null), 4000);
    }
  };

  // Fetch tracking overview
  const fetchTrackingData = async (sync = false) => {
    if (sync) setSyncing(true);
    else setLoading(true);

    try {
      const url = `/api/youtube/tracking?folderId=${selectedFolderId}${sync ? "&sync=true" : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Error loading tracking data:", err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchTrackingData(false);

    // Periodically sync new uploads every 60 seconds automatically
    const syncInterval = setInterval(() => {
      fetchTrackingData(true);
    }, 60000);

    return () => clearInterval(syncInterval);
  }, [selectedFolderId]);

  // Handle Add Channel
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelQuery.trim()) return;

    setAddLoading(true);
    setAddError(null);

    try {
      const res = await fetch("/api/youtube/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track_channel",
          query: channelQuery.trim(),
          folderId: targetFolderId || undefined,
          notes: channelNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Impossible d'ajouter cette chaîne");
      }

      setChannelQuery("");
      setChannelNotes("");
      setShowAddModal(false);
      fetchTrackingData(true);
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setFolderLoading(true);
    try {
      const res = await fetch("/api/youtube/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          name: folderName.trim(),
          color: folderColor,
        }),
      });

      if (res.ok) {
        setFolderName("");
        setShowFolderModal(false);
        fetchTrackingData(false);
      }
    } finally {
      setFolderLoading(false);
    }
  };

  // Handle Delete Tracked Channel
  const handleUntrack = async (id: string) => {
    if (!confirm("Voulez-vous vraiment cesser de suivre cette chaîne ?")) return;
    try {
      await fetch(`/api/youtube/tracking?channelId=${id}`, { method: "DELETE" });
      fetchTrackingData(false);
    } catch {}
  };

  // Handle Mark Alert as Read
  const handleMarkRead = async (alertId: string) => {
    try {
      await fetch("/api/youtube/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", alertId }),
      });
      if (data) {
        if (alertId === "all") {
          setData({
            ...data,
            alerts: data.alerts.map((a) => ({ ...a, isRead: true })),
            stats: { ...data.stats, unreadAlertsCount: 0 },
          });
        } else {
          setData({
            ...data,
            alerts: data.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)),
            stats: { ...data.stats, unreadAlertsCount: Math.max(0, data.stats.unreadAlertsCount - 1) },
          });
        }
      }
    } catch {}
  };

  const getFolderColorClass = (color?: string) => {
    switch (color) {
      case "purple":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "emerald":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "amber":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "rose":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="min-h-full bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          title="Channel Tracking & Surveillance Concurrents"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Channel Tracking", href: "/tracking" },
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Banner and Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <BellRing className="w-3.5 h-3.5" />
                <span>Radar Concurrentiel & Alerte Vidéos Virales</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Surveillez vos concurrents et détectez leurs breakouts.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Organisez vos chaînes cibles dans des dossiers thématiques, soyez alerté dès qu'une vidéo surperforme et analysez les formats qui percent.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchTrackingData(true)}
                disabled={syncing}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-blue-400" : ""}`} />
                <span>{syncing ? "Scan des vidéos..." : "Synchroniser"}</span>
              </button>

              <button
                type="button"
                onClick={handleTestDiscord}
                disabled={testingDiscord}
                className="px-3.5 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                title="Déclenche l'envoi d'une alerte réelle vers votre Webhook Discord"
              >
                <Zap className={`w-3.5 h-3.5 text-purple-400 ${testingDiscord ? "animate-spin" : ""}`} />
                <span>{testingDiscord ? "Envoi Discord..." : discordStatus || "🔔 Tester Discord"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFolderModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Nouveau Dossier</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une chaîne</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Bar */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Chaînes Surveillées</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{data.stats.totalTrackedChannels}</div>
                <span className="text-[10px] text-slate-500">Scannées en temps réel</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <FolderIcon className="w-4 h-4 text-purple-400" />
                  <span>Dossiers Thématiques</span>
                </div>
                <div className="text-2xl font-black text-purple-400">{data.stats.activeFoldersCount}</div>
                <span className="text-[10px] text-slate-500">Pour segmenter vos niches</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Alertes Détectées</span>
                </div>
                <div className="text-2xl font-black text-amber-400">{data.stats.totalAlertsCount}</div>
                <span className="text-[10px] text-slate-500">{data.stats.unreadAlertsCount} non lues</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Vidéos Breakout Récentes</span>
                </div>
                <div className="text-2xl font-black text-rose-400">{data.recentPerformers.length}</div>
                <span className="text-[10px] text-slate-500">Surperformances &gt; 2.5x</span>
              </div>
            </div>
          )}

          {/* Folders Filter Tabs */}
          {data && data.folders.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedFolderId("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 border ${
                  selectedFolderId === "all"
                    ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                    : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200"
                }`}
              >
                <span>Toutes les chaînes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-mono">
                  {data.channels.length}
                </span>
              </button>

              {data.folders.map((f) => {
                const count = data.channels.filter((c) => c.folderId === f.id).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 border ${
                      selectedFolderId === f.id
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                        : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200"
                    }`}
                  >
                    <FolderIcon className="w-3.5 h-3.5" />
                    <span>{f.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation View Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("channels")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "channels"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Chaînes Suivies ({data?.channels.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "alerts"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>
                  Alertes & Détections {data?.stats.unreadAlertsCount ? `(${data.stats.unreadAlertsCount})` : ""}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("performers")}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "performers"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Breakouts Récents ({data?.recentPerformers.length || 0})</span>
              </button>
            </div>

            {activeTab === "alerts" && data && data.stats.unreadAlertsCount > 0 && (
              <button
                type="button"
                onClick={() => handleMarkRead("all")}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Tout marquer comme lu</span>
              </button>
            )}
          </div>

          {/* TAB 1: CHANNELS LIST */}
          {activeTab === "channels" && (
            <div>
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  <p className="text-xs text-slate-500">Chargement de votre liste de surveillance...</p>
                </div>
              ) : data && data.channels.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-slate-900">Aucune chaîne dans ce dossier</h3>
                    <p className="text-xs text-slate-500">
                      Ajoutez des chaînes concurrentes ou inspirantes pour suivre automatiquement leurs nouvelles vidéos et identifier leurs pics d'audience.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                  >
                    Ajouter ma première chaîne
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data?.channels.map((chan) => {
                    const folder = data.folders.find((f) => f.id === chan.folderId);
                    return (
                      <div
                        key={chan.id}
                        className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all space-y-4 group"
                      >
                        {/* Channel Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div
                            onClick={() => router.push(`/channel/${chan.channelId}`)}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity min-w-0"
                          >
                            <img
                              src={chan.avatar}
                              alt={chan.name}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-400 transition-colors">
                                {chan.name}
                              </h3>
                              <span className="text-xs text-slate-500 block truncate">{chan.handle}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUntrack(chan.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors"
                            title="Retirer de la surveillance"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Folder Badge & Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {folder ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-lg border font-semibold flex items-center gap-1 ${getFolderColorClass(
                                folder.color
                              )}`}
                            >
                              <FolderIcon className="w-3 h-3" />
                              <span>{folder.name}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[10px]">
                              Sans dossier
                            </span>
                          )}

                          {chan.notes && (
                            <span className="px-2 py-0.5 rounded-lg bg-[#141d33] border border-slate-200 text-slate-600 text-[10px] truncate max-w-[150px]">
                              "{chan.notes}"
                            </span>
                          )}
                        </div>

                        {/* Channel Core Metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-white rounded-xl p-3 border border-slate-200 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Abonnés</span>
                            <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                              {formatCompactNumber(chan.subscribers)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Médiane</span>
                            <span className="font-extrabold text-emerald-400 text-sm mt-0.5 block">
                              ~{formatCompactNumber(chan.baselineViews)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Vidéos</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                              {chan.videoCount}
                            </span>
                          </div>
                        </div>

                        {/* Actions Bar */}
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Ajouté {formatDate(chan.addedAt)}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => router.push(`/channel/${chan.channelId}`)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>Analyser</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALERTS & VIRAL DETECTIONS */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              {data && data.alerts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                  <Bell className="w-8 h-8 text-slate-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">Aucune alerte pour l'instant</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Dès qu'une chaîne suivie publie une vidéo qui surperforme anormalement (ratio &gt; 2.5x), une alerte automatique sera générée ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        alert.isRead
                          ? "bg-white border-slate-200 opacity-80"
                          : "bg-white border-blue-500/30 shadow-lg shadow-blue-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative aspect-video w-24 sm:w-28 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
                          <img
                            src={alert.videoThumbnail}
                            alt=""
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                          <div
                            className={`absolute top-1 left-1 px-1.5 py-0.5 rounded font-black text-[9px] text-white ${
                              alert.alertType === "new_upload" ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          >
                            {alert.alertType === "new_upload" ? "NOUVEAU" : `${alert.outlierMultiplier}x`}
                          </div>
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-400">{alert.channelName}</span>
                            {alert.alertType === "new_upload" && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                Sortie Récente
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500">• {formatDate(alert.createdAt)}</span>
                            {!alert.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xl">
                            {alert.videoTitle}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {alert.message} ({formatCompactNumber(alert.views)} vues vs médiane ~{formatCompactNumber(alert.baselineViews)})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <a
                          href={`https://www.youtube.com/watch?v=${alert.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <span>Voir sur YouTube</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {!alert.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(alert.id)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors"
                            title="Marquer comme lu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECENT BREAKOUT VIDEOS */}
          {activeTab === "performers" && (
            <div className="space-y-4">
              {data && data.recentPerformers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                  <Flame className="w-8 h-8 text-slate-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">Aucun breakout détecté récemment</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Cliquez sur <strong>"Synchroniser"</strong> en haut pour scanner les vidéos récentes de vos chaînes suivies.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {data?.recentPerformers.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl transition-all group"
                    >
                      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                        <img
                          src={item.video.thumbnail}
                          alt=""
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-rose-600/90 text-white font-black text-xs backdrop-blur-md flex items-center gap-1 shadow-lg">
                          <Flame className="w-3.5 h-3.5 fill-white" />
                          <span>{item.video.outlierMultiplier}x Outlier</span>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                          {item.video.durationFormatted}
                        </div>
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <img
                              src={item.channel.avatar}
                              alt=""
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-5 h-5 rounded-full object-cover border border-slate-700"
                            />
                            <span className="text-xs font-semibold text-slate-600 truncate">
                              {item.channel.name}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                            {item.video.title}
                          </h4>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-mono text-emerald-400 font-bold">
                            {formatCompactNumber(item.video.views)} vues
                          </span>
                          <a
                            href={`https://www.youtube.com/watch?v=${item.video.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <span>Regarder</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODAL: ADD CHANNEL */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Ajouter une chaîne à suivre</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-500 hover:text-slate-900 text-xs"
                  >
                    Fermer
                  </button>
                </div>

                <form onSubmit={handleAddChannel} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">
                      Nom de la chaîne, @handle ou URL
                    </label>
                    <input
                      type="text"
                      value={channelQuery}
                      onChange={(e) => setChannelQuery(e.target.value)}
                      placeholder="ex: @MrBeast, Squeezie ou youtube.com/@..."
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Dossier de classement</label>
                    <select
                      value={targetFolderId}
                      onChange={(e) => setTargetFolderId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">(Aucun dossier)</option>
                      {data?.folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Notes internes (optionnel)</label>
                    <input
                      type="text"
                      value={channelNotes}
                      onChange={(e) => setChannelNotes(e.target.value)}
                      placeholder="ex: Concurrent direct à surveiller pour les titres"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {addError && <p className="text-xs text-rose-400">{addError}</p>}

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={addLoading || !channelQuery.trim()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50"
                    >
                      {addLoading ? "Recherche YouTube..." : "Ajouter au radar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: CREATE FOLDER */}
          {showFolderModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Créer un dossier de surveillance</h3>
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(false)}
                    className="text-slate-500 hover:text-slate-900 text-xs"
                  >
                    Fermer
                  </button>
                </div>

                <form onSubmit={handleCreateFolder} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Nom du dossier</label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="ex: Inspiration Gaming US, Concurrents Bourse..."
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold block">Couleur</label>
                    <div className="flex items-center gap-3 pt-1">
                      {["blue", "emerald", "purple", "amber", "rose"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFolderColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            folderColor === c ? "scale-125 border-white" : "border-transparent opacity-60"
                          } ${
                            c === "blue"
                              ? "bg-blue-500"
                              : c === "emerald"
                              ? "bg-emerald-500"
                              : c === "purple"
                              ? "bg-purple-500"
                              : c === "amber"
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFolderModal(false)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={folderLoading || !folderName.trim()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50"
                    >
                      Créer le dossier
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
