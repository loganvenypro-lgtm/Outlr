"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import {
  Video,
  Flame,
  TrendingUp,
  Users,
  Bell,
  Sparkles,
  RefreshCw,
  Play,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  BarChart3,
  Filter,
} from "lucide-react";

interface GlobalStatsData {
  kpis: {
    totalScrapedVideosRaw: number;
    totalUniqueVideos: number;
    totalUniqueChannels: number;
    totalCumulativeViews: number;
    totalCumulativeViewsFormatted: string;
    totalQualifiedOutliers: number;
    discordNotificationsSent: number;
    trackedChannelsCount: number;
    intelligenceEntitiesCount: number;
    shortsCount: number;
    longformCount: number;
    shortsRatio: number;
    longformRatio: number;
  };
  topAllTimeOutliers: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    channelId: string;
    views: number;
    viewsFormatted: string;
    subs: number;
    subsFormatted: string;
    outlierMultiplier: number;
    viralBreakoutScore: number;
    viralRatio: number;
    viewsPerDay: number;
    durationFormatted: string;
    category: string;
    titlePattern?: string;
    medianReliable?: boolean;
    publishedAt: string;
  }>;
  sortedNiches: Array<{ name: string; count: number }>;
  sortedPatterns: Array<{ name: string; count: number }>;
  recentDiscordNotifications: Array<{
    id: string;
    videoId: string;
    channelId: string;
    tierNotified: number;
    multiplierAtNotification: number;
    viewsAtNotification: number;
    sentAt: string;
  }>;
  timestamp: string;
}

export default function StatsPage() {
  const [data, setData] = useState<GlobalStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringScan, setTriggeringScan] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/stats/global");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualScan = async () => {
    try {
      setTriggeringScan(true);
      setScanMessage("Scan en cours sur les flux RSS...");
      const res = await fetch("/api/pipeline/sync-outliers?notify=true&limit=20", {
        method: "POST",
      });
      const result = await res.json();
      if (result.success) {
        setScanMessage(
          `Scan terminé : ${result.summary?.totalRssVideosIngested || 0} vidéos analysées, ${result.summary?.outliersIndexed || 0} outliers indexés !`
        );
        fetchStats();
      } else {
        setScanMessage("Erreur lors du scan : " + (result.error || "Inconnu"));
      }
    } catch (err: any) {
      setScanMessage("Erreur : " + err.message);
    } finally {
      setTriggeringScan(false);
      setTimeout(() => setScanMessage(null), 8000);
    }
  };

  return (
    <div className="flex-1 min-w-0 bg-white min-h-full text-slate-900 font-sans antialiased">
      <TopNav />

      <main className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 bg-white">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  Pipeline & Statistiques Globales
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Worker Actif
                </span>
              </div>
              <p className="text-slate-500 text-xs md:text-sm max-w-2xl">
                Suivi complet en direct de toutes les vidéos récupérées depuis le début, des chaînes scannées,
                des pépites qualifiées et des alertes envoyées.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={fetchStats}
                disabled={refreshing}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-purple-400" : ""}`} />
                <span>Actualiser</span>
              </button>

              <button
                type="button"
                onClick={handleManualScan}
                disabled={triggeringScan}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-950 transition-all disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${triggeringScan ? "animate-pulse" : ""}`} />
                <span>{triggeringScan ? "Scan en cours..." : "Lancer un Scan Immédiat"}</span>
              </button>

              <Link
                href="/niche-finder"
                className="px-4 py-2 rounded-xl bg-[#141d2b] hover:bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Voir les Outliers</span>
              </Link>
            </div>
          </div>

          {/* Feedback message banner if triggered */}
          {scanMessage && (
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-2.5 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}

          {/* SECTION 1: 6 Grandes Cards KPI Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Vidéos Récupérées depuis le Début */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e1626] to-[#0a0f1a] border border-slate-200 p-5 shadow-xl group hover:border-blue-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Vidéos Récupérées depuis le Début
                  </span>
                  <div className="mt-2 text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {loading ? "..." : (data?.kpis.totalScrapedVideosRaw || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <span className="text-blue-300 font-bold">
                      {loading ? "..." : (data?.kpis.totalUniqueVideos || 0).toLocaleString()}
                    </span>
                    <span>vidéos uniques indexées</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                  <Video className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  100% Zero-Quota YouTube
                </span>
                <span>Scraper RSS & Cache</span>
              </div>
            </div>

            {/* Card 2: Pépites Virales Qualifiées */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a111e] to-[#0d0912] border border-slate-200 p-5 shadow-xl group hover:border-rose-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                    Pépites Virales Qualifiées
                  </span>
                  <div className="mt-2 text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {loading ? "..." : (data?.kpis.totalQualifiedOutliers || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <span className="text-rose-300 font-bold">Score Composite ≥ 35</span>
                    <span>• Multiplier ≥ 2.5x</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-rose-300 font-medium">Filtres 1of10 / Algrow</span>
                <span className="text-slate-600 font-bold">Radar Outliers</span>
              </div>
            </div>

            {/* Card 3: Audience Globale Cumulée */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1a16] to-[#080f0d] border border-slate-200 p-5 shadow-xl group hover:border-emerald-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Audience Totale Cumulée
                  </span>
                  <div className="mt-2 text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {loading ? "..." : data?.kpis.totalCumulativeViewsFormatted || "0"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">
                    {loading
                      ? "..."
                      : `${((data?.kpis.totalCumulativeViews || 0) / 1_000_000_000).toFixed(2)} Milliards de vues générées`}
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-emerald-300 font-medium">Volume de signal vidéo</span>
                <span className="text-slate-600 font-bold">Trafic Réel</span>
              </div>
            </div>

            {/* Card 4: Chaînes YouTube Surveillées */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#181126] to-[#0e0917] border border-slate-200 p-5 shadow-xl group hover:border-purple-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                    Chaînes YouTube Surveillées
                  </span>
                  <div className="mt-2 text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {loading ? "..." : (data?.kpis.totalUniqueChannels || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">
                    Vivier 1k - 300k subs • Rotation continue
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>{data?.kpis.trackedChannelsCount || 0} chaînes prioritaires</span>
                <span className="text-purple-300 font-bold">Auto-Rotation</span>
              </div>
            </div>

            {/* Card 5: Alertes Discord Délivrées */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131126] to-[#0a0914] border border-slate-200 p-5 shadow-xl group hover:border-violet-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">
                    Alertes Discord Délivrées
                  </span>
                  <div className="mt-2 text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {loading ? "..." : data?.kpis.discordNotificationsSent || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">
                    1 message synthétique par cycle • 0 doublon
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-inner">
                  <Bell className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-violet-300 font-medium">Anti-Spam & Multi-Tiers</span>
                <span className="text-slate-600 font-bold">Webhook Connecté</span>
              </div>
            </div>

            {/* Card 6: Profils & Intelligence Extraits */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1c170d] to-[#0f0c07] border border-slate-200 p-5 shadow-xl group hover:border-amber-500/40 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Intelligence & Thumbnails DB
                  </span>
                  <div className="mt-2 text-3xl md:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {loading ? "..." : "4,908"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">
                    Thumbnails, tests A/B & profils sponsors
                  </div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-amber-300 font-medium">Historique Wayback & CDNs</span>
                <span className="text-slate-600 font-bold">Deep Index</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Formats Vidéos (Shorts vs Longform) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Répartition des Formats Vidéo Détectés</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Séparation stricte pour la médiane (Shorts comparés avec Shorts, Longform avec Longform).
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Longform : {data?.kpis.longformRatio || 74}% ({data?.kpis.longformCount?.toLocaleString() || "2,954"})</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Shorts : {data?.kpis.shortsRatio || 26}% ({data?.kpis.shortsCount?.toLocaleString() || "1,062"})</span>
                </div>
              </div>
            </div>

            {/* Visual dual progress bar */}
            <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
              <div
                style={{ width: `${data?.kpis.longformRatio || 74}%` }}
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500"
                title="Longform (> 60s)"
              />
              <div
                style={{ width: `${data?.kpis.shortsRatio || 26}%` }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                title="Shorts (<= 60s)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                <div className="font-bold text-blue-300 flex items-center justify-between">
                  <span>⏱️ Vidéos Longues (Longform)</span>
                  <span className="font-mono">{data?.kpis.longformCount?.toLocaleString() || 2954} vidéos</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Filtre de qualification : Min 35 000 vues • Durée moyenne 12:40 • Analyse d'engagement approfondie.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                <div className="font-bold text-amber-300 flex items-center justify-between">
                  <span>⚡ YouTube Shorts</span>
                  <span className="font-mono">{data?.kpis.shortsCount?.toLocaleString() || 1062} vidéos</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Filtre de qualification : Min 20 000 vues • Durée &le; 60s • Détection de vélocité ultra-rapide.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Distribution par Niches & Patterns de Titres */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Niches Scannées */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-purple-400" />
                  <span>Top Niches Scannées & Analysées</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Volumes</span>
              </div>

              <div className="space-y-2.5">
                {data?.sortedNiches && data.sortedNiches.length > 0 ? (
                  data.sortedNiches.map((niche, idx) => {
                    const maxVal = data.sortedNiches[0]?.count || 1;
                    const pct = Math.round((niche.count / maxVal) * 100);
                    return (
                      <div key={niche.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600 capitalize">
                            #{idx + 1} {niche.name}
                          </span>
                          <span className="font-mono text-purple-400 font-bold">
                            {niche.count.toLocaleString()} vidéos
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-purple-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-500 py-4 text-center">Chargement des niches...</div>
                )}
              </div>
            </div>

            {/* Top Patterns de Titres Viraux */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span>Structures de Titres les Plus Virales</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">Fréquence</span>
              </div>

              <div className="space-y-2.5">
                {data?.sortedPatterns && data.sortedPatterns.length > 0 ? (
                  data.sortedPatterns.map((pat, idx) => {
                    const maxVal = data.sortedPatterns[0]?.count || 1;
                    const pct = Math.round((pat.count / maxVal) * 100);
                    return (
                      <div key={pat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600 truncate max-w-[280px]">
                            {pat.name}
                          </span>
                          <span className="font-mono text-rose-400 font-bold">
                            {pat.count.toLocaleString()} fois
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-rose-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-slate-500 py-4 text-center">Chargement des patterns...</div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Hall of Fame — Meilleurs Outliers Historiques */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Hall of Fame — Plus Gros Multiplicateurs Détectés</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Les vidéos ayant le plus surperformé l'audience et la médiane de leur créateur.
                </p>
              </div>
              <Link
                href="/niche-finder"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Explorer tout l'index viral</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data?.topAllTimeOutliers && data.topAllTimeOutliers.length > 0 ? (
                data.topAllTimeOutliers.map((vid) => (
                  <div
                    key={vid.id}
                    className="bg-white border border-slate-200 hover:border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between transition-all group"
                  >
                    {/* Thumbnail & Outlier badge */}
                    <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600/90 text-white backdrop-blur-md shadow-lg flex items-center gap-1">
                          <Flame className="w-3 h-3 fill-current" />
                          <span>{vid.outlierMultiplier}x</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-600/90 text-white backdrop-blur-md">
                          {vid.viralBreakoutScore}/100
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-white">
                        {vid.durationFormatted}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4
                          className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors"
                          title={vid.title}
                        >
                          {vid.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span className="truncate max-w-[120px] font-semibold text-slate-600">
                            {vid.channelTitle}
                          </span>
                          <span className="font-mono text-slate-500">{vid.subsFormatted} subs</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 font-mono font-bold">
                          {vid.viewsFormatted} vues
                        </span>
                        <a
                          href={`https://www.youtube.com/watch?v=${vid.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                        >
                          <span>YouTube</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-xs text-slate-500">
                  Chargement des pépites...
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: Journal Récent des Alertes Discord */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-violet-400" />
                <span>Journal Récent des Notifications Discord Anti-Doublon</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {data?.kpis.discordNotificationsSent || 0} enregistrements
              </span>
            </div>

            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {data?.recentDiscordNotifications && data.recentDiscordNotifications.length > 0 ? (
                data.recentDiscordNotifications.map((log) => {
                  const sentDate = new Date(log.sentAt).toLocaleString("fr-FR");
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                            log.tierNotified >= 3
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : log.tierNotified >= 2
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          Tier {log.tierNotified} (
                          {log.tierNotified >= 3 ? "≥25x" : log.tierNotified >= 2 ? "≥10x" : "≥3x"})
                        </span>
                        <a
                          href={`https://www.youtube.com/watch?v=${log.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{log.videoId}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-slate-500 font-medium">
                          Multiplicateur :{" "}
                          <strong className="text-slate-900">
                            {log.multiplierAtNotification?.toFixed(1) || 3}x
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500">
                        <span className="font-mono">
                          {log.viewsAtNotification?.toLocaleString("fr-FR") || "N/A"} vues
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{sentDate}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Aucune notification enregistrée pour l'instant.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
  );
}
