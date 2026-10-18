"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  Flame, 
  ExternalLink, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Play, 
  Globe, 
  TrendingUp, 
  Loader2, 
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function TrendingPage() {
  const router = useRouter();
  const [region, setRegion] = useState("FR");
  const [category, setCategory] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced Filters
  const [formatFilter, setFormatFilter] = useState<"all" | "long" | "shorts">("long"); // Defaults to long videos (exclude shorts)
  const [minViews, setMinViews] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "views" | "likes">("rank");

  const fetchTrending = async (r: string, c: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/trending?region=${r}&category=${c}`);
      const data = await res.json();
      if (res.ok && data.videos) {
        setVideos(data.videos);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending(region, category);
  }, [region, category]);

  // Apply In-Memory Advanced Filters
  const filteredVideos = videos.filter((v) => {
    // Format Filter (Exclude Shorts)
    if (formatFilter === "long" && v.isShort) return false;
    if (formatFilter === "shorts" && !v.isShort) return false;

    // Min views filter
    if (minViews > 0 && v.viewCount < minViews) return false;

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const match = v.title.toLowerCase().includes(q) || v.channelTitle.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Sort
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === "views") return b.viewCount - a.viewCount;
    if (sortBy === "likes") return (b.likeCount || 0) - (a.likeCount || 0);
    return a.rank - b.rank;
  });

  return (
    <div className="flex min-h-screen bg-[#080c14]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="Tendances YouTube" 
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Tendances YouTube en direct" }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header & Market / Category Selector */}
          <div className="bg-[#0e1628] border border-[#1e2b46] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Tendances & Viralité YouTube
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                    Flux Live API
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Explorez en direct les vidéos les plus regardées et ciblez un marché géographique précis.
                </p>
              </div>

              {/* Geographic Market Selector */}
              <div className="flex items-center gap-1.5 bg-[#080d1a] border border-[#1e2b46] rounded-xl p-1 overflow-x-auto">
                {[
                  { label: "🇫🇷 France", code: "FR" },
                  { label: "🇺🇸 USA", code: "US" },
                  { label: "🇬🇧 UK", code: "GB" },
                  { label: "🇩🇪 Allemagne", code: "DE" },
                  { label: "🇪🇸 Espagne", code: "ES" },
                  { label: "🇨🇦 Canada", code: "CA" },
                  { label: "🇧🇷 Brésil", code: "BR" },
                  { label: "🇯🇵 Japon", code: "JP" },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setRegion(item.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      region === item.code
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="pt-3 border-t border-[#18233a] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">Niche / Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#080d1a] border border-[#1e2b46] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Toutes Catégories</option>
                  <option value="28">Science & Technologie</option>
                  <option value="20">Jeux Vidéo / Gaming</option>
                  <option value="24">Divertissement</option>
                  <option value="10">Musique</option>
                  <option value="17">Sport</option>
                  <option value="27">Éducation</option>
                  <option value="25">Actualités & Politique</option>
                </select>
              </div>

              {/* Format Filter (Exclude Shorts) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">Format vidéo</label>
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value as any)}
                  className="w-full bg-[#080d1a] border border-[#1e2b46] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="long">Vidéos longues uniquement (Exclure Shorts)</option>
                  <option value="shorts">Shorts uniquement (&lt; 60s)</option>
                  <option value="all">Tous formats confondus</option>
                </select>
              </div>

              {/* Minimum Views */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">
                  Vues minimum : <span className="text-white font-mono">{minViews > 0 ? formatCompactNumber(minViews) : "Toutes"}</span>
                </label>
                <select
                  value={minViews}
                  onChange={(e) => setMinViews(parseInt(e.target.value, 10))}
                  className="w-full bg-[#080d1a] border border-[#1e2b46] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="0">Aucun seuil de vues</option>
                  <option value="50000">&gt; 50 000 vues</option>
                  <option value="200000">&gt; 200 000 vues</option>
                  <option value="500000">&gt; 500 000 vues</option>
                  <option value="1000000">&gt; 1 000 000 vues</option>
                </select>
              </div>

              {/* Keyword Search */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 block">Filtrer par mot-clé</label>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Rechercher dans les titres..."
                  className="w-full bg-[#080d1a] border border-[#1e2b46] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>
                Affichage de <strong>{sortedVideos.length}</strong> vidéos (sur {videos.length} détectées)
              </span>
              {(formatFilter !== "all" || minViews > 0 || searchFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setFormatFilter("all");
                    setMinViews(0);
                    setSearchFilter("");
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-24 text-center space-y-3 bg-[#0e1628] border border-[#1e2b46] rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-orange-400 mx-auto" />
              <p className="text-xs text-slate-400">Récupération des flux viraux YouTube...</p>
            </div>
          )}

          {/* Videos Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="bg-[#0e1628] border border-[#1e2b46] hover:border-blue-500/50 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Rank Badge */}
                    <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-orange-600/90 backdrop-blur-md text-white font-black text-xs flex items-center justify-center shadow-lg">
                      #{vid.rank}
                    </div>

                    {/* Duration Badge */}
                    {vid.durationFormatted && (
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[11px] font-mono text-white">
                        {vid.durationFormatted}
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                        {vid.title}
                      </h3>

                      <div 
                        className="flex items-center gap-2 mt-2 cursor-pointer"
                        onClick={() => vid.channelId && router.push(`/channel/${vid.channelId}`)}
                      >
                        <span className="text-xs font-semibold text-blue-400 hover:underline">
                          {vid.channelTitle}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#18233a] flex items-center justify-between text-xs text-slate-300">
                      <span className="font-bold text-white flex items-center gap-1.5 font-mono">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>{formatCompactNumber(vid.viewCount)}</span>
                      </span>

                      <div className="flex items-center gap-3">
                        {vid.likeCount !== undefined && (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{formatCompactNumber(vid.likeCount)}</span>
                          </span>
                        )}

                        <a
                          href={`https://www.youtube.com/watch?v=${vid.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-[#141e33] hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
                          title="Regarder sur YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
