"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { 
  MonitoredTrackedVideo, 
  ThumbnailIntelligenceOverview, 
  ThumbnailFilterParams 
} from "@/types/thumbnailIntelligence";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { ThumbnailCompareModal } from "@/components/ThumbnailCompareModal";
import {
  Image as ImageIcon,
  History,
  TrendingUp,
  Search,
  Filter,
  Split,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight
} from "lucide-react";

export default function ThumbnailIntelligencePage() {
  const [videos, setVideos] = useState<MonitoredTrackedVideo[]>([]);
  const [overview, setOverview] = useState<ThumbnailIntelligenceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<MonitoredTrackedVideo | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [changeType, setChangeType] = useState<"all" | "thumbnail_only" | "title_only" | "both">("all");
  const [classification, setClassification] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent_change" | "most_views" | "most_changes" | "newest_discovered">("recent_change");
  const [minViews, setMinViews] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        query,
        changeType,
        classification,
        sortBy,
        minViews: String(minViews),
        limit: "36",
      });

      const res = await fetch(`/api/youtube/thumbnail-intelligence?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setVideos(data.items || []);
        setOverview(data.overview);
      }
    } catch (e) {
      console.error("Failed to load thumbnail gallery:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [changeType, classification, sortBy, minViews]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGallery();
  };

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          title="Thumbnail & Title Intelligence"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Thumbnail Intelligence", href: "/thumbnail-intelligence" },
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-b from-[#0f172a] to-[#0b101e] border border-slate-200 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-4xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Moteur d'archivage & Détection de Tests A/B</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Historique des miniatures et titres modifiés.
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
                Suivez en continu les changements de packaging effectués par les créateurs YouTube, comparez les versions d'images côte-à-côte et mesurez l'impact direct sur la vélocité de vues avant et après chaque test.
              </p>

              {/* Quick KPIs */}
              {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Vidéos Surveillées</span>
                    <span className="text-lg font-black text-slate-900">{overview.totalVideosTracked}</span>
                  </div>
                  <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Changements Détectés</span>
                    <span className="text-lg font-black text-blue-400">{overview.totalVideosWithChanges}</span>
                  </div>
                  <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Tests A/B Probables</span>
                    <span className="text-lg font-black text-emerald-400">{overview.probableAbTestsCount}</span>
                  </div>
                  <div className="bg-white/80 border border-slate-200 rounded-xl p-3">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Miniatures Archivées</span>
                    <span className="text-lg font-black text-indigo-400">{overview.totalThumbnailChangesRecorded + overview.totalVideosTracked}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search & Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
                <div className="flex items-center bg-white border border-slate-200 focus-within:border-blue-500 rounded-xl px-3 py-2 text-xs">
                  <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher par titre de vidéo ou nom de chaîne..."
                    className="w-full bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  {query && (
                    <button type="button" onClick={() => { setQuery(""); fetchGallery(); }} className="text-slate-500 hover:text-slate-300">
                      ✕
                    </button>
                  )}
                </div>
              </form>

              {/* Quick Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setChangeType("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    changeType === "all" ? "bg-blue-600 text-white" : "bg-[#101728] text-slate-400 hover:text-white"
                  }`}
                >
                  Tous
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType("thumbnail_only")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    changeType === "thumbnail_only" ? "bg-blue-600 text-white" : "bg-[#101728] text-slate-400 hover:text-white"
                  }`}
                >
                  Miniatures
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType("title_only")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    changeType === "title_only" ? "bg-blue-600 text-white" : "bg-[#101728] text-slate-400 hover:text-white"
                  }`}
                >
                  Titres
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType("both")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    changeType === "both" ? "bg-blue-600 text-white" : "bg-[#101728] text-slate-400 hover:text-white"
                  }`}
                >
                  Les Deux
                </button>

                <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

                {/* Sort Selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#101728] border border-slate-200 text-xs font-semibold text-slate-600 rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="recent_change">Changements Récents</option>
                  <option value="most_views">Plus de Vues</option>
                  <option value="most_changes">Plus de Changements</option>
                  <option value="newest_discovered">Nouveautés Détectées</option>
                </select>

                <button
                  type="button"
                  onClick={fetchGallery}
                  disabled={loading}
                  className="p-2 rounded-lg bg-[#101728] border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                  title="Rafraîchir"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Videos Gallery Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Chargement des miniatures et historiques A/B...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Aucun changement détecté avec ces filtres</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Réinitialisez vos filtres ou lancez un scan d'une chaîne suivie pour capturer ses nouvelles miniatures.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {videos.map((video) => {
                const hasChanges = video.totalChangesObserved > 0;
                const latestVersion = video.versions[video.versions.length - 1];
                const initialVersion = video.versions[0];

                return (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-blue-900/10 flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      {/* Thumbnail comparison preview */}
                      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                        <img
                          src={video.currentThumbnailUrl}
                          alt={video.currentTitle}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />

                        {/* Badges on preview */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          {hasChanges ? (
                            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[10px] shadow-md flex items-center gap-1">
                              <History className="w-3 h-3" />
                              <span>{video.totalChangesObserved} changement{video.totalChangesObserved > 1 ? "s" : ""}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 text-[10px] font-semibold border border-slate-700">
                              Version Initiale
                            </span>
                          )}

                          {video.abTestClassification === "probable_ab_test" && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                              Test A/B
                            </span>
                          )}
                        </div>

                        {/* Historical thumb pip if multiple versions exist */}
                        {hasChanges && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 p-1 rounded-lg bg-black/75 backdrop-blur-xs border border-white/10">
                            <span className="text-[9px] text-slate-500 font-mono">Avant :</span>
                            <img
                              src={initialVersion.thumbnailUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-10 h-6 object-cover rounded border border-slate-700"
                            />
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-blue-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <div className="p-2.5 rounded-full bg-blue-600 text-white shadow-xl">
                            <Split className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-900">Comparer côte-à-côte</span>
                        </div>
                      </div>

                      {/* Video info */}
                      <div className="p-4 space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                          {video.currentTitle}
                        </h4>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {video.channelAvatar && (
                            <img
                              src={video.channelAvatar}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover shrink-0"
                            />
                          )}
                          <span className="truncate font-medium">{video.channelTitle}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom stats footer */}
                    <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-slate-900">
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>{formatCompactNumber(video.currentViewCount)}</span>
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Publié {formatDate(video.publishedAt)}
                        </span>
                      </div>

                      {video.performanceAnalysis && video.performanceAnalysis.velocityDeltaPercent !== 0 && (
                        <span className={`text-[11px] font-bold ${
                          video.performanceAnalysis.velocityDeltaPercent > 0 ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {video.performanceAnalysis.velocityDeltaPercent > 0 ? "+" : ""}
                          {video.performanceAnalysis.velocityDeltaPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Side-by-Side Detail & Compare Modal */}
          {selectedVideo && (
            <ThumbnailCompareModal
              video={selectedVideo}
              onClose={() => setSelectedVideo(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
