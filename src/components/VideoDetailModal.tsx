"use client";

import { useState, useEffect } from "react";
import { formatCompactNumber, formatFullNumber, formatDate } from "@/lib/utils";
import { VideoDetailCardData } from "@/types/videoCard";
import {
  X,
  ExternalLink,
  Flame,
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  Sparkles,
  Layers,
  History,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  Calendar,
  Share2,
  Tag
} from "lucide-react";

interface VideoDetailModalProps {
  videoId: string | null;
  onClose: () => void;
  onFindSimilar?: (videoTitle: string) => void;
}

export function VideoDetailModal({ videoId, onClose, onFindSimilar }: VideoDetailModalProps) {
  const [data, setData] = useState<VideoDetailCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "ab_tests" | "velocity" | "similar">("ab_tests");
  
  // Similar Videos state
  const [similarVideos, setSimilarVideos] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;

    setLoading(true);
    setError(null);
    setSimilarVideos([]);
    setSimilarError(null);
    setActiveTab("ab_tests");

    fetch(`/api/youtube/video-details?videoId=${encodeURIComponent(videoId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de charger l'historique de cette vidéo");
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [videoId]);

  if (!videoId) return null;

  const handleFetchSimilar = () => {
    setActiveTab("similar");
    if (similarVideos.length > 0 || loadingSimilar || !data) return;

    setLoadingSimilar(true);
    setSimilarError(null);

    fetch(`/api/youtube/similar-videos?videoId=${encodeURIComponent(data.id)}&title=${encodeURIComponent(data.title)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de trouver des vidéos similaires");
        return res.json();
      })
      .then((json) => {
        setSimilarVideos(json.similarVideos || []);
      })
      .catch((err) => {
        setSimilarError(err.message || "Erreur de recherche");
      })
      .finally(() => {
        setLoadingSimilar(false);
      });
  };

  const copyText = (t: string) => {
    navigator.clipboard.writeText(t);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Analyse Complète & Historique A/B Testing</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                  Tracké
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Variations de titres, tests de miniatures et courbe de vélocité sur 24h.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-white">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-xs text-slate-500">
                Extraction des A/B tests, des métadonnées et de la vélocité sur 24h...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-center space-y-2 text-rose-700 text-xs">
              <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              {/* Video Preview Card */}
              <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="relative aspect-video w-full sm:w-56 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                  <img
                    src={data.thumbnail}
                    alt={data.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                    {data.durationFormatted}
                  </div>
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                      {data.categoryName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Publié le {data.publishedFormatted}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                    {data.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={handleFetchSimilar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Trouver Vidéos Similaires</span>
                    </button>

                    <a
                      href={`https://www.youtube.com/watch?v=${data.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <button
                      type="button"
                      onClick={() => copyText(data.title)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] transition-colors"
                    >
                      {copiedTitle ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      <span>Copier titre</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-4 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("ab_tests")}
                  className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "ab_tests"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>A/B Tests Titres ({data.abTestHistory.titleHistory.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleFetchSimilar}
                  className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "similar"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Vidéos Similaires {similarVideos.length > 0 ? `(${similarVideos.length})` : ""}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("velocity")}
                  className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "velocity"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Courbe 24h & Vélocité</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === "overview"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Packaging & Mots Clés</span>
                </button>
              </div>

              {/* TAB 1: A/B TESTING TITLE & THUMBNAIL HISTORY */}
              {activeTab === "ab_tests" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {data.abTestHistory.titleHistory.map((variant, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          variant.isCurrent
                            ? "bg-blue-50/60 border-blue-200"
                            : "bg-white border-slate-200 opacity-90"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                variant.isCurrent
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {variant.type}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {variant.detectedAt}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xl">
                            {variant.title}
                          </p>
                        </div>

                        {variant.ctrImpact && (
                          <div className="shrink-0 text-right">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border inline-block ${
                                variant.isCurrent
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                            >
                              {variant.ctrImpact}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* A/B Thumbnail Variants */}
                  <div className="pt-2 space-y-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Variations de Miniatures Testées
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {data.abTestHistory.thumbnailHistory.map((thumb, idx) => (
                        <div
                          key={idx}
                          className={`border rounded-xl p-3 space-y-2 transition-all ${
                            thumb.isCurrent
                              ? "bg-blue-50/40 border-blue-200 shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img
                              src={thumb.url}
                              alt={thumb.label}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover"
                            />
                            {thumb.isCurrent ? (
                              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[9px] shadow-sm">
                                Gagnante (Actuelle)
                              </div>
                            ) : (
                              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-white/95 text-amber-700 font-bold text-[9px] border border-amber-200 shadow-sm">
                                {thumb.tag || "Variation testée"}
                              </div>
                            )}

                            {thumb.detectedAt && (
                              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white">
                                {thumb.detectedAt}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <span className="text-slate-800 font-semibold truncate">
                              {thumb.label}
                            </span>
                            <span className="text-emerald-600 font-mono font-bold shrink-0">
                              CTR ~{thumb.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Insights Note */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-blue-600 uppercase block">
                      Insights d'optimisation détectés :
                    </span>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-[11px]">
                      {data.abTestHistory.insights.map((ins, i) => (
                        <li key={i}>{ins}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: VELOCITY & 24H ESTIMATION */}
              {activeTab === "velocity" && (
                <div className="space-y-4">
                  {/* Big Velocity Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-sm">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Vues 24h Initiales
                      </span>
                      <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono">
                        {formatCompactNumber(data.velocity.views24hEstimated)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Sur les 24 premières heures</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-sm">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Vues sur 7 Jours
                      </span>
                      <span className="text-lg sm:text-xl font-black text-blue-600 font-mono">
                        {formatCompactNumber(data.velocity.views7dEstimated)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Phase de maturité précoce</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-sm">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Vélocité Moyenne
                      </span>
                      <span className="text-lg sm:text-xl font-black text-purple-600 font-mono">
                        ~{formatCompactNumber(data.velocity.currentVelocityPerHour)} /h
                      </span>
                      <span className="text-[10px] text-slate-500 block">Vues par heure estimées</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-sm">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">
                        Taux d'Engagement
                      </span>
                      <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                        {data.velocity.engagementRate}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">Likes + Commentaires</span>
                    </div>
                  </div>

                  {/* Distribution Bar visual */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Répartition des Vues dans le Temps :</span>
                      <span className="font-mono text-slate-900 font-bold">{formatFullNumber(data.viewCount)} vues totales</span>
                    </div>

                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${Math.min(100, (data.velocity.views24hEstimated / data.viewCount) * 100)}%` }}
                        title="Vues 24h"
                      />
                      <div
                        className="bg-blue-500 h-full"
                        style={{ width: `${Math.min(100, ((data.velocity.views7dEstimated - data.velocity.views24hEstimated) / data.viewCount) * 100)}%` }}
                        title="Vues Jour 2 à 7"
                      />
                      <div className="bg-purple-500 flex-1 h-full" title="Vues Long-terme" />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        24h ({Math.round((data.velocity.views24hEstimated / data.viewCount) * 100)}%)
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        7 Jours ({Math.round((data.velocity.views7dEstimated / data.viewCount) * 100)}%)
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Long-Terme
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PACKAGING & SEO METRICS */}
              {activeTab === "overview" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5 shadow-sm">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Score Packaging</span>
                      <span className="text-xl font-black text-emerald-600 font-mono">
                        {data.packaging.overallScore}/100
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5 shadow-sm">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Longueur du Titre</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {data.packaging.characterCount} car.
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {data.packaging.isOptimalLength ? "Idéal pour mobile" : "Attention à la troncature"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-0.5 shadow-sm">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Style d'Accroche</span>
                      <span className="text-sm font-bold text-blue-600 block truncate">
                        {data.packaging.hookStyle}
                      </span>
                    </div>
                  </div>

                  {/* Power Words Pills */}
                  {data.packaging.titlePowerWords.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Mots déclencheurs psychologiques détectés dans le titre :
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {data.packaging.titlePowerWords.map((pw, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold"
                          >
                            ⚡ {pw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description Box */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Extrait de Description :
                    </span>
                    <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 text-[11px] leading-relaxed line-clamp-4">
                      {data.description || "Aucune description renseignée."}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: SIMILAR VIDEOS (SCRAPED REAL-TIME INTELLIGENCE) */}
              {activeTab === "similar" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Vidéos Similaires & Concepts Concurrents</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Vidéos traitant du même concept ou angle viral avec leurs ratios d'outliers
                      </p>
                    </div>

                    {onFindSimilar && (
                      <button
                        type="button"
                        onClick={() => {
                          onFindSimilar(data.title);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Explorer dans Viral Videos</span>
                      </button>
                    )}
                  </div>

                  {loadingSimilar && (
                    <div className="py-16 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-6">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                      <p className="text-xs text-slate-500">
                        Scraping des vidéos similaires et calcul des ratios de performance...
                      </p>
                    </div>
                  )}

                  {similarError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center text-rose-700 text-xs">
                      {similarError}
                    </div>
                  )}

                  {!loadingSimilar && !similarError && similarVideos.length === 0 && (
                    <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2">
                      <p className="text-xs text-slate-500">Aucune vidéo similaire trouvée pour ce sujet précis.</p>
                      <button
                        type="button"
                        onClick={handleFetchSimilar}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Réessayer la recherche
                      </button>
                    </div>
                  )}

                  {!loadingSimilar && similarVideos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                      {similarVideos.map((sim) => (
                        <div
                          key={sim.id}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 flex flex-col justify-between space-y-2.5 transition-all group shadow-sm hover:shadow"
                        >
                          <div className="flex gap-3">
                            {/* Thumbnail */}
                            <a
                              href={`https://www.youtube.com/watch?v=${sim.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative aspect-video w-28 bg-slate-100 rounded-lg overflow-hidden shrink-0 block border border-slate-200"
                            >
                              <img
                                src={sim.thumbnail}
                                alt={sim.title}
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/85 text-white font-mono text-[9px] font-bold">
                                {sim.durationFormatted}
                              </div>
                            </a>

                            {/* Info */}
                            <div className="space-y-1 min-w-0 flex-1">
                              <a
                                href={`https://www.youtube.com/watch?v=${sim.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-blue-600 transition-colors leading-tight"
                                title={sim.title}
                              >
                                {sim.title}
                              </a>
                              <div className="text-[11px] text-slate-500 truncate">
                                {sim.channelTitle}
                              </div>
                            </div>
                          </div>

                          {/* Stats & Badges */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full font-black text-[10px] flex items-center gap-0.5 ${
                                  sim.outlierMultiplier >= 4
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                <Flame className="w-3 h-3 fill-current" />
                                <span>{sim.outlierMultiplier}x</span>
                              </span>

                              <span className="text-slate-700 font-semibold font-mono">
                                {formatCompactNumber(sim.viewCount)} vues
                              </span>
                            </div>

                            <a
                              href={`https://www.youtube.com/watch?v=${sim.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold text-[10px]"
                            >
                              <span>Voir</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
