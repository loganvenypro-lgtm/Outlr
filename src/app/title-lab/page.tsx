"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber } from "@/lib/utils";
import {
  Sparkles,
  Zap,
  Target,
  Copy,
  Check,
  Flame,
  TrendingUp,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  Tv,
  CheckCircle2,
  Bookmark
} from "lucide-react";

export default function TitleLabPage() {
  const [topic, setTopic] = useState("Minecraft Hardcore Survival");
  const [angle, setAngle] = useState("Extreme Curiosity & Challenge");
  const [channelContext, setChannelContext] = useState("Gaming & Entertainment channel");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const anglePresets = [
    { label: "Documentaire & Intrigue", value: "Mini-documentaire sombre, investigation & rabbit hole" },
    { label: "Défis & Expérience 30 jours", value: "Challenge personnel, résultats avant/après, 100 jours" },
    { label: "Avis à contre-courant / Erreurs", value: "Aversion à la perte, erreurs fatales, révélation choquante" },
    { label: "Business & Chute d'empire", value: "Ascension et chute, faillite, secrets d'argent" },
    { label: "Tutoriel Ultra-Efficace", value: "Gain de temps massif, méthode secrète pour débutants" },
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/youtube/title-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, angle, channelContext }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="min-h-full bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          title="Title & Packaging Lab"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Title & Packaging Lab", href: "/title-lab" },
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-b from-[#0f172a] to-[#0b101e] border border-slate-200 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>Optimisation de Taux de Clic (CTR) & Packaging Psychologique</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Title & Packaging Lab
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Générez des titres calibrés pour maximiser votre CTR (&gt; 10%), identifiez les déclencheurs psychologiques de clic et obtenez des directives visuelles précises pour vos miniatures.
            </p>

            {/* Input Form */}
            <form onSubmit={handleGenerate} className="pt-3 space-y-3 max-w-3xl">
              <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-white border border-slate-200 focus-within:border-blue-500 rounded-xl p-1.5 shadow-xl transition-all">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Sujet de votre future vidéo (ex: IA vs Développeurs, Investir en bourse à 20 ans)..."
                  className="flex-1 bg-transparent text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none px-3"
                  required
                />
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Générer les Packagings</span>
                </button>
              </div>

              {/* Angles presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Angle psychologique :</span>
                {anglePresets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setAngle(p.value);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      angle === p.value
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-20 text-center space-y-3 bg-white border border-slate-200 rounded-2xl p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
              <p className="text-xs text-slate-500">
                Analyse des vidéos virales sur YouTube et modélisation des formules de titres à fort CTR...
              </p>
            </div>
          )}

          {/* Results Grid */}
          {!loading && results && (
            <div className="space-y-6">
              {/* Generated Titles Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span>Titres & Formules de Clic Suggérées ({results.generatedTitles?.length})</span>
                  </div>
                  <span className="text-slate-500 font-normal normal-case text-[11px]">
                    Basé sur les formats de hooks les plus cliqués
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.generatedTitles?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl p-5 shadow-xl transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Badges Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            Score CTR : {item.score}/100
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">
                            {item.ctrBenchmark || "CTR Élevé"}
                          </span>
                        </div>

                        {/* Title text */}
                        <div className="flex items-start justify-between gap-2 pt-1">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                            {item.title}
                          </h3>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.title, idx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
                            title="Copier le titre"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Hook type & Trigger */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-medium border border-blue-500/20">
                            Hook : {item.hookType}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-medium border border-purple-500/20">
                            Levier : {item.psychologicalTrigger}
                          </span>
                        </div>
                      </div>

                      {/* Thumbnail Visual Idea */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>Idée de Miniature Associée :</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {item.thumbnailVisualIdea}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real YouTube Viral Benchmarks */}
              {results.realViralBench?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span>Miniatures & Titres Viraux Réels sur YouTube pour ce sujet</span>
                    </div>
                    <span className="text-[11px] text-slate-500">Classé par nombre de vues</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {results.realViralBench.map((v: any) => (
                      <a
                        key={v.id}
                        href={`https://www.youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col bg-white border border-slate-200 hover:border-blue-500/50 rounded-xl overflow-hidden transition-all"
                      >
                        <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                          <img
                            src={v.thumbnail}
                            alt=""
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/80 text-white font-mono text-[9px] font-bold">
                            {v.durationFormatted}
                          </div>
                        </div>

                        <div className="p-2 space-y-1 flex-1 flex flex-col justify-between">
                          <h4 className="text-[11px] font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                            {v.title}
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold block pt-1">
                            {formatCompactNumber(v.views)} vues
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
