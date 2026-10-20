"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RecentVideo } from "@/types/youtube";
import { formatCompactNumber, formatFullNumber, formatDate } from "@/lib/utils";
import { ChannelMedianStats } from "@/lib/channelArchiveCache";
import { 
  Play, 
  ExternalLink, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Clock, 
  Filter,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  History,
  Zap,
  Flame,
  CheckCircle2,
  Loader2,
  Calendar,
  Award,
  Database,
  Sliders
} from "lucide-react";
import { VideoDetailModal } from "./VideoDetailModal";

interface RecentVideosListProps {
  videos: RecentVideo[];
  totalAvailable?: number;
  isAllLoaded?: boolean;
  loadingAll?: boolean;
  onLoadAll?: () => void;
  firstUploadDate?: string;
  channelTitle?: string;
  medianStats?: ChannelMedianStats;
  fromCache?: boolean;
}

export function RecentVideosList({ 
  videos,
  totalAvailable,
  isAllLoaded,
  loadingAll,
  onLoadAll,
  firstUploadDate,
  channelTitle,
  medianStats: initialStats,
  fromCache
}: RecentVideosListProps) {
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "views" | "outlier" | "likes">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | "long" | "shorts">("all");
  const [minViewsFilter, setMinViewsFilter] = useState<number>(0);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Intelligent Median Window Selector: 12m, 24m or lifetime
  const [medianWindow, setMedianWindow] = useState<"12m" | "24m" | "lifetime">("12m");

  // Grid responsiveness column count
  const [columnCount, setColumnCount] = useState(3);
  useEffect(() => {
    const updateCols = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth >= 1024) setColumnCount(3);
      else if (window.innerWidth >= 768) setColumnCount(2);
      else setColumnCount(1);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  // Compute Intelligent Medians dynamically on client if window changes
  const { computedStats, processedVideos } = useMemo(() => {
    const now = Date.now();
    const cutoff12m = now - 365 * 86400000;
    const cutoff24m = now - 730 * 86400000;

    const isShort = (v: RecentVideo) => {
      if (v.durationSeconds !== undefined && v.durationSeconds > 0) {
        return v.durationSeconds <= 60;
      }
      if (v.durationFormatted) {
        const parts = v.durationFormatted.split(":");
        if (parts.length === 2 && parts[0] === "0" && parseInt(parts[1], 10) <= 60) return true;
      }
      return false;
    };

    const getMedian = (nums: number[]) => {
      if (nums.length === 0) return 1;
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    const longformVideos = videos.filter((v) => !isShort(v));
    const shortsVideos = videos.filter((v) => isShort(v));

    const long12mViews = longformVideos
      .filter((v) => v.publishedAt && new Date(v.publishedAt).getTime() >= cutoff12m)
      .map((v) => v.viewCount);
    const long24mViews = longformVideos
      .filter((v) => v.publishedAt && new Date(v.publishedAt).getTime() >= cutoff24m)
      .map((v) => v.viewCount);
    const longLifetimeViews = longformVideos.map((v) => v.viewCount);
    const shortsViews = shortsVideos.map((v) => v.viewCount);

    const m12 = long12mViews.length >= 3 ? getMedian(long12mViews) : getMedian(longLifetimeViews);
    const m24 = long24mViews.length >= 3 ? getMedian(long24mViews) : getMedian(longLifetimeViews);
    const mLifetime = getMedian(longLifetimeViews);
    const mShorts = getMedian(shortsViews);

    const activeLongformBaseline = medianWindow === "12m" ? m12 : medianWindow === "24m" ? m24 : mLifetime;

    const enriched = videos.map((v) => {
      const isS = isShort(v);
      const baseline = isS ? mShorts : activeLongformBaseline;
      const outlierMultiplier = parseFloat((v.viewCount / Math.max(baseline, 1)).toFixed(1));
      return {
        ...v,
        outlierMultiplier,
      };
    });

    return {
      computedStats: {
        longform12m: m12,
        longform24m: m24,
        longformLifetime: mLifetime,
        shortsLifetime: mShorts,
        totalLongform: longformVideos.length,
        totalShorts: shortsVideos.length,
      },
      processedVideos: enriched,
    };
  }, [videos, medianWindow]);

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
        No videos available for this channel.
      </div>
    );
  }

  // Filter videos
  const filteredVideos = processedVideos.filter((v) => {
    if (filterKeyword.trim() && !v.title.toLowerCase().includes(filterKeyword.toLowerCase())) {
      return false;
    }

    const isShort = (v.durationSeconds !== undefined && v.durationSeconds <= 60) || 
      (v.durationFormatted && (v.durationFormatted === "0:60" || (v.durationFormatted.startsWith("0:") && parseInt(v.durationFormatted.split(":")[1], 10) <= 60)));
    
    if (formatFilter === "long" && isShort) return false;
    if (formatFilter === "shorts" && !isShort) return false;

    if (minViewsFilter > 0 && v.viewCount < minViewsFilter) return false;

    return true;
  });

  // Sort loaded dataset
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === "oldest") {
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
    }
    if (sortBy === "views") {
      return b.viewCount - a.viewCount;
    }
    if (sortBy === "outlier") {
      return (b.outlierMultiplier || 0) - (a.outlierMultiplier || 0);
    }
    if (sortBy === "likes") {
      return (b.likeCount || 0) - (a.likeCount || 0);
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const oldestVideoId = [...videos]
    .filter((v) => v.publishedAt)
    .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())[0]?.id;

  // Virtualization for Grid: Chunk sorted videos into rows of `columnCount`
  const gridRows = useMemo(() => {
    const rows: RecentVideo[][] = [];
    for (let i = 0; i < sortedVideos.length; i += columnCount) {
      rows.push(sortedVideos.slice(i, i + columnCount));
    }
    return rows;
  }, [sortedVideos, columnCount]);

  const gridParentRef = useRef<HTMLDivElement>(null);
  const gridVirtualizer = useVirtualizer({
    count: gridRows.length,
    getScrollElement: () => gridParentRef.current,
    estimateSize: () => 365,
    overscan: 2,
  });

  // Virtualization for Table
  const tableParentRef = useRef<HTMLDivElement>(null);
  const tableVirtualizer = useVirtualizer({
    count: sortedVideos.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 68,
    overscan: 8,
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header and Lifetime Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-bold text-slate-900 text-base">
              {isAllLoaded ? "Catalogue Vidéos (Archive Complète)" : "Vidéos de la chaîne"}
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-mono">
              {filteredVideos.length} / {videos.length} chargées
            </span>
            {fromCache && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <Database className="w-3 h-3" />
                <span>Cache disque instantané (0 quota)</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-1">
            {firstUploadDate ? (
              <span>
                Première vidéo publiée le <strong className="text-slate-700">{formatDate(firstUploadDate)}</strong>.
              </span>
            ) : (
              <span>Consultez l'historique complet, les statistiques et les outliers fiables.</span>
            )}
          </p>
        </div>

        {/* Load All Button / Complete Badge */}
        <div className="flex items-center gap-3">
          {!isAllLoaded && onLoadAll && (
            <button
              type="button"
              onClick={onLoadAll}
              disabled={loadingAll}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
              title="Pagine à travers l'ensemble des vidéos de la chaîne"
            >
              {loadingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Chargement ({videos.length} récupérées...)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Charger tout l'historique ({totalAvailable ? `${totalAvailable} vidéos` : "depuis le début"})</span>
                </>
              )}
            </button>
          )}

          {isAllLoaded && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold">
                Historique complet ({videos.length} vidéos depuis le début)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Intelligent Medians Dashboard Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Base de Calcul Outlier :
          </span>

          {/* Window Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setMedianWindow("12m")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                medianWindow === "12m" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              12 Mois (Recommandé)
            </button>
            <button
              type="button"
              onClick={() => setMedianWindow("24m")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                medianWindow === "24m" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              24 Mois
            </button>
            <button
              type="button"
              onClick={() => setMedianWindow("lifetime")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                medianWindow === "lifetime" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Lifetime (Historique)
            </button>
          </div>
        </div>

        {/* Real Medians Comparison Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
            🎯 Médiane Longform ({medianWindow}) :{" "}
            <strong className="text-slate-900 font-mono">
              {formatCompactNumber(
                medianWindow === "12m"
                  ? computedStats.longform12m
                  : medianWindow === "24m"
                  ? computedStats.longform24m
                  : computedStats.longformLifetime
              )}
            </strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
            📱 Shorts isolés :{" "}
            <strong className="text-amber-400 font-mono">
              {formatCompactNumber(computedStats.shortsLifetime)}
            </strong>{" "}
            ({computedStats.totalShorts} vidéos)
          </span>
        </div>
      </div>

      {/* Filter & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Keyword Search */}
          <div className="relative w-44 sm:w-56">
            <input
              type="text"
              placeholder="Filtrer par titre..."
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Format selector (Exclude Shorts) */}
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Tous formats ({videos.length})</option>
            <option value="long">Vidéos longues ({computedStats.totalLongform})</option>
            <option value="shorts">Shorts ({computedStats.totalShorts})</option>
          </select>

          {/* Min Views selector */}
          <select
            value={minViewsFilter}
            onChange={(e) => setMinViewsFilter(parseInt(e.target.value, 10))}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="0">Toutes les vues</option>
            <option value="10000">&gt; 10k vues</option>
            <option value="50000">&gt; 50k vues</option>
            <option value="100000">&gt; 100k vues</option>
            <option value="500000">&gt; 500k vues</option>
            <option value="1000000">&gt; 1M vues</option>
          </select>
        </div>

        {/* Sort Switcher (including 'Oldest / Depuis le début') */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setSortBy("newest")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                sortBy === "newest"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Plus récentes
            </button>
            <button
              type="button"
              onClick={() => setSortBy("oldest")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                sortBy === "oldest"
                  ? "bg-indigo-600 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Voir les toutes premières vidéos publiées par la chaîne"
            >
              👶 Depuis le début
            </button>
            <button
              type="button"
              onClick={() => setSortBy("views")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                sortBy === "views"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Plus vues
            </button>
            <button
              type="button"
              onClick={() => setSortBy("outlier")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                sortBy === "outlier"
                  ? "bg-amber-600 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ⚡ Outliers
            </button>
            <button
              type="button"
              onClick={() => setSortBy("likes")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                sortBy === "likes"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Likes
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Vue Grille Virtualisée"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Vue Tableau Virtualisée"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* VIRTUALIZED GRID MODE (Handles 2,500+ videos at 60 FPS) */}
      {viewMode === "grid" ? (
        <div
          ref={gridParentRef}
          className="max-h-[820px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800"
        >
          <div
            style={{
              height: `${gridVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {gridVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowVideos = gridRows[virtualRow.index];
              if (!rowVideos) return null;

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={`grid gap-4 ${
                    columnCount === 3
                      ? "grid-cols-3"
                      : columnCount === 2
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {rowVideos.map((video) => {
                    const engagementRate = video.viewCount > 0
                      ? ((((video.likeCount || 0) + (video.commentCount || 0)) / video.viewCount) * 100).toFixed(1)
                      : "0.0";
                    const isFirstEver = video.id === oldestVideoId;

                    return (
                      <div
                        key={video.id}
                        onClick={() => setSelectedVideoId(video.id)}
                        className="group flex flex-col bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-blue-900/10 cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
                            {video.outlierMultiplier !== undefined && video.outlierMultiplier >= 1.5 && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-black flex items-center gap-1 backdrop-blur-md ${
                                  video.outlierMultiplier >= 3
                                    ? "bg-rose-500 text-white shadow-sm shadow-rose-950"
                                    : "bg-amber-500 text-slate-950 shadow-sm shadow-amber-950"
                                }`}
                              >
                                <Zap className="w-3 h-3 fill-current" />
                                <span>{video.outlierMultiplier}x</span>
                              </span>
                            )}

                            {isFirstEver && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white backdrop-blur-md shadow-md flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                <span>Première Vidéo</span>
                              </span>
                            )}
                          </div>
                          
                          {video.durationFormatted && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[11px] font-mono font-medium text-white">
                              {video.durationFormatted}
                            </span>
                          )}

                          <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                            <span className="px-3 py-1.5 rounded-xl bg-blue-600/90 text-white font-bold text-xs shadow-lg flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Packaging & A/B Details</span>
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h4 
                              className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors"
                              title={video.title}
                            >
                              {video.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{formatDate(video.publishedAt)}</span>
                            </p>
                          </div>

                          {/* Metrics */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
                                <Eye className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] uppercase">Vues</span>
                              </div>
                              <span className="font-extrabold text-slate-900 font-mono text-xs">
                                {formatCompactNumber(video.viewCount)}
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
                                <ThumbsUp className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] uppercase">Likes</span>
                              </div>
                              <span className="font-extrabold text-slate-900 font-mono text-xs">
                                {video.likeCount !== undefined ? formatCompactNumber(video.likeCount) : "N/A"}
                              </span>
                            </div>

                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <div className="flex items-center justify-center gap-1 text-slate-500 mb-0.5">
                                <MessageSquare className="w-3 h-3 text-purple-400" />
                                <span className="text-[10px] uppercase">Engag.</span>
                              </div>
                              <span className="font-extrabold text-purple-400 font-mono text-xs">
                                {engagementRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIRTUALIZED TABLE MODE */
        <div
          ref={tableParentRef}
          className="max-h-[820px] overflow-y-auto border border-slate-200 rounded-xl scrollbar-thin scrollbar-thumb-slate-800"
        >
          <div className="sticky top-0 z-10 bg-white text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200 grid grid-cols-12 py-3 px-4">
            <div className="col-span-5">Vidéo</div>
            <div className="col-span-2 text-center">Date</div>
            <div className="col-span-1 text-center">Durée</div>
            <div className="col-span-1 text-right">Vues</div>
            <div className="col-span-1 text-right">Outlier</div>
            <div className="col-span-1 text-right">Likes</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          <div
            style={{
              height: `${tableVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {tableVirtualizer.getVirtualItems().map((virtualRow) => {
              const video = sortedVideos[virtualRow.index];
              if (!video) return null;
              const isFirstEver = video.id === oldestVideoId;

              return (
                <div
                  key={virtualRow.key}
                  onClick={() => setSelectedVideoId(video.id)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="grid grid-cols-12 py-3 px-4 items-center hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-200 text-xs"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0 pr-2">
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-16 aspect-video object-cover rounded-md border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                        {video.title}
                      </p>
                      {isFirstEver && (
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">
                          👶 Première vidéo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 text-center text-slate-500 whitespace-nowrap text-xs">
                    {formatDate(video.publishedAt)}
                  </div>

                  <div className="col-span-1 text-center font-mono text-slate-500 text-xs">
                    {video.durationFormatted || "--:--"}
                  </div>

                  <div className="col-span-1 text-right font-extrabold text-slate-900 font-mono text-xs">
                    {formatCompactNumber(video.viewCount)}
                  </div>

                  <div className="col-span-1 text-right font-mono font-bold text-xs">
                    {video.outlierMultiplier ? (
                      <span className={video.outlierMultiplier >= 2 ? "text-amber-400" : "text-slate-400"}>
                        {video.outlierMultiplier}x
                      </span>
                    ) : (
                      "~"
                    )}
                  </div>

                  <div className="col-span-1 text-right font-mono text-slate-600 text-xs">
                    {video.likeCount ? formatCompactNumber(video.likeCount) : "N/A"}
                  </div>

                  <div className="col-span-1 text-center" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-[#111722] hover:bg-slate-50 text-slate-600 hover:text-slate-900 inline-flex items-center justify-center border border-slate-200"
                      title="Ouvrir sur YouTube"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideoId && (
        <VideoDetailModal
          videoId={selectedVideoId}
          onClose={() => setSelectedVideoId(null)}
        />
      )}
    </div>
  );
}
