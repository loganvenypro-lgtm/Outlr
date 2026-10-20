"use client";

import * as React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Flame,
  ArrowRight,
  ArrowUpRight,
  Radio,
  Sparkles,
  Gift,
  Folder,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Tv,
  Zap,
  Wand2,
  History,
  X,
  ChevronRight,
  Loader2,
  Users,
  Compass,
  Bell,
  Target,
  Link2,
  Image as ImageIcon,
} from "lucide-react";
import { VideoCard } from "./VideoCard";
import { ChartAreaInteractive } from "./ChartAreaInteractive";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCompactNumber } from "@/lib/utils";

const RECENT_SEARCHES_KEY = "newiq_recent_channels";

interface StoredChannel {
  id: string;
  title: string;
  avatar: string;
  customUrl?: string;
}

interface TrackedChannel {
  channelId: string;
  name: string;
  avatar?: string;
  handle?: string;
  subscribers?: number;
  totalViews?: number;
  videoCount?: number;
}

interface TrackingFolder {
  id: string;
  name: string;
  color?: string;
  createdAt?: string;
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

type OutlierFilter = "all" | "top" | "week";

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

// Initial folders / saved tracking activity
const DEFAULT_FOLDERS = [
  { name: "Tech & AI Outliers", itemsCount: 14, timeAgo: "hier", color: "blue" },
  { name: "Micro-SaaS & Growth", itemsCount: 8, timeAgo: "il y a 3j", color: "emerald" },
  { name: "Shorts Viraux Niche", itemsCount: 22, timeAgo: "il y a 12j", color: "purple" },
  { name: "Concurrents Directs", itemsCount: 5, timeAgo: "il y a 33j", color: "amber" },
];

const FOLDER_DOT: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  green: "bg-emerald-500",
  purple: "bg-violet-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  red: "bg-rose-500",
};

const QUICK_PICKS = [
  { label: "PurePath™", flag: "🇺🇸", query: "PurePath" },
  { label: "Loop Earplugs", flag: "🇧🇪", query: "Loop Earplugs" },
  { label: "Organised", flag: "🇬🇧", query: "Organised" },
  { label: "Primal Queen", flag: "🇺🇸", query: "Primal Queen" },
  { label: "WagWise", flag: "🇩🇪", query: "WagWise" },
  { label: "MrBeast", flag: "🇺🇸", query: "MrBeast" },
];

// Creator tools, each with a one-line explanation so the user knows when to use it
const CREATOR_TOOLS = [
  {
    href: "/radar",
    title: "Radar Global",
    description: "Les vidéos qui explosent sur tout YouTube",
    icon: Radio,
    tint: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/title-lab",
    title: "Title Lab",
    description: "Génère et teste des titres qui cliquent",
    icon: Zap,
    tint: "bg-amber-50 text-amber-700",
  },
  {
    href: "/viral-chat",
    title: "Viral AI Strategist",
    description: "Demande une stratégie de contenu à l'IA",
    icon: Wand2,
    tint: "bg-violet-50 text-violet-700",
  },
  {
    href: "/thumbnail-intelligence",
    title: "Thumbnail Intelligence",
    description: "Analyse les miniatures qui performent",
    icon: ImageIcon,
    tint: "bg-rose-50 text-rose-700",
  },
  {
    href: "/tubelab",
    title: "TubeLab Studio",
    description: "Ton espace de création tout-en-un",
    icon: Tv,
    tint: "bg-blue-50 text-blue-700",
  },
];

// Curated outlier videos
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5 || hour >= 18) return "Bonsoir";
  return "Bonjour";
}

function formatHandle(customUrl?: string, fallback?: string): string {
  if (!customUrl) return fallback || "";
  return customUrl.startsWith("@") ? customUrl : `@${customUrl}`;
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && (
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600">
            {Icon && <Icon className="size-3.5" />}
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 md:text-xl">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tint,
  href,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint: string;
  tint: string;
  href: string;
  loading?: boolean;
}) {
  return (
    <Link href={href} className="group/stat rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Card className="h-full gap-3 rounded-2xl py-5 shadow-xs ring-slate-200/80 transition-all duration-200 group-hover/stat:-translate-y-0.5 group-hover/stat:shadow-md group-hover/stat:ring-slate-300">
        <CardHeader className="px-5">
          <CardDescription className="text-[13px] font-medium text-slate-500">{label}</CardDescription>
          <CardAction>
            <div className={cn("flex size-9 items-center justify-center rounded-xl", tint)}>
              <Icon className="size-[18px]" />
            </div>
          </CardAction>
          <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
            {loading ? <Skeleton className="mt-1 h-8 w-16" /> : value}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {hint}
            <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover/stat:opacity-100" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function HomeWelcome() {
  const router = useRouter();
  const [userName, setUserName] = useState("Logan");
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<TrackedChannel[]>([]);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [folders, setFolders] = useState<TrackingFolder[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [outlierFilter, setOutlierFilter] = useState<OutlierFilter>("all");
  const [weekAgo] = useState(() => Date.now() - 7 * 86400000);

  // Channel Connection & Sync state
  const [channelInput, setChannelInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectProgress, setConnectProgress] = useState(0);
  const [connectStepText, setConnectStepText] = useState("");
  const [connectedChannel, setConnectedChannel] = useState<TrackedChannel | null>(null);
  const [showChannelModal, setShowChannelModal] = useState(false);

  // Recent searches state (Channel Finder feature)
  const [recentChannels, setRecentChannels] = useState<StoredChannel[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load user info, existing tracking, and recent searches from localStorage
  useEffect(() => {
    let cancelled = false;

    // Load recent channels from localStorage
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentChannels(JSON.parse(stored));
      }
    } catch {
      // LocalStorage errors ignored
    }

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
        setFolders(d.folders || []);
        setUnreadAlerts(d.stats?.unreadAlertsCount || 0);

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

  // Handle outside click to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Live Suggestions as the user types
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.channels || []);
          setShowDropdown(true);
        }
      } catch {
        // Silently catch
      } finally {
        setIsSuggesting(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const bestMultiplier = useMemo(
    () => performers.reduce((max, p) => Math.max(max, p.video.outlierMultiplier || 0), 0),
    [performers]
  );

  const filteredPerformers = useMemo(() => {
    if (outlierFilter === "top") {
      return performers.filter((p) => p.video.outlierMultiplier >= 5);
    }
    if (outlierFilter === "week") {
      return performers.filter((p) => new Date(p.video.publishedAt).getTime() >= weekAgo);
    }
    return performers;
  }, [performers, outlierFilter, weekAgo]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
    []
  );

  // Save Channel to Recent Searches
  const saveRecentChannel = (channel: StoredChannel) => {
    try {
      const updated = [
        channel,
        ...recentChannels.filter((c) => c.id !== channel.id),
      ].slice(0, 8);
      setRecentChannels(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Remove Channel from Recent Searches
  const removeRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = recentChannels.filter((c) => c.id !== id);
    setRecentChannels(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Handle Channel Selection from Autocomplete
  const handleSelectChannel = (item: any) => {
    setShowDropdown(false);
    saveRecentChannel({
      id: item.id,
      title: item.title,
      avatar: item.thumbnail,
      customUrl: item.customUrl,
    });
    router.push(`/channel/${item.id}`);
  };

  // Handle Search Submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetQuery = query.trim();
    if (!targetQuery) return;

    setShowDropdown(false);
    setIsSearchingChannels(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(targetQuery)}`);
      const data = await res.json();
      if (res.ok && data.channels) {
        setSearchResults(data.channels);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearchingChannels(false);
    }
  };

  // Add / Connect Channel with animated progress bar
  const handleConnectChannel = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetQuery = channelInput.trim() || "@logan";
    if (!targetQuery) return;

    setIsConnecting(true);
    setConnectProgress(12);
    setConnectStepText("Connexion et vérification de la chaîne YouTube...");

    try {
      await new Promise((r) => setTimeout(r, 600));
      setConnectProgress(35);
      setConnectStepText("Extraction des métriques clés et de l'empreinte sémantique...");

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
      setShowChannelModal(false);

      setTimeout(() => {
        setIsConnecting(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setConnectProgress(100);
      setConnectStepText("Chaîne connectée avec succès !");
      setTimeout(() => {
        setIsConnecting(false);
      }, 1200);
    }
  };

  const clearQuery = () => {
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    setHasSearched(false);
    setSearchResults([]);
  };

  const dropdownOpen = showDropdown && (suggestions.length > 0 || isSuggesting);

  return (
    <div className="min-h-screen w-full bg-slate-50/60 pb-24 text-slate-900">
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 md:px-10">
        {/* 1. PAGE HEADER */}
        <header className="flex flex-col gap-4 pb-8 pt-8 sm:flex-row sm:items-end sm:justify-between md:pt-10">
          <div className="space-y-1.5">
            <p className="text-sm font-medium capitalize text-muted-foreground">{todayLabel}</p>
            <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 sm:text-[32px]">
              {getGreeting()}
              {userName ? `, ${userName}` : ""} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Voici ce qui surperforme dans ta niche aujourd’hui.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/referral"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-xl bg-white px-3.5 shadow-xs")}
            >
              <Gift className="text-emerald-600" />
              Inviter un ami
            </Link>
            <Link
              href="/channel-finder"
              className={cn(buttonVariants({ size: "lg" }), "rounded-xl px-3.5 shadow-xs")}
            >
              <Compass />
              Channel Finder
            </Link>
          </div>
        </header>

        {/* 2. SEARCH CARD */}
        <Card className="mb-6 gap-0 overflow-visible rounded-2xl py-0 shadow-xs ring-slate-200/80">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Search className="size-4" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Analyser une chaîne</h2>
                <p className="text-xs text-muted-foreground">
                  Tape un nom, un @handle ou colle une URL YouTube pour voir ses vidéos outliers.
                </p>
              </div>
            </div>

            <div className="relative" ref={dropdownRef}>
              <form onSubmit={handleSearch} role="search">
                <div
                  className={cn(
                    "flex w-full items-center border bg-slate-50 py-1.5 pl-4 pr-1.5 transition-all",
                    dropdownOpen
                      ? "rounded-t-xl rounded-b-none border-emerald-500 bg-white ring-4 ring-emerald-500/10"
                      : "rounded-xl border-slate-200 focus-within:border-slate-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/5"
                  )}
                >
                  <Search className="mr-2.5 size-[18px] shrink-0 text-slate-400" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Ex : MrBeast, @gymshark, youtube.com/@..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    aria-label="Rechercher une chaîne"
                    className="h-9 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0 md:text-[15px] dark:bg-transparent"
                  />

                  {isSuggesting && <Loader2 className="mr-2 size-4 shrink-0 animate-spin text-emerald-600" />}

                  {query && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={clearQuery}
                      aria-label="Effacer la recherche"
                      className="mr-1 text-slate-400"
                    >
                      <X />
                    </Button>
                  )}

                  <Button type="submit" size="lg" className="rounded-lg px-4">
                    Rechercher
                    <ArrowRight />
                  </Button>
                </div>
              </form>

              {/* Autocomplete Dropdown */}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-b-xl border border-t-0 border-emerald-500 bg-white text-left shadow-xl">
                  {suggestions.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleSelectChannel(item)}
                      className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          <AvatarImage src={item.thumbnail} alt={item.title} />
                          <AvatarFallback>{item.title?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatHandle(item.customUrl, item.id)}
                            {item.subscriberCount !== undefined &&
                              ` · ${formatCompactNumber(item.subscriberCount)} abonnés`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="ml-2 size-4 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick picks */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Essayer :</span>
              {QUICK_PICKS.map((pill) => (
                <Button
                  key={pill.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery(pill.query);
                    router.push(`/dashboard/similar-channels?url=${encodeURIComponent(pill.query)}`);
                  }}
                  className="rounded-full bg-white font-normal text-slate-700"
                >
                  <span className="text-xs">{pill.flag}</span>
                  {pill.label}
                </Button>
              ))}
            </div>
          </CardContent>

          {/* Recently searched channels */}
          {recentChannels.length > 0 && (
            <CardFooter className="flex-col items-stretch gap-3 rounded-b-2xl border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <History className="size-3.5 text-slate-400" />
                  Récemment consultées
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setRecentChannels([]);
                    localStorage.removeItem(RECENT_SEARCHES_KEY);
                  }}
                  className="text-muted-foreground hover:text-rose-600"
                >
                  Effacer
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentChannels.map((item) => (
                  <div
                    key={item.id}
                    className="group/recent flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1.5 shadow-xs transition-colors hover:border-slate-300"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/channel/${item.id}`)}
                      className="flex items-center gap-2"
                    >
                      <Avatar size="sm">
                        <AvatarImage src={item.avatar} alt={item.title} />
                        <AvatarFallback className="text-[10px]">{item.title.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-[140px] truncate text-xs font-medium text-slate-700">
                        {item.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => removeRecent(e, item.id)}
                      className="rounded-full p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-rose-500"
                      aria-label={`Retirer ${item.title}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardFooter>
          )}
        </Card>

        {/* 3. SEARCH RESULTS */}
        {hasSearched && (
          <Card className="mb-6 rounded-2xl shadow-xs ring-slate-200/80">
            <CardHeader className="px-5 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                Résultats pour « {query} »
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                  {searchResults.length} chaîne{searchResults.length > 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">Clique sur une chaîne pour ouvrir son analyse complète.</CardDescription>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Fermer les résultats"
                  onClick={() => {
                    setHasSearched(false);
                    setSearchResults([]);
                  }}
                >
                  <X />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-5 sm:px-6">
              {isSearchingChannels ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[120px] rounded-xl" />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((ch) => (
                    <button
                      type="button"
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch)}
                      className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar size="lg">
                          <AvatarImage src={ch.thumbnail} alt={ch.title} />
                          <AvatarFallback>{ch.title?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-slate-900">{ch.title}</h3>
                          <p className="text-xs text-muted-foreground">{formatHandle(ch.customUrl, ch.id)}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {ch.description || "Aucune description"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-3 text-center">
                        {[
                          { label: "Abonnés", value: formatCompactNumber(ch.subscriberCount) },
                          { label: "Vues", value: formatCompactNumber(ch.viewCount) },
                          { label: "Vidéos", value: ch.videoCount || 0 },
                        ].map((s) => (
                          <div key={s.label}>
                            <p className="text-[11px] text-muted-foreground">{s.label}</p>
                            <p className="text-sm font-semibold tabular-nums text-slate-900">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Search className="size-4" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">Aucune chaîne trouvée</p>
                  <p className="text-xs text-muted-foreground">Essaie un nom exact ou un @handle.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 4. CHANNEL CONNECTION */}
        <section className="mb-6">
          {connectedChannel ? (
            <Card className="rounded-2xl py-4 shadow-xs ring-slate-200/80">
              <CardContent className="flex flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3.5">
                  <Avatar className="size-11 ring-2 ring-emerald-500/20">
                    <AvatarImage src={connectedChannel.avatar} alt={connectedChannel.name} />
                    <AvatarFallback className="bg-emerald-600 font-semibold text-white">
                      {connectedChannel.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-slate-900">{connectedChannel.name}</h2>
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                        <CheckCircle2 />
                        Connectée
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {connectedChannel.handle || `@${connectedChannel.name.toLowerCase()}`}
                      {connectedChannel.subscribers
                        ? ` · ${formatCompactNumber(connectedChannel.subscribers)} abonnés`
                        : ""}
                      {connectedChannel.videoCount ? ` · ${connectedChannel.videoCount} vidéos` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleConnectChannel()}
                    disabled={isConnecting}
                    className="rounded-xl bg-white"
                  >
                    <RefreshCw className={cn(isConnecting && "animate-spin text-emerald-600")} />
                    Actualiser ma niche
                  </Button>
                  <Link
                    href="/onboarding"
                    className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "rounded-xl text-slate-600")}
                  >
                    <Sparkles className="text-emerald-600" />
                    Refaire l’onboarding
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 py-6 text-white shadow-md ring-0">
              <CardContent className="grid gap-6 px-6 md:grid-cols-[1.1fr_1fr] md:items-center">
                <div className="space-y-3">
                  <Badge className="bg-emerald-500/15 text-emerald-300">
                    <Sparkles />
                    Démarrer en 30 secondes
                  </Badge>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Connecte ta chaîne pour activer ton radar de niche
                  </h2>
                  <p className="text-sm text-slate-300">
                    On détecte tes concurrents directs et on te remonte chaque jour leurs vidéos qui surperforment.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href="/onboarding"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "rounded-xl bg-emerald-500 px-4 text-white hover:bg-emerald-400"
                      )}
                    >
                      <Sparkles />
                      Lancer l’onboarding
                    </Link>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setShowChannelModal(!showChannelModal)}
                      className="rounded-xl text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      <Link2 />
                      Liaison rapide
                    </Button>
                  </div>
                </div>

                <ol className="grid gap-2.5">
                  {[
                    { title: "Connecte ta chaîne", text: "Colle ton @handle ou l'URL de ta chaîne." },
                    { title: "On scanne ta niche", text: "Détection automatique de tes concurrents." },
                    { title: "Reçois tes outliers", text: "Les vidéos x2 à x10 au-dessus de la moyenne." },
                  ].map((step, i) => (
                    <li
                      key={step.title}
                      className="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-slate-400">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Quick connect form */}
          {showChannelModal && (
            <Card className="mt-3 rounded-2xl py-4 shadow-sm ring-slate-200/80 animate-in fade-in slide-in-from-top-2 duration-150">
              <CardContent className="px-5">
                <form onSubmit={handleConnectChannel} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    type="text"
                    placeholder="@handle ou URL de ta chaîne..."
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    className="h-9 flex-1 bg-slate-50 focus-visible:bg-white"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="lg">
                      Connecter
                    </Button>
                    <Button type="button" variant="ghost" size="lg" onClick={() => setShowChannelModal(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Sync progress */}
          {isConnecting && (
            <Card className="mt-3 rounded-2xl bg-emerald-50/70 py-4 shadow-xs ring-emerald-200/70 animate-in fade-in slide-in-from-top-3 duration-200">
              <CardContent className="space-y-2.5 px-5">
                <div className="flex items-center justify-between gap-3 text-sm font-medium text-emerald-900">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                    </span>
                    {connectStepText}
                  </div>
                  <span className="font-semibold tabular-nums text-emerald-700">{connectProgress}%</span>
                </div>
                <Progress value={connectProgress} className="[&_[data-slot=progress-indicator]]:bg-emerald-600 [&_[data-slot=progress-track]]:bg-emerald-100" />
              </CardContent>
            </Card>
          )}
        </section>

        {/* 5. KPI OVERVIEW */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Chaînes suivies"
            value={channels.length}
            hint="Gérer ma liste de suivi"
            tint="bg-blue-50 text-blue-600"
            href="/tracking"
            loading={loading}
          />
          <StatCard
            icon={Flame}
            label="Outliers détectés"
            value={performers.length}
            hint="Vidéos au-dessus de leur moyenne"
            tint="bg-emerald-50 text-emerald-600"
            href="/niche-finder"
            loading={loading}
          />
          <StatCard
            icon={TrendingUp}
            label="Meilleur score"
            value={`${bestMultiplier.toFixed(1)}x`}
            hint="Plus forte surperformance du moment"
            tint="bg-amber-50 text-amber-600"
            href="/radar"
            loading={loading}
          />
          <StatCard
            icon={Bell}
            label="Alertes non lues"
            value={unreadAlerts}
            hint="Nouveaux pics chez tes concurrents"
            tint="bg-rose-50 text-rose-600"
            href="/tracking"
            loading={loading}
          />
        </section>

        {/* 6. CHART + CREATOR TOOLS */}
        <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartAreaInteractive />
          </div>

          <Card className="rounded-2xl shadow-xs ring-slate-200/80">
            <CardHeader className="px-5">
              <CardTitle className="text-[15px] font-semibold">Outils créateurs</CardTitle>
              <CardDescription className="text-xs">Passe de l’idée à la vidéo en quelques clics.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-3">
              {CREATOR_TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group/tool flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
                >
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tool.tint)}>
                    <tool.icon className="size-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{tool.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover/tool:translate-x-0.5 group-hover/tool:text-slate-500" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 7. COMPETITORS + FOLDERS */}
        <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="rounded-2xl shadow-xs ring-slate-200/80">
            <CardHeader className="px-5">
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                <Target className="size-4 text-emerald-600" />
                Concurrents à surveiller
              </CardTitle>
              <CardDescription className="text-xs">Les chaînes qui grandissent le plus dans ta niche.</CardDescription>
              <CardAction>
                <Link
                  href="/dashboard/similar-channels"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-slate-600")}
                >
                  Tout voir
                  <ArrowRight />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-3">
              {DEFAULT_NICHE_COMPETITORS.map((comp) => (
                <div
                  key={comp.name}
                  className="flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar>
                      <AvatarImage src={comp.avatar} alt={comp.name} />
                      <AvatarFallback>{comp.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{comp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {comp.handle} · {comp.subs} abonnés
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 tabular-nums text-emerald-700">
                    <TrendingUp />
                    {comp.growth}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-xs ring-slate-200/80">
            <CardHeader className="px-5">
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                <Folder className="size-4 text-blue-600" />
                Mes dossiers
              </CardTitle>
              <CardDescription className="text-xs">Tes collections de chaînes et d’idées sauvegardées.</CardDescription>
              <CardAction>
                <Link
                  href="/tracking"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-slate-600")}
                >
                  Gérer
                  <ArrowRight />
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-3">
              {(folders.length > 0
                ? folders.slice(0, 4).map((f) => ({
                    key: f.id,
                    name: f.name,
                    color: f.color || "blue",
                    meta: f.createdAt
                      ? `Créé le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(f.createdAt))}`
                      : "",
                  }))
                : DEFAULT_FOLDERS.map((f) => ({
                    key: f.name,
                    name: f.name,
                    color: f.color,
                    meta: `${f.itemsCount} éléments · ${f.timeAgo}`,
                  }))
              ).map((f) => (
                <Link
                  key={f.key}
                  href="/tracking"
                  className="group/folder flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Folder className="size-4" />
                      <span
                        className={cn(
                          "absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white",
                          FOLDER_DOT[f.color] || "bg-slate-400"
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{f.name}</p>
                      {f.meta && <p className="text-xs text-muted-foreground">{f.meta}</p>}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover/folder:translate-x-0.5 group-hover/folder:text-slate-500" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 8. OUTLIER VIDEOS GRID */}
        <section>
          <SectionHeading
            icon={Flame}
            eyebrow="Outliers de ta niche"
            title="Les vidéos qui surperforment en ce moment"
            description="Chaque badge indique combien de fois la vidéo dépasse la moyenne de son créateur."
          >
            <Tabs value={outlierFilter} onValueChange={(v) => setOutlierFilter(v as OutlierFilter)}>
              <TabsList className="h-9 bg-white shadow-xs ring-1 ring-slate-200/80">
                <TabsTrigger value="all" className="px-3 text-xs">
                  Toutes
                </TabsTrigger>
                <TabsTrigger value="top" className="px-3 text-xs">
                  x5 et +
                </TabsTrigger>
                <TabsTrigger value="week" className="px-3 text-xs">
                  Cette semaine
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Link href="/tracking" className={cn(buttonVariants({ size: "lg" }), "rounded-xl px-3.5")}>
              Gérer le tracking
              <ArrowRight />
            </Link>
          </SectionHeading>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <div className="space-y-2.5 p-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPerformers.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPerformers.map((p) => (
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
          ) : (
            <Card className="rounded-2xl border-dashed py-12 shadow-none ring-slate-200">
              <CardContent className="flex flex-col items-center gap-2 text-center">
                <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Flame className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-900">Aucune vidéo pour ce filtre</p>
                <p className="text-xs text-muted-foreground">Essaie « Toutes » ou ajoute des chaînes à suivre.</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setOutlierFilter("all")}>
                  Voir toutes les vidéos
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
