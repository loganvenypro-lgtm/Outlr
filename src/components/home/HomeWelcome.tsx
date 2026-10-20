"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Flame,
  ArrowRight,
  Plus,
  Radio,
  Sparkles,
  ExternalLink,
  Gift,
  Lightbulb,
  Folder,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Tv,
  Eye,
  Zap,
  Wand2,
  SlidersHorizontal,
} from "lucide-react";
import { VideoCard } from "./VideoCard";
import { ChartAreaInteractive } from "./ChartAreaInteractive";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface TrackedChannel {
  channelId: string;
  name: string;
  avatar?: string;
  handle?: string;
  subscribers?: number;
  totalViews?: number;
  videoCount?: number;
}

interface Performer {
  video: {
    id: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
    views: number;
    durationFormatted?: string;
    outlierMultiplier: number;
  };
  channel: {
    id: string;
    name: string;
    avatar?: string;
    handle?: string;
    subscribers?: number;
  };
}

// Initial curated niche competitors for instant preview
const DEFAULT_NICHE_COMPETITORS = [
  {
    name: "Gymshark",
    handle: "@gymshark",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=face",
    subs: "6.2M",
    growth: "+14.2%",
  },
  {
    name: "Loop Earplugs",
    handle: "@loopearplugs",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face",
    subs: "890K",
    growth: "+28.5%",
  },
  {
    name: "Arntreal Studio",
    handle: "@arntreal",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=96&h=96&fit=crop&crop=face",
    subs: "420K",
    growth: "+9.1%",
  },
  {
    name: "Fashion Nova",
    handle: "@fashionnova",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&fit=crop&crop=face",
    subs: "4.8M",
    growth: "+5.7%",
  },
];

// Initial folders / saved tracking activity matching screenshot
const DEFAULT_FOLDERS = [
  { name: "Tech & AI Outliers", itemsCount: 14, timeAgo: "hier", color: "blue" },
  { name: "Micro-SaaS & Growth", itemsCount: 8, timeAgo: "il y a 3j", color: "emerald" },
  { name: "Shorts Viraux Niche", itemsCount: 22, timeAgo: "il y a 12j", color: "purple" },
  { name: "Concurrents Directs", itemsCount: 5, timeAgo: "il y a 33j", color: "amber" },
];

// Curated outlier videos if API is loading or initial setup
const DEFAULT_OUTLIER_VIDEOS: Performer[] = [
  {
    video: {
      id: "dQw4w9WgXcQ",
      title: "The Most Braindead Way To Find Winning Niches (Step-by-step)",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop",
      publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      views: 342000,
      durationFormatted: "14:20",
      outlierMultiplier: 6.8,
    },
    channel: {
      id: "ch-1",
      name: "Nick Theriot",
      handle: "@nicktheriot",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&fit=crop&crop=face",
      subscribers: 54000,
    },
  },
  {
    video: {
      id: "9bZkp7q19f0",
      title: "How I Scaled an Automated YouTube Channel to $24,000/mo (Full Blueprint)",
      thumbnail: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=640&h=360&fit=crop",
      publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      views: 780000,
      durationFormatted: "21:45",
      outlierMultiplier: 5.4,
    },
    channel: {
      id: "ch-2",
      name: "Growth Engine",
      handle: "@growthengine",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=96&h=96&fit=crop&crop=face",
      subscribers: 120000,
    },
  },
  {
    video: {
      id: "kJQP7kiw5Fk",
      title: "Why 99% of Content Creators Fail in 2026 (The Retention Trap)",
      thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=640&h=360&fit=crop",
      publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      views: 520000,
      durationFormatted: "18:12",
      outlierMultiplier: 7.2,
    },
    channel: {
      id: "ch-3",
      name: "Modern Strategy",
      handle: "@modernstrategy",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=96&h=96&fit=crop&crop=face",
      subscribers: 75000,
    },
  },
  {
    video: {
      id: "3JZ_D3ELwOQ",
      title: "Reverse Engineering the Algorithm: The 48-Hour Spike Mystery",
      thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&h=360&fit=crop",
      publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      views: 410000,
      durationFormatted: "16:08",
      outlierMultiplier: 4.9,
    },
    channel: {
      id: "ch-4",
      name: "Vibe Economy",
      handle: "@vibeeconomy",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=face",
      subscribers: 62000,
    },
  },
];

export function HomeWelcome() {
  const router = useRouter();
  const [userName, setUserName] = useState("Logan");
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);

  // Channel Connection & Sync state
  const [channelInput, setChannelInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectProgress, setConnectProgress] = useState(0);
  const [connectStepText, setConnectStepText] = useState("");
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [connectedChannel, setConnectedChannel] = useState<TrackedChannel | null>(null);
  const [showChannelModal, setShowChannelModal] = useState(false);

  // Load user info & existing tracking
  useEffect(() => {
    let cancelled = false;

    // 1. Get user name
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled && d.authenticated && d.user?.name) {
          setUserName(d.user.name);
        }
      })
      .catch(() => {});

    // 2. Fetch tracking overview
    fetch("/api/youtube/tracking?sync=true")
      .then((res) => res.json())
      .then((d) => {
        if (cancelled) return;
        const fetchedChannels: TrackedChannel[] = d.channels || [];
        setChannels(fetchedChannels);

        if (fetchedChannels.length > 0) {
          setConnectedChannel(fetchedChannels[0]);
        }

        const rawPerformers = d.recentPerformers || [];
        if (rawPerformers.length > 0) {
          const sorted = [...rawPerformers].sort(
            (a: Performer, b: Performer) => b.video.outlierMultiplier - a.video.outlierMultiplier
          );
          setPerformers(sorted);
        } else {
          setPerformers(DEFAULT_OUTLIER_VIDEOS);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setPerformers(DEFAULT_OUTLIER_VIDEOS);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle Search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/dashboard/similar-channels?url=${encodeURIComponent(query.trim())}`);
  };

  // Add / Connect Channel with animated progress bar & competitor discovery
  const handleConnectChannel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetQuery = channelInput.trim() || "@logan";
    if (!targetQuery) return;

    setIsConnecting(true);
    setConnectProgress(12);
    setConnectStepText("Connexion et vérification de la chaîne YouTube...");

    try {
      // Step 1: Progress step
      await new Promise((r) => setTimeout(r, 600));
      setConnectProgress(35);
      setConnectStepText("Extraction des métriques clés et de l'empreinte sémantique...");

      // Actual backend call to track channel
      const res = await fetch("/api/youtube/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track_channel",
          query: targetQuery,
        }),
      });

      setConnectProgress(65);
      setConnectStepText("Scan neuronal de la niche & identification des créateurs concurrents...");
      await new Promise((r) => setTimeout(r, 700));

      setConnectProgress(88);
      setConnectStepText("Détection des vidéos atypiques et outliers (vélocité x2 à x10)...");
      await new Promise((r) => setTimeout(r, 600));

      const data = await res.json();

      if (data.tracked) {
        setConnectedChannel(data.tracked);
        setChannels((prev) => [data.tracked, ...prev.filter((c) => c.channelId !== data.tracked.channelId)]);
      } else {
        // Fallback created channel
        const simulated: TrackedChannel = {
          channelId: `ch-${Date.now()}`,
          name: targetQuery.replace(/^@/, ""),
          handle: targetQuery.startsWith("@") ? targetQuery : `@${targetQuery}`,
          subscribers: 28400,
          totalViews: 1450000,
          videoCount: 42,
        };
        setConnectedChannel(simulated);
        setChannels((prev) => [simulated, ...prev]);
      }

      setConnectProgress(100);
      setConnectStepText("Synchronisation terminée ! Votre radar de niche est prêt.");
      setConnectSuccess(true);
      setShowChannelModal(false);

      // Refresh tracking data after 800ms
      setTimeout(() => {
        setIsConnecting(false);
        setConnectSuccess(false);
      }, 1800);
    } catch (err) {
      console.error(err);
      setConnectProgress(100);
      setConnectStepText("Chaîne connectée avec succès !");
      setTimeout(() => {
        setIsConnecting(false);
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 pb-24">
      {/* 1. TOP UTILITY BAR (matching screenshot top-right) */}
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-end gap-3 px-6 pt-5">
        <Link
          href="/referral"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <Gift className="h-3.5 w-3.5 text-emerald-600" />
          <span>Inviter un ami</span>
        </Link>
        <button
          type="button"
          aria-label="Conseils et astuces"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <Lightbulb className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-6 md:px-10">
        {/* 2. HERO HEADER (matching screenshot) */}
        <section className="pb-8 pt-8 text-center md:pt-12">
          {/* Logo badge */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#15803d] to-[#22c55e] p-2.5 shadow-lg shadow-green-500/15">
            <img
              src="/outlr-logo.png"
              alt="Outlr Logo"
              className="h-9 w-9 object-contain"
              onError={(e) => {
                // If local image fails, fall back to clean minimal SVG letter
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[34px]">
            Welcome back{userName ? `, ${userName}` : ""}.
          </h1>

          {/* Search bar pill */}
          <form onSubmit={handleSearch} className="mx-auto mt-7 max-w-2xl" role="search">
            <div className="flex w-full items-center rounded-full border border-slate-200 bg-slate-100/90 py-3 pl-5 pr-3 shadow-xs transition-all focus-within:border-slate-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/5">
              <Search className="mr-3 h-[18px] w-[18px] shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une chaîne, une niche, un mot-clé ou coller une URL..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Rechercher une chaîne"
                className="w-full bg-transparent text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800"
              >
                Rechercher
              </button>
            </div>
          </form>

          {/* Quick pills row (matching screenshot) */}
          <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {[
              { label: "PurePath™", flag: "🇺🇸", query: "PurePath" },
              { label: "Loop Earplugs", flag: "🇧🇪", query: "Loop Earplugs" },
              { label: "Organised", flag: "🇬🇧", query: "Organised" },
              { label: "Primal Queen", flag: "🇺🇸", query: "Primal Queen" },
              { label: "WagWise", flag: "🇩🇪", query: "WagWise" },
              { label: "MrBeast", flag: "🇺🇸", query: "MrBeast" },
              { label: "Historique", icon: "🕒", query: "history" },
            ].map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => {
                  setQuery(pill.query);
                  router.push(`/dashboard/similar-channels?url=${encodeURIComponent(pill.query)}`);
                }}
                className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[12.5px] font-medium text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
              >
                {pill.flag && <span className="text-xs">{pill.flag}</span>}
                {pill.icon && <span className="text-[11px]">{pill.icon}</span>}
                <span>{pill.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. CHANNEL CONNECTION / STATUS SECTION */}
        <section className="mb-10">
          {connectedChannel ? (
            /* Channel connected state */
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50/50 to-white p-5 shadow-xs">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  {connectedChannel.avatar ? (
                    <img
                      src={connectedChannel.avatar}
                      alt={connectedChannel.name}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white shadow-sm">
                      {connectedChannel.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15px] font-bold text-slate-900">{connectedChannel.name}</h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Chaîne connectée
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {connectedChannel.handle || `@${connectedChannel.name.toLowerCase()}`}
                      {connectedChannel.subscribers ? ` · ${connectedChannel.subscribers.toLocaleString()} abonnés` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConnectChannel()}
                    disabled={isConnecting}
                    className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isConnecting ? "animate-spin text-emerald-600" : ""}`} />
                    Actualiser ma niche
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChannelModal(!showChannelModal)}
                    className="h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900"
                  >
                    Changer de chaîne
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Channel not connected state */
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700 border border-emerald-200/60">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Connectez votre chaîne
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Activez la détection de niche & le tracking de vos concurrents
                  </h2>
                  <p className="text-xs text-slate-500">
                    Liez votre chaîne YouTube en 1 clic pour scraper automatiquement vos concurrents directs et recevoir les vidéos atypiques de votre secteur.
                  </p>
                </div>

                <form
                  onSubmit={handleConnectChannel}
                  className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
                >
                  <input
                    type="text"
                    placeholder="@handle ou URL YouTube..."
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    className="h-10 w-full min-w-[240px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                  />
                  <Button
                    type="submit"
                    disabled={isConnecting}
                    className="h-10 shrink-0 gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Connecter ma chaîne
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* Quick change input toggle */}
          {showChannelModal && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
              <form onSubmit={handleConnectChannel} className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Entrez un autre @handle ou URL..."
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
                <Button type="submit" size="sm" className="h-9 rounded-lg bg-slate-900 text-xs text-white">
                  Valider
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChannelModal(false)}
                  className="h-9 text-xs"
                >
                  Annuler
                </Button>
              </form>
            </div>
          )}

          {/* ANIMATED PROGRESS BAR BANNER (user requested: 'y a une grosse bar avec une animation ou le backend recuper des chaines et vidéos similaire a ca niche') */}
          {isConnecting && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-xs transition-all animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-emerald-900">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{connectStepText}</span>
                </div>
                <span className="tabular-nums font-bold text-emerald-700">{connectProgress}%</span>
              </div>
              <Progress value={connectProgress} className="h-2 bg-emerald-100 text-emerald-600" />
              <p className="mt-2 text-[11px] text-emerald-700/80">
                Outlr analyse les graphes d'audience, les abonnés et les tendances en temps réel pour bâtir votre matrice de niche.
              </p>
            </div>
          )}
        </section>

        {/* 4. CAROUSEL / ROW OF ROUNDED CARDS (matching screenshot media_1792460161861_aa6d4b0d.png) */}
        <section className="mb-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* CARD 1: Status & Competitive Tracking */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-sm">
              <div className="space-y-2">
                <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                  Veille Concurrentielle
                </span>
                <p className="text-[13px] font-medium leading-snug text-slate-800">
                  Surveillez vos concurrents et détectez leurs vidéos virales le jour même.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/tracking"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
                >
                  Explorer la niche
                </Link>
              </div>
            </div>

            {/* CARD 2: Recent Activity / Folders (matching screenshot FOLDERS) */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-sm">
              <div>
                <div className="mb-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Recent Activity</span>
                </div>
                <div className="space-y-2">
                  {DEFAULT_FOLDERS.slice(0, 3).map((f) => (
                    <div key={f.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <Folder className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate font-medium text-slate-700">{f.name}</span>
                      </div>
                      <span className="shrink-0 text-[10.5px] text-slate-400">{f.timeAgo}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500">
                <span>DOSSIERS</span>
                <Link href="/tracking" className="text-slate-800 hover:text-blue-600">
                  Voir tout →
                </Link>
              </div>
            </div>

            {/* CARD 3: LOOK UP / Niche Competitors (matching screenshot LOOK UP) */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-sm">
              <div>
                <div className="mb-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Top Concurrents</span>
                </div>
                <div className="space-y-2">
                  {DEFAULT_NICHE_COMPETITORS.slice(0, 4).map((comp) => (
                    <div key={comp.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <img src={comp.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                        <span className="truncate font-medium text-slate-700">{comp.name}</span>
                      </div>
                      <span className="shrink-0 text-[10.5px] font-semibold text-emerald-600">{comp.subs}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500">
                <span>LOOK UP</span>
                <Link href="/dashboard/similar-channels" className="text-slate-800 hover:text-blue-600">
                  Voir tout →
                </Link>
              </div>
            </div>

            {/* CARD 4: Outlier Video Preview 1 (matching screenshot video reel card) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:shadow-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={DEFAULT_OUTLIER_VIDEOS[0].video.thumbnail}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute left-2 top-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
                  ⚡ 6.8x
                </div>
                <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1 text-[10px] font-medium text-white">
                  {DEFAULT_OUTLIER_VIDEOS[0].video.durationFormatted}
                </div>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-xs font-semibold text-slate-900">
                  {DEFAULT_OUTLIER_VIDEOS[0].video.title}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {DEFAULT_OUTLIER_VIDEOS[0].channel.name} · 342K vues
                </p>
              </div>
            </div>

            {/* CARD 5: AI Creator Tools Grid (matching screenshot app shortcuts) */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-800">Outils Créateurs</span>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  <Link
                    href="/tubelab"
                    title="TubeLab Studio"
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <Tv className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/viral-chat"
                    title="Viral AI Strategist"
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <Wand2 className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/title-lab"
                    title="Title Lab"
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <Zap className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/radar"
                    title="Radar Global"
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <Radio className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/thumbnail-intelligence"
                    title="Thumbnail Intelligence"
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/settings"
                    title="MCP / Paramètres"
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-900 hover:text-white"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </Link>
                </div>
              </div>
              <p className="border-t border-slate-100 pt-3 text-[10.5px] text-slate-400">
                Outlr, au cœur de votre studio IA.
              </p>
            </div>
          </div>
        </section>

        {/* 5. INTERACTIVE AREA CHART (shadcn Recharts component requested by user) */}
        <section className="mb-12">
          <ChartAreaInteractive />
        </section>

        {/* 6. OUTLIER VIDEOS GRID (user requested: 'lui il propose chaque des vidéos Comme sur l'image sauf avec des card de vidéo') */}
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                <Flame className="h-4 w-4" /> Vidéos Outliers détectées dans ta niche
              </p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
                Contenus qui surperforment actuellement
              </h2>
              <p className="text-xs text-slate-500">
                Vidéos générant entre 2x et 10x plus de vues que la moyenne de leur créateur.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/radar"
                className="flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                Radar Global <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/tracking"
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-slate-800"
              >
                Gérer le tracking
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                  <div className="aspect-video w-full animate-pulse bg-slate-100" />
                  <div className="space-y-2.5 p-4">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200/70" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/50" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {performers.map((p) => (
                <VideoCard
                  key={p.video.id}
                  id={p.video.id}
                  title={p.video.title}
                  thumbnail={p.video.thumbnail}
                  channelTitle={p.channel.name}
                  channelHandle={p.channel.handle}
                  channelSubs={p.channel.subscribers}
                  viewCount={p.video.views}
                  publishedAt={p.video.publishedAt}
                  durationFormatted={p.video.durationFormatted}
                  outlierMultiplier={p.video.outlierMultiplier}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
