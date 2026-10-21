"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  Zap, 
  Search, 
  Flame, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  Sparkles, 
  Play, 
  ExternalLink, 
  Loader2, 
  ArrowRight,
  Lightbulb,
  Layers,
  Check,
  Copy
} from "lucide-react";

export default function TubeLabPage() {
  const router = useRouter();

  // Active sub-tab: 'outliers' | 'niches' | 'ideation'
  const [tab, setTab] = useState<"outliers" | "niches" | "ideation">("outliers");
  const [nicheQuery, setNicheQuery] = useState("intelligence artificielle");
  const [loading, setLoading] = useState(false);
  const [outliers, setOutliers] = useState<any[]>([]);
  const [aiConcepts, setAiConcepts] = useState<string | null>(null);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [copied, setCopied] = useState(false);

  // Popular Profitable Niches Benchmark (from TubeLab methodology)
  const popularNiches = [
    { name: "IA & Productivité", rpm: "6€ - 12€", competition: "Moyenne", growth: "+140%", tag: "intelligence artificielle" },
    { name: "Finance & Bourse", rpm: "8€ - 18€", competition: "Élevée", growth: "+85%", tag: "bourse investissement" },
    { name: "E-Commerce & SaaS", rpm: "7€ - 15€", competition: "Moyenne", growth: "+110%", tag: "saas business" },
    { name: "Tech & Setup", rpm: "4€ - 8€", competition: "Élevée", growth: "+45%", tag: "tech setup" },
    { name: "Développement Web", rpm: "5€ - 11€", competition: "Faible", growth: "+95%", tag: "programmation web" },
    { name: "Santé & Biohacking", rpm: "4€ - 9€", competition: "Moyenne", growth: "+130%", tag: "biohacking sommeil" },
  ];

  const fetchOutliers = async (keyword: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/outliers?q=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      if (res.ok && data.outliers) {
        setOutliers(data.outliers);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleGenerateIdeas = async (topic: string) => {
    setGeneratingIdeas(true);
    try {
      const res = await fetch("/api/youtube/ideation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (res.ok && data.concepts) {
        setAiConcepts(data.concepts);
      }
    } catch {}
    finally {
      setGeneratingIdeas(false);
    }
  };

  useEffect(() => {
    fetchOutliers(nicheQuery);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nicheQuery.trim()) {
      fetchOutliers(nicheQuery.trim());
      if (tab === "ideation") {
        handleGenerateIdeas(nicheQuery.trim());
      }
    }
  };

  return (
    <div className="min-h-full bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="TubeLab — Niche & Outlier Intelligence" 
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "TubeLab Studio" }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  TubeLab Suite
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  Outliers & Idéation IA
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Détectez les vidéos qui surperforment le nombre d'abonnés de leur créateur (Outliers), trouvez des niches à fort RPM et générez des concepts viraux.
              </p>
            </div>

            {/* Sub-tabs Switcher */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setTab("outliers")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === "outliers" ? "bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Vidéos Outliers
              </button>
              <button
                type="button"
                onClick={() => setTab("niches")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === "niches" ? "bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Niche Finder & RPM
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("ideation");
                  if (!aiConcepts) handleGenerateIdeas(nicheQuery);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === "ideation" ? "bg-purple-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Générateur d'Idées IA
              </button>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={nicheQuery}
                onChange={(e) => setNicheQuery(e.target.value)}
                placeholder="Entrez un mot-clé ou une thématique (ex: intelligence artificielle, finance, fitness, crypto)..."
                className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-purple-600/30 shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>Explorer la Niche</span>
            </button>
          </form>

          {/* Tab 1: Outlier Videos Detection */}
          {tab === "outliers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Vidéos à Forte Surperformance (Outlier Ratio)</span>
                  <span className="text-xs text-slate-500 font-normal">
                    (Vues supérieures à l'audience habituelle de la chaîne)
                  </span>
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {outliers.length} analysées
                </span>
              </div>

              {loading && (
                <div className="py-20 text-center text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                  Calcul des ratios de vues par rapport aux abonnés des créateurs...
                </div>
              )}

              {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outliers.map((video) => (
                    <div
                      key={video.id}
                      className="bg-white border border-slate-200 hover:border-purple-500/50 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Multiplier Outlier Badge */}
                        <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 shadow-lg backdrop-blur-md ${
                          video.multiplier >= 3.0
                            ? "bg-rose-600 text-white"
                            : video.multiplier >= 1.5
                            ? "bg-purple-600 text-white"
                            : "bg-slate-800 text-slate-300"
                        }`}>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{video.multiplier}x Outlier</span>
                        </div>

                        {video.durationFormatted && (
                          <span className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                            {video.durationFormatted}
                          </span>
                        )}
                      </div>

                      {/* Info & Stats */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug group-hover:text-purple-400 transition-colors">
                            {video.title}
                          </h4>

                          <div className="flex items-center gap-2 mt-2">
                            {video.channelAvatar && (
                              <img
                                src={video.channelAvatar}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            )}
                            <span className="text-[11px] font-semibold text-slate-600 truncate">
                              {video.channelTitle} ({formatCompactNumber(video.channelSubs)} subs)
                            </span>
                          </div>
                        </div>

                        {/* Metrics Bar */}
                        <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 font-mono flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>{formatCompactNumber(video.views)}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Revenu publicitaire estimé">
                              ~{formatCompactNumber(video.estimatedAdRevenue)}€ Ads
                            </span>

                            <a
                              href={`https://www.youtube.com/watch?v=${video.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white hover:bg-purple-600 text-slate-400 hover:text-white transition-colors"
                              title="Ouvrir sur YouTube"
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
            </div>
          )}

          {/* Tab 2: Niche Finder & RPM Benchmark */}
          {tab === "niches" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span>Niches YouTube les Plus Rentables (RPM & Potentiel Sponsoring)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Les estimations de RPM (Revenu pour 1000 vues AdSense) et les dynamiques de croissance observées sur le marché.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularNiches.map((n, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 hover:border-purple-500/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-slate-900 text-base">{n.name}</h4>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {n.growth}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="text-slate-500 flex justify-between">
                          <span>RPM Estimé :</span>
                          <span className="font-bold text-slate-900 font-mono">{n.rpm}</span>
                        </p>
                        <p className="text-slate-500 flex justify-between">
                          <span>Concurrence :</span>
                          <span className="text-slate-700">{n.competition}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setNicheQuery(n.tag);
                        fetchOutliers(n.tag);
                        setTab("outliers");
                      }}
                      className="w-full py-2 rounded-xl bg-white hover:bg-purple-600 text-slate-600 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Scanner les Outliers</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: AI Ideation (TubeLab Ideas Generator) */}
          {tab === "ideation" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <span>Générateur de Concepts Viraux par IA (Groq Engine)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Générez des idées de vidéos optimisées pour le CTR (miniature, titre à suspense et hook d'accroche).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateIdeas(nicheQuery)}
                  disabled={generatingIdeas}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 disabled:opacity-50"
                >
                  {generatingIdeas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Régénérer d'autres idées</span>
                </button>
              </div>

              {generatingIdeas && (
                <div className="py-16 text-center text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                  Génération des concepts viraux en cours via Groq LLM...
                </div>
              )}

              {!generatingIdeas && aiConcepts && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line space-y-3">
                  {aiConcepts}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
