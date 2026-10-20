"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { ChannelHeader } from "@/components/ChannelHeader";
import { KpiCards } from "@/components/KpiCards";
import { ChannelMonetizationEstimator } from "@/components/ChannelMonetizationEstimator";
import { PerformanceCharts } from "@/components/PerformanceCharts";
import { RecentVideosList } from "@/components/RecentVideosList";
import { ChannelDetail, RecentVideo } from "@/types/youtube";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { formatDate } from "@/lib/utils";

function ChannelAnalyticsContent() {
  const params = useParams();
  const router = useRouter();
  const channelId = params?.channelId as string;

  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [videos, setVideos] = useState<RecentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Full Lifetime Video Crawl State
  const [loadingAll, setLoadingAll] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [firstUploadDate, setFirstUploadDate] = useState<string | null>(null);
  const [medianStats, setMedianStats] = useState<any>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  const fetchChannelData = async (isRefresh = false) => {
    if (!channelId) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setIsAllLoaded(false);

    try {
      // 1. Fetch channel details
      const channelRes = await fetch(`/api/youtube/channel?id=${encodeURIComponent(channelId)}`);
      const channelData = await channelRes.json();

      if (!channelRes.ok) {
        throw new Error(channelData.error || "Failed to load channel details");
      }

      setChannel(channelData.channel);

      // 2. Fetch recent videos first for instant display
      const playlistId = channelData.channel.uploadsPlaylistId || 
        (channelId.startsWith("UC") ? "UU" + channelId.substring(2) : channelId);

      if (playlistId) {
        const videosRes = await fetch(
          `/api/youtube/videos?playlistId=${encodeURIComponent(playlistId)}`
        );
        const videosData = await videosRes.json();

        if (videosRes.ok && videosData.videos) {
          setVideos(videosData.videos);
          if (channelData.channel.videoCount <= 50) {
            setIsAllLoaded(true);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve channel analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch ALL videos since the beginning
  const fetchAllVideos = async () => {
    const playlistId = channel?.uploadsPlaylistId || 
      (channelId.startsWith("UC") ? "UU" + channelId.substring(2) : channelId);
    if (!playlistId) return;

    setLoadingAll(true);
    try {
      const res = await fetch(
        `/api/youtube/videos?playlistId=${encodeURIComponent(playlistId)}&all=true`
      );
      const data = await res.json();

      if (res.ok && data.videos) {
        setVideos(data.videos);
        setIsAllLoaded(true);
        if (data.totalAvailable) setTotalAvailable(data.totalAvailable);
        if (data.firstUploadDate) setFirstUploadDate(data.firstUploadDate);
        if (data.medianStats) setMedianStats(data.medianStats);
        if (data.fromCache !== undefined) setFromCache(data.fromCache);
      }
    } catch (err) {
      console.error("Error fetching all channel videos:", err);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    fetchChannelData();
  }, [channelId]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <TopNav 
        title="Channel Analytics"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Channels", href: "/" },
          { label: channel ? channel.title : "Analytics" }
        ]}
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Bar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour aux recherches</span>
          </button>

          <div className="flex items-center gap-2.5">
            {/* Quick 1-click Load All Videos Button if not already loaded */}
            {!isAllLoaded && videos.length > 0 && (
              <button
                type="button"
                onClick={fetchAllVideos}
                disabled={loadingAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
              >
                {loadingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Récupération des vidéos depuis le début...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Récupérer toute la chaîne ({channel?.videoCount || "toutes"} vidéos)</span>
                  </>
                )}
              </button>
            )}

            {isAllLoaded && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tout l'historique chargé ({videos.length} vidéos)</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => fetchChannelData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
              <span>{refreshing ? "Actualisation..." : "Actualiser"}</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 bg-white border border-slate-200 rounded-2xl p-8">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Analyse de la chaîne en cours</h3>
              <p className="text-xs text-slate-500">
                Récupération des métadonnées, statistiques abonnés et historique des vidéos...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-white border border-rose-900/50 rounded-2xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900">Erreur de chargement</h3>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => fetchChannelData()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Loaded Analytics View */}
        {!loading && !error && channel && (
          <div className="space-y-6">
            {/* Channel Header */}
            <ChannelHeader channel={channel} />

            {/* KPI Cards */}
            <KpiCards channel={channel} />

            {/* Estimated Revenues & Monetization Analysis */}
            <ChannelMonetizationEstimator channel={channel} videos={videos} />

            {/* Performance Charts & Lifetime Derived Metrics */}
            <PerformanceCharts videos={videos} />

            {/* Recent & Lifetime Videos List */}
            <RecentVideosList 
              videos={videos} 
              totalAvailable={totalAvailable || channel.videoCount}
              isAllLoaded={isAllLoaded}
              loadingAll={loadingAll}
              onLoadAll={fetchAllVideos}
              firstUploadDate={firstUploadDate || undefined}
              channelTitle={channel.title}
              medianStats={medianStats || undefined}
              fromCache={fromCache}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChannelAnalyticsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }>
        <ChannelAnalyticsContent />
      </Suspense>
    </div>
  );
}
