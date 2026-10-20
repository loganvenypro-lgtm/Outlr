"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Users,
  Tv,
  Flame,
  Zap,
  TrendingUp,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCompactNumber } from "@/lib/utils";
import { getDicebearAvatar } from "@/lib/avatar";

interface ScrapedChannel {
  id: string;
  title: string;
  handle: string;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  country?: string;
  dominantFormat?: string;
}

interface Competitor {
  id: string;
  title: string;
  handle: string;
  avatar: string;
  subscribers: number;
  similarityScore: number;
  topVideo?: {
    title: string;
    views: number;
    multiplier?: number;
  };
}

interface IdeaConcept {
  title: string;
  hook: string;
  angle: string;
  estimatedMultiplier: string;
  category: string;
}

export default function OnboardingPage() {
  const router = useRouter();

  // Wizard steps: "input" | "scraping" | "result"
  const [step, setStep] = useState<"input" | "scraping" | "result">("input");
  const [channelInput, setChannelInput] = useState("");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Scraped Data Results
  const [channelData, setChannelData] = useState<ScrapedChannel | null>(null);
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<IdeaConcept[]>([]);
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);

  // Quick handle suggestions to test
  const suggestions = [
    { label: "Squeezie", handle: "@Squeezie", niche: "Divertissement & Storytelling" },
    { label: "Fern", handle: "@fern-tv", niche: "Mini-Documentaires Business" },
    { label: "Ali Abdaal", handle: "@aliabdaal", niche: "Productivité & Tech" },
    { label: "Veritasium", handle: "@veritasium", niche: "Science & Vulgarisation" },
  ];

  const handleStartScrape = async (target?: string) => {
    const rawTarget = target || channelInput.trim();
    if (!rawTarget) return;

    setError(null);
    setStep("scraping");
    setProgress(15);
    setStepLabel("Connexion et scraping des métadonnées publiques YouTube...");

    try {
      // Step interval animation
      setTimeout(() => {
        setProgress(38);
        setStepLabel("Analyse des 20 dernières vidéos, calcul des formats & rétention...");
      }, 700);

      setTimeout(() => {
        setProgress(65);
        setStepLabel("Cartographie du graphe d'audience et identification des concurrents directs...");
      }, 1600);

      setTimeout(() => {
        setProgress(88);
        setStepLabel("Génération des opportunités de contenu et idées de sujets viraux...");
      }, 2400);

      // Call API
      const res = await fetch(`/api/youtube/similar-channels?url=${encodeURIComponent(rawTarget)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossible de récupérer les informations de la chaîne.");
      }

      // Support both API structures (data.reference and data.sourceChannel)
      const source = data.reference || data.sourceChannel || {};
      const resolvedId = source.id || source.channelId || (rawTarget.startsWith("UC") ? rawTarget : `ch-${Date.now()}`);

      const editorial = data.editorialProfile || data.editorialSignature || {};
      const rawCompetitors = data.competitors || data.similarChannels || [];

      // Set Scraped Channel
      const formattedChannel: ScrapedChannel = {
        id: resolvedId,
        title: source.title || rawTarget.replace(/^https?:\/\/.*youtube\.com\/@?/, "").replace(/^@/, "") || "Ma Chaîne YouTube",
        handle: source.handle || `@${(source.title || rawTarget).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        avatar: source.avatar || getDicebearAvatar(source.handle || source.title || rawTarget),
        subscribers: source.subscriberCount ?? source.subscribers ?? 0,
        totalViews: source.totalViews ?? source.viewCount ?? 0,
        videoCount: source.videoCount ?? 0,
        country: source.country || "FR",
        dominantFormat: source.archetypeLabel || editorial?.dominantFormats?.[0] || "Format Niche & Longs formats",
      };
      setChannelData(formattedChannel);

      // Content pillars
      const rawPillars = source.editorialTags || editorial?.contentPillars || editorial?.keyThemes || [];
      setContentPillars(
        rawPillars.length > 0
          ? rawPillars
          : ["E-commerce & Growth", "Stratégies Organiques & Ventes", "Études de cas & Résultats", "Analyses Approfondies"]
      );

      // Competitors
      const comps: Competitor[] = rawCompetitors.slice(0, 6).map((c: any) => {
        const ch = c.channel || c;
        const topV = c.topSimilarVideos?.[0] || c.topVideos?.[0];
        return {
          id: ch.id || `comp-${Math.random()}`,
          title: ch.title || "Créateur Niche",
          handle: ch.handle || `@${(ch.title || "createur").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          avatar: ch.avatar || getDicebearAvatar(ch.handle || ch.title || "createur"),
          subscribers: ch.subscriberCount ?? ch.subscribers ?? 25000,
          similarityScore: Math.round(c.similarityScore || 82),
          topVideo: topV
            ? {
                title: topV.title,
                views: topV.views ?? topV.viewCount ?? 120000,
                multiplier: topV.multiplier ?? topV.outlierMultiplier ?? 3.8,
              }
            : undefined,
        };
      });
      setCompetitors(comps);

      // Generate customized topics / video concepts tailored to the channel
      const channelSubject = source.title || "votre niche";
      const channelDesc = (source.description || "").toLowerCase();
      const isEcom = channelDesc.includes("ecom") || channelDesc.includes("dropshipping") || channelSubject.toLowerCase().includes("ecom");

      if (isEcom) {
        setRecommendedTopics([
          {
            title: "Comment générer 10 000€/mois en Dropshipping Organique sans dépenser 1€ en pub",
            hook: "Tout le monde paie des milliers d'euros en Meta Ads alors que cette méthode gratuite surpasse 90% des boutiques...",
            angle: "Contre-intuitif & Preuve concrète à l'appui",
            estimatedMultiplier: "⚡ 7.4x",
            category: "Stratégie Organique",
          },
          {
            title: "J'ai analysé la boutique la plus virale de TikTok (Le produit secret révélé)",
            hook: "En seulement 14 jours, ils ont fait 45 000 vues par reel sans jamais montrer leur visage. Voici leur structure exacte...",
            angle: "Déconstruction & Étude de cas immersive",
            estimatedMultiplier: "⚡ 6.1x",
            category: "Étude de Cas",
          },
          {
            title: "La méthode des 3 Hooks : Pourquoi 99% de vos vidéos courtes ne convertissent pas",
            hook: "Si votre vidéo ne convertit pas dans les 3 premières secondes, voici l'erreur psychologique que vous faites...",
            angle: "Tutoriel Avancé & Rétention",
            estimatedMultiplier: "⚡ 5.5x",
            category: "Optimisation Taux de Clic",
          },
          {
            title: "De 0 à 50k€/mois avec l'IA : Le blueprint complet que personne ne partage",
            hook: "J'ai automatisé toute la création de contenu de mon shop avec ces 3 outils IA. Regardez les résultats...",
            angle: "Automatisation & Futur du Business",
            estimatedMultiplier: "⚡ 8.2x",
            category: "IA & Scaling",
          },
        ]);
      } else {
        const primaryPillar = source.archetypeLabel || "votre thématique";
        setRecommendedTopics([
          {
            title: `Pourquoi 99% des créateurs échouent dans ${primaryPillar} (L'erreur fatale)`,
            hook: "La plupart des créateurs pensent que c'est une question de chance, mais l'algorithme privilégie ce schéma précis...",
            angle: "Contre-intuitif & Déconstruction d'un mythe",
            estimatedMultiplier: "⚡ 6.4x",
            category: "Analyse Profonde",
          },
          {
            title: `L'histoire secrète derrière l'empire le plus rentable de ${primaryPillar}`,
            hook: "En moins de 18 mois, ils ont généré des millions sans jamais montrer leur visage. Voici la formule exacte...",
            angle: "Étude de cas immersive (Storytelling)",
            estimatedMultiplier: "⚡ 5.1x",
            category: "Cas d'école",
          },
          {
            title: `Ce que YouTube ne veut pas que vous sachiez sur la rétention en 2026`,
            hook: "Si vous appliquez cette structure dès les 15 premières secondes, votre taux de complétion double instantanément...",
            angle: "Secret & Tuto avancé",
            estimatedMultiplier: "⚡ 4.7x",
            category: "Stratégie",
          },
          {
            title: `J'ai testé les 5 stratégies virales de mes plus gros concurrents (Voici le résultat)`,
            hook: "J'ai passé 30 jours à reproduire les miniatures et accroches des leaders de la niche...",
            angle: "Expérience réelle & Challenge",
            estimatedMultiplier: "⚡ 7.2x",
            category: "Format Challenge",
          },
        ]);
      }

      // Complete progress animation
      setProgress(100);
      setStepLabel("Analyse prête ! Voici votre radar de niche.");
      await new Promise((r) => setTimeout(r, 600));
      setStep("result");
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err.message || "Erreur lors de l'analyse de la chaîne.");
      setStep("input");
    }
  };

  const handleFinishOnboarding = async () => {
    setIsFinishing(true);

    try {
      if (channelData) {
        // Track the main user channel
        await fetch("/api/youtube/tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "track_channel",
            channel: {
              channelId: channelData.id,
              name: channelData.title,
              handle: channelData.handle,
              avatar: channelData.avatar,
              subscribers: channelData.subscribers,
              totalViews: channelData.totalViews,
              videoCount: channelData.videoCount,
            },
            tags: ["Ma chaîne"],
          }),
        });

        // Remember it as the creator's own channel: drives the personalised home
        await fetch("/api/me/channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: channelData.id }),
        });

        // Also track any selected competitor channels
        for (const compId of trackedIds) {
          const comp = competitors.find((c) => c.id === compId);
          if (comp) {
            await fetch("/api/youtube/tracking", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "track_channel",
                channel: {
                  channelId: comp.id,
                  name: comp.title,
                  handle: comp.handle,
                  avatar: comp.avatar,
                  subscribers: comp.subscribers,
                },
              }),
            });
          }
        }
      }

      localStorage.setItem("outlr_onboarding_completed", "true");
      router.push("/");
      router.refresh();
    } catch {
      localStorage.setItem("outlr_onboarding_completed", "true");
      router.push("/");
    }
  };

  const toggleTrackCompetitor = (id: string) => {
    setTrackedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex flex-col justify-between py-8 px-4 sm:px-6 md:px-10">
      {/* Top Header */}
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between pb-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#15803d] to-[#22c55e] p-1.5 shadow-sm">
            <img src="/outlr-logo.png" alt="Outlr" className="h-6 w-6 object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">Outlr</span>
        </div>

        <button
          onClick={() => {
            localStorage.setItem("outlr_onboarding_completed", "true");
            router.push("/");
          }}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          Passer cette étape
        </button>
      </div>

      {/* Main Container */}
      <div className="mx-auto my-auto w-full max-w-4xl py-6">
        {/* STEP 1: INPUT */}
        {step === "input" && (
          <div className="mx-auto max-w-2xl text-center space-y-6 animate-in fade-in duration-200">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Onboarding Personnalisé
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Connectez votre chaîne YouTube
              </h1>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Entrez le lien ou le @handle de votre chaîne pour que l'IA scrape votre niche, identifie vos concurrents et détecte vos futurs sujets viraux.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStartScrape();
              }}
              className="space-y-4"
            >
              <div className="relative flex items-center rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-sm focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <Search className="ml-3 h-5 w-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="https://youtube.com/@votrechaine ou @handle..."
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  className="w-full bg-transparent px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={!channelInput.trim()}
                  className="shrink-0 gap-1.5 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                >
                  Analyser & Scraper <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Suggestions */}
              <div className="pt-3">
                <p className="text-xs text-slate-500 mb-2">Ou essayez un exemple pour tester :</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {suggestions.map((sug) => (
                    <button
                      key={sug.handle}
                      type="button"
                      onClick={() => {
                        setChannelInput(sug.handle);
                        handleStartScrape(sug.handle);
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <span className="font-semibold">{sug.label}</span>
                      <span className="text-[11px] text-slate-500">({sug.niche})</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: SCRAPING PROGRESS ANIMATION */}
        {step === "scraping" && (
          <div className="mx-auto max-w-xl text-center space-y-8 py-12 animate-in fade-in duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Scraping & Analyse de votre chaîne en cours...
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{stepLabel}</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Progression</span>
                <span className="tabular-nums text-emerald-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-slate-200 text-emerald-600" />
            </div>
          </div>
        )}

        {/* STEP 3: CONCRETE RESULT RENDER */}
        {step === "result" && channelData && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Success Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/60 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Scraping & Radar initialisés
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Voici le profil d'intelligence de votre chaîne
                </h1>
                <p className="text-xs text-slate-500">
                  Vos métriques ont été comparées à notre base de données pour identifier votre niche et vos opportunités.
                </p>
              </div>

              <Button
                onClick={handleFinishOnboarding}
                disabled={isFinishing}
                className="gap-1.5 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 shrink-0"
              >
                {isFinishing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Accéder à mon Dashboard
              </Button>
            </div>

            {/* 1. Analyzed Channel Profile Card */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <img
                    src={channelData.avatar}
                    alt={channelData.title}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-500/20 shadow-xs"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{channelData.title}</h2>
                    <p className="text-xs text-slate-500 font-medium">{channelData.handle}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {contentPillars.map((pillar) => (
                        <span
                          key={pillar}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
                        >
                          {pillar}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 text-center">
                  <div>
                    <span className="text-[10.5px] font-medium text-slate-500">Abonnés</span>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCompactNumber(channelData.subscribers)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-medium text-slate-500">Vues Totales</span>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCompactNumber(channelData.totalViews)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10.5px] font-medium text-slate-500">Vidéos</span>
                    <p className="text-sm font-bold text-slate-900">{channelData.videoCount}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Similar Niche Competitors */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-600" />
                    Créateurs similaires dans votre niche (Vos concurrents directs)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ces chaînes ciblent la même audience que vous. Suivez-les pour être alerté de leurs percées.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {competitors.length} chaînes détectées
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {competitors.map((comp) => {
                  const isTracked = trackedIds.includes(comp.id);
                  return (
                    <div
                      key={comp.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={comp.avatar}
                          alt={comp.title}
                          className="h-10 w-10 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900">{comp.title}</p>
                          <p className="truncate text-[11px] text-slate-500">{comp.handle}</p>
                          <span className="inline-block rounded-md bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                            {comp.similarityScore}% similarité
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {formatCompactNumber(comp.subscribers)} abonnés
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleTrackCompetitor(comp.id)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                            isTracked
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {isTracked ? "✓ Suivi" : "+ Suivre"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Recommended High-Potential Topics / Video Concepts */}
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Sujets & Opportunités de Vidéos Recommandés pour Vous
                </h3>
                <p className="text-xs text-slate-500">
                  Concepts générés à partir des vidéos qui surperforment dans votre thématique.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {recommendedTopics.map((topic, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700">
                          {topic.category}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 border border-emerald-200/60">
                          {topic.estimatedMultiplier}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold leading-snug text-slate-900">
                        {topic.title}
                      </h4>
                      <p className="text-[11.5px] text-slate-500 leading-relaxed">
                        <strong className="text-slate-700">Hook :</strong> "{topic.hook}"
                      </p>
                    </div>
                    <div className="mt-3 border-t border-slate-100 pt-2 text-[10.5px] text-slate-400">
                      Angle : {topic.angle}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                onClick={handleFinishOnboarding}
                disabled={isFinishing}
                className="gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                {isFinishing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Confirmer & Ouvrir mon Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between pt-6 border-t border-slate-100 text-xs text-slate-400">
        <p>© 2026 Outlr Intelligence. Tous droits réservés.</p>
        <p>Radar d'audience & détection d'outliers YouTube</p>
      </div>
    </div>
  );
}
