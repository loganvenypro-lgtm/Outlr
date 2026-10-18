"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  SimilarChannelsEngineResponse, 
  CompetitorChannel, 
  ChannelEditorialProfile 
} from "@/types/competitorEngine";
import {
  Search,
  Sparkles,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Users,
  Compass,
  Zap,
  Globe,
  RotateCcw,
  Check,
  Plus,
  Play,
  Layers,
  BarChart2,
  Calendar,
  AlertCircle,
  Loader2,
  Share2,
  ArrowRight,
  FolderPlus,
  Film,
  BookOpen
} from "lucide-react";

function SimilarChannelsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL input
  const initialUrl = searchParams.get("url") || "";
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SimilarChannelsEngineResponse | null>(null);

  // Analysis Stages Definition
  const analysisSteps = [
    { title: "Résolution de la chaîne", desc: "Vérification de l'ID, avatar, stats et métadonnées publiques..." },
    { title: "Extraction de l'ADN Éditorial", desc: "Analyse des 20 dernières vidéos, durée moyenne, titres et piliers de contenu..." },
    { title: "Exploration du Graphe d'Audience", desc: "Recherche des chaînes qui captent la même audience et co-occurrences YouTube..." },
    { title: "Calcul de Similarité & Scoring", desc: "Comparaison des formules de titres, rythme de rétention et intention d'audience..." },
  ];

  // Filters
  const [minScore, setMinScore] = useState<number>(30);
  const [sizeFilter, setSizeFilter] = useState<"all" | "smaller" | "similar" | "larger">("all");
  const [marketCountry, setMarketCountry] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"score" | "subscribers" | "views">("score");

  // Track state
  const [trackingLoadingId, setTrackingLoadingId] = useState<string | null>(null);
  const [trackedSuccessIds, setTrackedSuccessIds] = useState<string[]>([]);

  const fetchSimilarChannels = async (target: string) => {
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setLoadingStep(0);
    setProgressPercent(15);

    // Step animation intervals
    const interval1 = setTimeout(() => {
      setLoadingStep(1);
      setProgressPercent(40);
    }, 700);

    const interval2 = setTimeout(() => {
      setLoadingStep(2);
      setProgressPercent(70);
    }, 1500);

    const interval3 = setTimeout(() => {
      setLoadingStep(3);
      setProgressPercent(90);
    }, 2300);

    try {
      const res = await fetch(`/api/youtube/similar-channels?url=${encodeURIComponent(target)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Impossible de trouver des chaînes similaires");
      }
      setProgressPercent(100);
      setData(json);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche de concurrents");
    } finally {
      clearTimeout(interval1);
      clearTimeout(interval2);
      clearTimeout(interval3);
      setTimeout(() => {
        setLoading(false);
      }, 350);
    }
  };

  useEffect(() => {
    if (initialUrl && initialUrl.trim()) {
      fetchSimilarChannels(initialUrl);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    fetchSimilarChannels(inputUrl.trim());
  };

  const handleTrackChannel = async (cand: CompetitorChannel) => {
    setTrackingLoadingId(cand.channel.id);
    try {
      const res = await fetch("/api/youtube/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track_channel",
          channel: {
            channelId: cand.channel.id,
            name: cand.channel.title,
            handle: cand.channel.handle,
            avatar: cand.channel.avatar,
            subscribers: cand.channel.subscriberCount,
            totalViews: cand.channel.totalViews,
            videoCount: cand.channel.videoCount,
          },
          notes: `Concurrent détecté pour ${data?.reference.title} (${cand.channel.archetypeLabel})`,
        }),
      });

      if (res.ok) {
        setTrackedSuccessIds((prev) => [...prev, cand.channel.id]);
      }
    } catch (err) {
      console.error("Error tracking channel:", err);
    } finally {
      setTrackingLoadingId(null);
    }
  };

  // Filter candidates
  const filteredCandidates = (data?.competitors || []).filter((c) => {
    if (c.similarityScore < minScore) return false;

    // Audience scale filter
    if (data?.reference.subscriberCount && data.reference.subscriberCount > 0 && c.channel.subscriberCount > 0) {
      const refSubs = data.reference.subscriberCount;
      const cSubs = c.channel.subscriberCount;
      if (sizeFilter === "smaller" && cSubs >= refSubs) return false;
      if (sizeFilter === "larger" && cSubs <= refSubs) return false;
      if (sizeFilter === "similar" && (cSubs < refSubs * 0.25 || cSubs > refSubs * 4)) return false;
    }

    // Country filter
    if (marketCountry !== "all" && c.channel.country) {
      if (c.channel.country.toUpperCase() !== marketCountry.toUpperCase()) return false;
    }

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const match = c.channel.title.toLowerCase().includes(q) || 
        c.channel.description.toLowerCase().includes(q) ||
        c.breakdown.sharedTopics.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Sort candidates
  filteredCandidates.sort((a, b) => {
    if (sortBy === "score") return b.similarityScore - a.similarityScore;
    if (sortBy === "subscribers") return b.channel.subscriberCount - a.channel.subscriberCount;
    if (sortBy === "views") return b.channel.typicalViews - a.channel.typicalViews;
    return b.similarityScore - a.similarityScore;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score >= 60) return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  };

  return (
    <div className="flex min-h-screen bg-[#080c14]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          title="Similar Channels & True Competitors Engine"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Similar Channels", href: "/dashboard/similar-channels" },
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-b from-[#0f172a] to-[#0b101e] border border-[#1e293b] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl space-y-4">
            <div className="max-w-3xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                <span>Même Niche & Audience Partagée — Graphe de Co-occurrence YouTube</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Trouver les Chaînes de ta Niche (Même Audience)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Entre l'URL ou le @handle de ta chaîne (ou de n'importe quelle chaîne de référence). Notre moteur analyse en direct les métadonnées, le rythme, les formules de titres et les co-occurrences YouTube pour te sortir tous les créateurs de la même niche qui attirent et captent la même audience que toi.
              </p>
            </div>

            {/* Input URL Form */}
            <form onSubmit={handleSubmit} className="pt-2 max-w-2xl">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#080d1a] border border-[#1e2a44] focus-within:border-blue-500 rounded-xl p-1.5 shadow-xl transition-all">
                <div className="flex items-center flex-1 px-2.5">
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Entrez une chaîne ou @handle (ex: fern, @Veritasium, MrBeast)..."
                    className="w-full bg-transparent text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !inputUrl.trim()}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Découvrir les concurrents</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-2">
                <span>Essais populaires :</span>
                {["fern", "@Veritasium", "MrBeast", "MagnatesMedia", "JohnnyHarris"].map((demo) => (
                  <button
                    key={demo}
                    type="button"
                    onClick={() => {
                      setInputUrl(demo);
                      fetchSimilarChannels(demo);
                    }}
                    className="text-slate-400 hover:text-blue-400 underline underline-offset-2"
                  >
                    {demo}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Reference Channel Editorial Profile */}
          {data?.reference && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <img
                    src={data.reference.avatar}
                    alt={data.reference.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-16 h-16 rounded-full border-2 border-blue-500/40 object-cover shrink-0 shadow-lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-white">{data.reference.title}</h2>
                      <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                        Chaîne Référence
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block">{data.reference.handle}</span>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-1 max-w-xl">
                      {data.reference.description || "Aucune description renseignée."}
                    </p>
                  </div>
                </div>

                {/* Reference Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shrink-0 bg-[#090f1d] p-3.5 rounded-xl border border-[#162238]">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Abonnés</span>
                    <span className="font-extrabold text-white text-sm block">
                      {data.reference.subscriberCount > 0 ? formatCompactNumber(data.reference.subscriberCount) : "Masqués"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Médiane Vues</span>
                    <span className="font-extrabold text-emerald-400 text-sm block">
                      ~{formatCompactNumber(data.reference.typicalViews)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Durée Moy.</span>
                    <span className="font-extrabold text-white text-sm block">
                      {data.reference.avgDurationFormatted}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Vidéos</span>
                    <span className="font-extrabold text-white text-sm block">
                      {data.reference.videoCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Moat: Reference Audience Demographics & Intent Card */}
              {data.reference.demographics && (
                <div className="bg-[#090f1d] p-3.5 rounded-xl border border-[#1a263d] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Tranche d'Âge Principale</span>
                    <span className="font-mono text-purple-400 font-bold text-sm block mt-0.5">
                      {data.reference.demographics.primaryAgeBracket} ans
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {data.reference.demographics.estimatedGenderSplit.male}% Hommes / {data.reference.demographics.estimatedGenderSplit.female}% Femmes
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Intention d'Audience</span>
                    <span className="font-bold text-amber-400 text-xs block mt-0.5">
                      {data.reference.demographics.intentArchetype}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Signature : {data.reference.demographics.retentionSignature}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cœur Géographique</span>
                    <span className="font-mono text-blue-400 font-bold text-xs block mt-0.5">
                      {data.reference.demographics.geographicCore.join(", ")}
                    </span>
                    <span className="text-[10px] text-slate-500">Tier 1 Top Reach</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Fourchette RPM Estimée</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm block mt-0.5">
                      {data.reference.demographics.estimatedPacingRPM}
                    </span>
                    <span className="text-[10px] text-slate-500">Par tranche de 1K vues</span>
                  </div>
                </div>
              )}

              {/* Editorial Signature Block */}
              <div className="pt-4 border-t border-[#1a253a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Archétype : {data.reference.archetypeLabel}</span>
                  </span>

                  {data.reference.editorialTags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-[#121c32] text-slate-300 border border-[#1d2a48] text-[11px]">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  {data.competitors.length} concurrents évalués en {data.executionTimeMs}ms
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          {data && !loading && (
            <div className="bg-[#0e1628] border border-[#1e2a44] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Similarité min :</span>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    step="5"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
                    className="accent-blue-500 w-24"
                  />
                  <span className="font-mono text-white font-bold">{minScore}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Taille d'audience :</span>
                  <select
                    value={sizeFilter}
                    onChange={(e) => setSizeFilter(e.target.value as any)}
                    className="bg-[#080d1a] border border-[#1e2b47] rounded-lg px-2.5 py-1 text-white focus:outline-none"
                  >
                    <option value="all">Toutes tailles</option>
                    <option value="smaller">Plus petites (Émergentes)</option>
                    <option value="similar">Taille similaire (0.25x - 4x)</option>
                    <option value="larger">Plus grandes</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Marché :</span>
                  <select
                    value={marketCountry}
                    onChange={(e) => setMarketCountry(e.target.value)}
                    className="bg-[#080d1a] border border-[#1e2b47] rounded-lg px-2.5 py-1 text-white focus:outline-none"
                  >
                    <option value="all">Tous pays</option>
                    <option value="US">🇺🇸 USA</option>
                    <option value="FR">🇫🇷 France</option>
                    <option value="GB">🇬🇧 UK</option>
                    <option value="CA">🇨🇦 Canada</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Trier par :</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#080d1a] border border-[#1e2b47] rounded-lg px-2.5 py-1 text-white focus:outline-none"
                  >
                    <option value="score">Score Éditorial (Recommandé)</option>
                    <option value="subscribers">Nombre d'abonnés</option>
                    <option value="views">Vues typiques</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrer créateur..."
                    className="bg-[#080d1a] border border-[#1e2b47] rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none w-32"
                  />
                </div>
              </div>

              <div className="text-slate-400 text-[11px]">
                <strong>{filteredCandidates.length}</strong> concurrents directs qualifiés
              </div>
            </div>
          )}

          {/* Loading State with Progress Bar */}
          {loading && (
            <div className="py-12 px-6 sm:px-12 space-y-6 bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl max-w-3xl mx-auto">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyse Concurrentielle & Même Niche</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Analyse de la chaîne en cours...
                </h3>
                <p className="text-xs text-slate-400">
                  Détection des créateurs qui partagent votre audience cible et vos concepts de vidéos.
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-blue-400 font-bold flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{analysisSteps[loadingStep]?.title || "Traitement..."}</span>
                  </span>
                  <span className="text-white font-black">{progressPercent}%</span>
                </div>

                <div className="w-full h-3 bg-[#080d1a] rounded-full overflow-hidden border border-[#1e2b47] p-0.5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 shadow-md shadow-blue-500/50"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  {analysisSteps[loadingStep]?.desc}
                </p>
              </div>

              {/* Visual Step Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {analysisSteps.map((step, idx) => {
                  const isDone = loadingStep > idx || progressPercent === 100;
                  const isCurrent = loadingStep === idx && progressPercent < 100;

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                        isDone
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                          : isCurrent
                          ? "bg-blue-950/30 border-blue-500/40 text-blue-200 ring-1 ring-blue-500/30"
                          : "bg-[#090f1d] border-[#162035] text-slate-500"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          isDone
                            ? "bg-emerald-500 text-black"
                            : isCurrent
                            ? "bg-blue-600 text-white animate-pulse"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold block truncate">{step.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-[#0f172a] border border-rose-900/50 rounded-2xl p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Recherche impossible</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
            </div>
          )}

          {/* Competitors Candidate Grid */}
          {!loading && !error && filteredCandidates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCandidates.map((cand) => {
                const isTracked = trackedSuccessIds.includes(cand.channel.id);
                const isTracking = trackingLoadingId === cand.channel.id;

                return (
                  <div
                    key={cand.channel.id}
                    className="bg-[#0f172a] border border-[#1e293b] hover:border-blue-500/50 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between space-y-4 group"
                  >
                    {/* Header: Candidate Info & Score Pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => router.push(`/channel/${cand.channel.id}`)}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity min-w-0"
                      >
                        <img
                          src={cand.channel.avatar}
                          alt={cand.channel.title}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-12 h-12 rounded-full border border-slate-700 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-blue-400 transition-colors">
                              {cand.channel.title}
                            </h3>
                            {cand.coOccurrenceCount >= 2 && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                                {cand.coOccurrenceCount}x dans le graphe
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block truncate">{cand.channel.handle}</span>
                        </div>
                      </div>

                      {/* Similarity Badge */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-black border inline-flex items-center gap-1 ${getScoreColor(
                            cand.similarityScore
                          )}`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{cand.similarityScore}% Match</span>
                        </span>
                      </div>
                    </div>

                    {/* Explanatory Alignment Pill */}
                    <p className="text-[11px] text-slate-300 bg-[#090f1d] p-2.5 rounded-xl border border-[#162238] leading-relaxed">
                      {cand.breakdown.comparableExplanations}
                    </p>

                    {/* Data Moats: Audience Overlap & Packaging Similarity */}
                    <div className="bg-[#090f1d] p-2.5 rounded-xl border border-[#162238] grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Audience Commune</span>
                        <span className="font-mono text-emerald-400 font-extrabold text-xs block mt-0.5">
                          {cand.audienceOverlapRatio}%
                        </span>
                        <span className="text-[9px] text-slate-500">Intersection directe</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Cible Démographique</span>
                        <span className="font-mono text-purple-400 font-extrabold text-xs block mt-0.5">
                          {cand.audienceDemographics.primaryAgeBracket} ans
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {cand.audienceDemographics.estimatedGenderSplit.male}% H / {cand.audienceDemographics.estimatedGenderSplit.female}% F
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Packaging & CTR Match</span>
                        <span className="font-mono text-blue-400 font-extrabold text-xs block mt-0.5">
                          {cand.packagingSimilarity}%
                        </span>
                        <span className="text-[9px] text-slate-500">Style Miniatures</span>
                      </div>
                    </div>

                    {/* Breakdown Scores Bars */}
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Archétype Éditorial (35%)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-purple-500 h-full rounded-full"
                              style={{ width: `${cand.breakdown.editorialArchetypeScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-300 font-bold">
                            {cand.breakdown.editorialArchetypeScore}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Sujets Communs (25%)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${cand.breakdown.semanticTopicScore}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-300 font-bold">
                            {cand.breakdown.semanticTopicScore}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Formule Titre & Format (30%)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.round((cand.breakdown.titleFormulaScore + cand.breakdown.formatPacingScore) / 2)}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-300 font-bold">
                            {Math.round((cand.breakdown.titleFormulaScore + cand.breakdown.formatPacingScore) / 2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Candidate Sample Videos */}
                    {cand.topSimilarVideos.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Vidéos représentatives de son storytelling :
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {cand.topSimilarVideos.map((v) => (
                            <a
                              key={v.id}
                              href={`https://www.youtube.com/watch?v=${v.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/v relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800 block"
                            >
                              <img
                                src={v.thumbnail}
                                alt=""
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                className="w-full h-full object-cover group-hover/v:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                                <span className="text-[9px] text-slate-200 truncate font-medium">
                                  {formatCompactNumber(v.views)} vues
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="pt-3 border-t border-[#1a253a] flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
                        <span>{formatCompactNumber(cand.channel.subscriberCount)} abonnés</span>
                        <span>•</span>
                        <span>~{formatCompactNumber(cand.channel.typicalViews)} vues typ.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Direct Track Button */}
                        <button
                          type="button"
                          onClick={() => handleTrackChannel(cand)}
                          disabled={isTracking || isTracked}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                            isTracked
                              ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                              : "bg-[#141f36] hover:bg-[#1a2947] text-slate-300 hover:text-white border-[#1e2d4d]"
                          }`}
                        >
                          {isTracked ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Suivi</span>
                            </>
                          ) : isTracking ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-blue-400" />
                              <span>Suivre</span>
                            </>
                          )}
                        </button>

                        {/* Analyze Button */}
                        <button
                          type="button"
                          onClick={() => router.push(`/channel/${cand.channel.id}`)}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>Analyser</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SimilarChannelsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#080c14] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <SimilarChannelsContent />
    </Suspense>
  );
}
