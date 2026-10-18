"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { SearchDepth, SearchJobProgress, DiscoveredVideoRecord } from "@/types/discoveryEngine";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { detectTitlePattern } from "@/lib/titlePatternDetector";
import {
  Search,
  SlidersHorizontal,
  Flame,
  Sparkles,
  TrendingUp,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Clock,
  Eye,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  ArrowUpRight,
  Users,
  Compass,
  Zap,
  Filter,
  BarChart2,
  Download,
  Plus,
  RefreshCw,
  Loader2,
  Check,
  Play,
  Film,
  SearchCode,
  X,
  MoreHorizontal
} from "lucide-react";
import { inferVideoTaxonomy, ALGROW_CATEGORIES, ALGROW_NICHES, ALGROW_SUB_NICHES } from "@/lib/taxonomyHelper";
import { AdvancedFiltersModal, AdvancedFiltersState } from "@/components/AdvancedFiltersModal";

function NicheFinderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search input & Depth
  const [queryInput, setQueryInput] = useState(searchParams.get("q") || "");
  const [activeQuery, setActiveQuery] = useState(searchParams.get("q") || "");
  const [depth, setDepth] = useState<SearchDepth>("quick");

  // Algrow Filters State
  const [formatFilter, setFormatFilter] = useState<"all" | "long" | "shorts">("long");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [selectedNiche, setSelectedNiche] = useState<string>("Any niche");
  const [selectedSubNiche, setSelectedSubNiche] = useState<string>("All Sub-Niches");
  
  // Algrow Dropdowns open/close state
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showNicheMenu, setShowNicheMenu] = useState(false);
  const [showSubNicheMenu, setShowSubNicheMenu] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);

  // Dynamic distribution counters
  const [nicheCounts, setNicheCounts] = useState<Record<string, number>>({});
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Advanced Filters State (from the 7 Algrow criteria modal)
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersState>({
    minViews: 0,
    maxViews: 0,
    period: "all",
    minSubs: 0,
    maxSubs: 0,
    minOutlier: 0,
    maxOutlier: 0,
    minDurationMinutes: 0,
    maxDurationMinutes: 0,
    minUploadCount: 0,
    maxUploadCount: 0,
    minChannelAgeDays: 0,
    maxChannelAgeDays: 0,
  });

  const [sortBy, setSortBy] = useState<"relevance" | "outlier" | "viral_ratio" | "vpd" | "views" | "date" | "engagement" | "vbs">("vbs");
  const [searchFilter, setSearchFilter] = useState("");

  // Video Inspection Modal (A/B testing, velocity, title changes)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 24;

  // Job & Results State
  const [currentJob, setCurrentJob] = useState<SearchJobProgress | null>(null);
  const [videos, setVideos] = useState<DiscoveredVideoRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unfilteredCount, setUnfilteredCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saturationScore, setSaturationScore] = useState<any>(null);
  const [validatedBreakoutTopics, setValidatedBreakoutTopics] = useState<any[]>([]);

  // Tracking & Bookmarks
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>([]);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trackedSuccessIds, setTrackedSuccessIds] = useState<string[]>([]);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Algrow-style Try suggestions
  const trySuggestions = [
    { label: "AI", query: "AI automation agency" },
    { label: "Gaming", query: "Minecraft challenge documentary" },
    { label: "Documentaries", query: "YouTube documentary video essay" },
    { label: "Motivation", query: "self discipline stoicism" },
    { label: "Business", query: "business micro saas ideas" },
    { label: "Sports", query: "sports untold stories breakdown" },
    { label: "Movies", query: "movie scene breakdown analysis" },
    { label: "Horror & Iceberg", query: "horror internet iceberg explained" },
  ];

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "tech", label: "AI & Tech", query: "AI tools tech breakdown" },
    { id: "gaming", label: "Gaming & Challenges", query: "gaming documentary challenge" },
    { id: "business", label: "Business & Micro-SaaS", query: "business model case study" },
    { id: "mystery", label: "Horror & Mysteries", query: "internet mysteries iceberg" },
    { id: "finance", label: "Finance & Side Hustles", query: "personal finance side hustle" },
    { id: "education", label: "Science & Engineering", query: "engineering marvels science" },
  ];

  // Instant Search across pre-indexed Viral Videos database (< 50ms)
  const handleInstantSearch = (targetQuery: string) => {
    const clean = targetQuery.trim();
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setCurrentJob(null);
    setActiveQuery(clean);
    setSearchFilter(clean);
    setPage(1);
    fetchFilteredPage(1, { search: clean });
  };

  // 1. Deep YouTube Crawl Job (only when user explicitly requests deep discovery)
  const startSearchJob = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;
    setLoading(true);
    setError(null);
    setVideos([]);
    setSearchFilter("");
    setPage(1);

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    try {
      const res = await fetch("/api/youtube/discovery-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: targetQuery.trim(),
          depth,
          duration: formatFilter === "all" ? "all" : formatFilter === "long" ? "long" : "short",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de démarrer la recherche.");

      setActiveQuery(targetQuery.trim());
      pollJobProgress(data.jobId);
    } catch (err: any) {
      setError(err.message || "Erreur de démarrage");
      setLoading(false);
    }
  };

  // 2. Poll Job Progress until complete
  const pollJobProgress = (jobId: string) => {
    const check = async () => {
      try {
        const queryParams = new URLSearchParams({
          jobId,
          page: String(page),
          limit: String(limit),
          format: formatFilter,
          period: advancedFilters.period,
          minViews: String(advancedFilters.minViews),
          maxSubs: String(advancedFilters.maxSubs),
          minOutlier: String(advancedFilters.minOutlier),
          sortBy,
          searchFilter,
        });

        const res = await fetch(`/api/youtube/discovery-engine?${queryParams.toString()}`);
        const data = await res.json();

        if (res.ok && data.job) {
          setCurrentJob(data.job);

          // Progressive streaming: update the video list in real time as each video is discovered
          if (Array.isArray(data.videos) && data.videos.length > 0) {
            setVideos(data.videos);
            setTotalCount(data.totalCount || data.videos.length);
            setUnfilteredCount(data.unfilteredCount || data.videos.length);
            setTotalPages(data.totalPages || 1);
            if (data.saturationScore) setSaturationScore(data.saturationScore);
            if (data.validatedBreakoutTopics) setValidatedBreakoutTopics(data.validatedBreakoutTopics);
          }

          if (data.job.status === "completed" || data.job.status === "partially_completed") {
            setLoading(false);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (data.videos) setVideos(data.videos);
            setTotalCount(data.totalCount || 0);
            setUnfilteredCount(data.unfilteredCount || 0);
            setTotalPages(data.totalPages || 1);
            if (data.saturationScore) setSaturationScore(data.saturationScore);
            if (data.validatedBreakoutTopics) setValidatedBreakoutTopics(data.validatedBreakoutTopics);
          } else if (data.job.status === "failed") {
            setLoading(false);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setError(data.job.error || "Échec de la recherche en profondeur.");
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    };

    check();
    pollIntervalRef.current = setInterval(check, 800);
  };

  // 3. Fetch paginated / filtered results
  const fetchFilteredPage = async (
    targetPage = page,
    overrides?: {
      format?: string;
      category?: string;
      niche?: string;
      subNiche?: string;
      advanced?: Partial<AdvancedFiltersState>;
      sort?: string;
      search?: string;
    }
  ) => {
    // If we have an active deep discovery job, query the discovery engine
    if (currentJob?.jobId) {
      try {
        const queryParams = new URLSearchParams({
          jobId: currentJob.jobId,
          page: String(targetPage),
          limit: String(limit),
          format: overrides?.format ?? formatFilter,
          period: overrides?.advanced?.period ?? advancedFilters.period,
          minViews: String(overrides?.advanced?.minViews ?? advancedFilters.minViews),
          maxSubs: String(overrides?.advanced?.maxSubs ?? advancedFilters.maxSubs),
          minOutlier: String(overrides?.advanced?.minOutlier ?? advancedFilters.minOutlier),
          sortBy: overrides?.sort ?? sortBy,
          searchFilter: overrides?.search ?? searchFilter,
        });

        const res = await fetch(`/api/youtube/discovery-engine?${queryParams.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setVideos(data.videos || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
          setPage(targetPage);
          if (data.saturationScore) setSaturationScore(data.saturationScore);
          if (data.validatedBreakoutTopics) setValidatedBreakoutTopics(data.validatedBreakoutTopics);
        }
      } catch {}
      return;
    }

    // Default: Query the persistent Global Viral Videos index
    try {
      const activeAdv = { ...advancedFilters, ...(overrides?.advanced || {}) };
      const activeFormat = overrides?.format ?? formatFilter;
      const activeCategory = overrides?.category ?? selectedCategory;
      const activeNiche = overrides?.niche ?? selectedNiche;
      const activeSubNiche = overrides?.subNiche ?? selectedSubNiche;
      const activeSearch = overrides?.search !== undefined ? overrides.search : searchFilter;
      const activeSort = overrides?.sort ?? sortBy;

      const queryParams = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
        format: activeFormat,
        sortBy: activeSort === "viral_ratio" ? "vbs" : activeSort,
      });

      if (activeCategory && activeCategory !== "All Categories") {
        queryParams.set("category", activeCategory);
      }
      if (activeNiche && activeNiche !== "Any niche") {
        queryParams.set("niche", activeNiche);
      }
      if (activeSubNiche && activeSubNiche !== "All Sub-Niches") {
        queryParams.set("subNiche", activeSubNiche);
      }
      if (activeSearch && activeSearch.trim()) {
        queryParams.set("search", activeSearch.trim());
      }
      if (activeAdv.minViews > 0) queryParams.set("minViews", String(activeAdv.minViews));
      if (activeAdv.maxViews > 0) queryParams.set("maxViews", String(activeAdv.maxViews));
      if (activeAdv.period && activeAdv.period !== "all") queryParams.set("period", activeAdv.period);
      if (activeAdv.minSubs > 0) queryParams.set("minSubs", String(activeAdv.minSubs));
      if (activeAdv.maxSubs > 0) queryParams.set("maxSubs", String(activeAdv.maxSubs));
      if (activeAdv.minOutlier > 0) queryParams.set("minOutlier", String(activeAdv.minOutlier));
      if (activeAdv.maxOutlier > 0) queryParams.set("maxOutlier", String(activeAdv.maxOutlier));
      if (activeAdv.minDurationMinutes > 0) queryParams.set("minDurationSeconds", String(activeAdv.minDurationMinutes * 60));
      if (activeAdv.maxDurationMinutes > 0) queryParams.set("maxDurationSeconds", String(activeAdv.maxDurationMinutes * 60));
      if (activeAdv.minUploadCount > 0) queryParams.set("minUploadCount", String(activeAdv.minUploadCount));
      if (activeAdv.maxUploadCount > 0) queryParams.set("maxUploadCount", String(activeAdv.maxUploadCount));
      if (activeAdv.minChannelAgeDays > 0) queryParams.set("minChannelAgeDays", String(activeAdv.minChannelAgeDays));
      if (activeAdv.maxChannelAgeDays > 0) queryParams.set("maxChannelAgeDays", String(activeAdv.maxChannelAgeDays));

      const res = await fetch(`/api/youtube/viral-videos?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok && data.videos) {
        setVideos(data.videos || []);
        setTotalCount(data.totalCount || 0);
        setUnfilteredCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setPage(targetPage);
        if (data.nicheCounts) setNicheCounts(data.nicheCounts);
        if (data.categoryCounts) setCategoryCounts(data.categoryCounts);
      }
    } catch (e) {
      console.error("Error loading viral videos index:", e);
    }
  };

  useEffect(() => {
    const paramQ = searchParams.get("q");
    if (paramQ && paramQ.trim()) {
      const q = paramQ.trim();
      setActiveQuery(q);
      setQueryInput(q);
      handleInstantSearch(q);
    } else {
      // Default landing: immediately load global viral breakouts!
      fetchFilteredPage(1);
    }

    try {
      const saved = localStorage.getItem("newiq_saved_outliers");
      if (saved) setSavedVideoIds(JSON.parse(saved));
    } catch {}

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [searchParams]);

  // Track Channel in 1-click
  const handleTrackChannel = async (channelId: string, channelName: string, avatar: string, subs: number) => {
    setTrackingId(channelId);
    try {
      await fetch("/api/youtube/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track_channel",
          channel: {
            channelId,
            name: channelName,
            handle: `@${channelName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            avatar,
            subscribers: subs,
            totalViews: 0,
            videoCount: 0,
          },
          notes: `Découvert dans la niche "${activeQuery}"`,
        }),
      });
      setTrackedSuccessIds((prev) => [...prev, channelId]);
    } finally {
      setTrackingId(null);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (videos.length === 0) return;
    const headers = [
      "Titre",
      "URL Vidéo",
      "Chaîne",
      "ID Chaîne",
      "Vues",
      "Abonnés",
      "Date Publication",
      "Durée",
      "Score Pertinence",
      "Outlier Multiplier",
      "Médiane Habituelle",
      "Fiabilité Outlier",
      "Requête Source",
    ];

    const rows = videos.map((v) => [
      `"${v.title.replace(/"/g, '""')}"`,
      `https://www.youtube.com/watch?v=${v.id}`,
      `"${v.channelTitle.replace(/"/g, '""')}"`,
      v.channelId,
      v.viewCount,
      v.channelSubscribers,
      v.publishedAt,
      v.durationFormatted,
      `${v.relevanceScore}%`,
      `${v.outlierMultiplier}x`,
      v.baselineViews,
      v.outlierReliability,
      `"${v.foundViaQuery}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `viral_videos_${activeQuery.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const countAdvancedActive = () => {
    let count = 0;
    if (advancedFilters.minViews > 0 || advancedFilters.maxViews > 0) count++;
    if (advancedFilters.period !== "all") count++;
    if (advancedFilters.minSubs > 0 || advancedFilters.maxSubs > 0) count++;
    if (advancedFilters.minOutlier > 0 || advancedFilters.maxOutlier > 0) count++;
    if (advancedFilters.minDurationMinutes > 0 || advancedFilters.maxDurationMinutes > 0) count++;
    if (advancedFilters.minUploadCount > 0 || advancedFilters.maxUploadCount > 0) count++;
    if (advancedFilters.minChannelAgeDays > 0 || advancedFilters.maxChannelAgeDays > 0) count++;
    return count;
  };

  const resetAllFilters = () => {
    setFormatFilter("long");
    setSelectedCategory("All Categories");
    setSelectedNiche("Any niche");
    setSelectedSubNiche("All Sub-Niches");
    setSearchFilter("");
    const emptyAdv: AdvancedFiltersState = {
      minViews: 0,
      maxViews: 0,
      period: "all",
      minSubs: 0,
      maxSubs: 0,
      minOutlier: 0,
      maxOutlier: 0,
      minDurationMinutes: 0,
      maxDurationMinutes: 0,
      minUploadCount: 0,
      maxUploadCount: 0,
      minChannelAgeDays: 0,
      maxChannelAgeDays: 0,
    };
    setAdvancedFilters(emptyAdv);
    fetchFilteredPage(1, {
      format: "long",
      category: "All Categories",
      niche: "Any niche",
      subNiche: "All Sub-Niches",
      search: "",
      advanced: emptyAdv,
    });
  };

  const hasActiveFilters =
    formatFilter !== "long" ||
    selectedCategory !== "All Categories" ||
    selectedNiche !== "Any niche" ||
    selectedSubNiche !== "All Sub-Niches" ||
    searchFilter.length > 0 ||
    countAdvancedActive() > 0;

  // Bookmark / Save video toggle
  const toggleSaveVideo = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetVideo = videos.find((v) => v.id === videoId);

    setSavedVideoIds((prev) => {
      const isCurrentlySaved = prev.includes(videoId);
      const next = isCurrentlySaved ? prev.filter((id) => id !== videoId) : [...prev, videoId];
      try {
        localStorage.setItem("newiq_saved_outliers", JSON.stringify(next));
      } catch {}

      // Si l'utilisateur sauvegarde la vidéo, on ajoute automatiquement la chaîne dans Channel Tracking !
      if (!isCurrentlySaved && targetVideo?.channelId) {
        handleTrackChannel(
          targetVideo.channelId,
          targetVideo.channelTitle,
          targetVideo.channelAvatar || "",
          targetVideo.channelSubscribers || 1000
        );
      }

      return next;
    });
  };

  // Calculate human-friendly time elapsed (Algrow format: 8 Days Ago, 3 Weeks Ago, etc.)
  const getElapsedString = (dateStr: string) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} Days Ago`;
    if (days < 30) return `${Math.floor(days / 7)} Weeks Ago`;
    if (days < 365) return `${Math.floor(days / 30)} Months Ago`;
    return `${Math.floor(days / 365)} Years Ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white text-slate-900">
      <TopNav
        title="Viral Videos Discovery"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Viral Videos", href: "/niche-finder" },
        ]}
      />

      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full space-y-6 bg-white">
        {/* Header Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Viral Videos</h1>
          <p className="text-xs sm:text-sm text-slate-500">Discover videos breaking out right now.</p>
        </div>

        {/* Modern White Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInstantSearch(queryInput);
          }}
          className="relative"
        >
          <div className="flex items-center w-full bg-white border border-slate-200 hover:border-slate-300 focus-within:border-blue-500 rounded-xl px-4 py-2 sm:py-2.5 transition-all shadow-sm">
            <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search videos, channels, niches or topics..."
              className="w-full bg-transparent text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => setQueryInput("")}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 shrink-0 mr-2"
                title="Clear input"
              >
                ✕
              </button>
            )}

            {/* Scan Depth Selector */}
            <div className="hidden sm:flex items-center border-l border-slate-200 pl-3 pr-2 mr-2">
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value as SearchDepth)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                title="Search Depth Engine"
              >
                <option value="quick" className="bg-white text-slate-900">
                  ⚡ Quick (~100 vids)
                </option>
                <option value="deep" className="bg-white text-slate-900">
                  🔍 Deep (~300 vids)
                </option>
                <option value="extended" className="bg-white text-slate-900">
                  🚀 Extended (~500 vids)
                </option>
                <option value="max" className="bg-white text-slate-900">
                  👑 Max (~800 vids)
                </option>
              </select>
            </div>

            {/* Blue Instant Search Button */}
            <button
              type="submit"
              disabled={loading || !queryInput.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <span>Instant Search</span>
            </button>

            {/* Deep YouTube Crawl Button */}
            <button
              type="button"
              onClick={() => startSearchJob(queryInput)}
              disabled={loading || !queryInput.trim()}
              className="hidden md:flex px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold items-center gap-1.5 transition-colors shrink-0"
              title="Lancer une exploration en profondeur sur YouTube (~30s)"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Sparkles className="w-3.5 h-3.5 text-blue-600" />}
              <span>Deep Crawl</span>
            </button>
          </div>
        </form>

        {/* Try Suggestions Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1">Try</span>
          {trySuggestions.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setQueryInput(item.query);
                handleInstantSearch(item.query);
              }}
              className={`px-3 py-1 rounded-full text-xs transition-all border ${
                activeQuery.toLowerCase() === item.query.toLowerCase()
                  ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

          {/* Algrow-Style Horizontal Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-slate-500 font-medium">Filter by</span>

              {/* Segmented Switch: Shorts vs Longform */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setFormatFilter("shorts");
                    fetchFilteredPage(1, { format: "shorts" });
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    formatFilter === "shorts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Shorts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormatFilter("long");
                    fetchFilteredPage(1, { format: "long" });
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    formatFilter === "long" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Longform
                </button>
              </div>

              {/* 1. All Categories Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryMenu(!showCategoryMenu);
                    setShowNicheMenu(false);
                    setShowSubNicheMenu(false);
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span className="truncate max-w-[130px]">{selectedCategory}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {showCategoryMenu && (
                  <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 animate-in fade-in duration-150 max-h-80 overflow-y-auto">
                    {ALGROW_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                      return (
                        <div
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setShowCategoryMenu(false);
                            fetchFilteredPage(1, { category: cat });
                          }}
                          className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span>{cat}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Any Niche Dropdown with counts */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNicheMenu(!showNicheMenu);
                    setShowCategoryMenu(false);
                    setShowSubNicheMenu(false);
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span className="truncate max-w-[130px]">{selectedNiche}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {showNicheMenu && (
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 animate-in fade-in duration-150 max-h-80 overflow-y-auto">
                    {ALGROW_NICHES.map((n) => {
                      const isSelected = selectedNiche.toLowerCase() === n.toLowerCase();
                      const count = nicheCounts[n];
                      return (
                        <div
                          key={n}
                          onClick={() => {
                            setSelectedNiche(n);
                            setSelectedSubNiche("All Sub-Niches");
                            setShowNicheMenu(false);
                            fetchFilteredPage(1, { niche: n, subNiche: "All Sub-Niches" });
                          }}
                          className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span className="truncate pr-2">{n}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            {n !== "Any niche" && count !== undefined && count > 0 && (
                              <span className="text-[11px] font-mono text-slate-500 font-medium">
                                {formatCompactNumber(count)}
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. All Sub-Niches Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubNicheMenu(!showSubNicheMenu);
                    setShowCategoryMenu(false);
                    setShowNicheMenu(false);
                  }}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span className="truncate max-w-[130px]">{selectedSubNiche}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {showSubNicheMenu && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 animate-in fade-in duration-150 max-h-80 overflow-y-auto">
                    <div
                      onClick={() => {
                        setSelectedSubNiche("All Sub-Niches");
                        setShowSubNicheMenu(false);
                        fetchFilteredPage(1, { subNiche: "All Sub-Niches" });
                      }}
                      className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        selectedSubNiche === "All Sub-Niches"
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span>All Sub-Niches</span>
                      {selectedSubNiche === "All Sub-Niches" && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>

                    {(ALGROW_SUB_NICHES[selectedNiche] || []).map((sub: string) => {
                      const isSelected = selectedSubNiche.toLowerCase() === sub.toLowerCase();
                      return (
                        <div
                          key={sub}
                          onClick={() => {
                            setSelectedSubNiche(sub);
                            setShowSubNicheMenu(false);
                            fetchFilteredPage(1, { subNiche: sub });
                          }}
                          className={`px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <span>{sub}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. More Filters Button */}
              <button
                type="button"
                onClick={() => {
                  setShowAdvancedModal(true);
                  setShowCategoryMenu(false);
                  setShowNicheMenu(false);
                  setShowSubNicheMenu(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-sm ${
                  countAdvancedActive() > 0
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>More filters</span>
                {countAdvancedActive() > 0 && (
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded-full font-mono font-bold">
                    {countAdvancedActive()}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Export CSV button */}
            {videos.length > 0 && (
              <button
                type="button"
                onClick={exportToCSV}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                title="Exporter les résultats en format CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV ({unfilteredCount || videos.length})</span>
              </button>
            )}
          </div>

          {/* Active Filter Chips with ✕ (Algrow dismissable pills) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {formatFilter !== "long" && (
                <button
                  type="button"
                  onClick={() => {
                    setFormatFilter("long");
                    fetchFilteredPage(1, { format: "long" });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 transition-colors"
                >
                  <span>{formatFilter === "shorts" ? "Shorts" : "All Formats"}</span>
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {selectedCategory !== "All Categories" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All Categories");
                    fetchFilteredPage(1, { category: "All Categories" });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] border border-blue-200 transition-colors"
                >
                  <span>{selectedCategory}</span>
                  <X className="w-3 h-3 text-blue-400" />
                </button>
              )}

              {selectedNiche !== "Any niche" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNiche("Any niche");
                    setSelectedSubNiche("All Sub-Niches");
                    fetchFilteredPage(1, { niche: "Any niche", subNiche: "All Sub-Niches" });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] border border-purple-200 transition-colors"
                >
                  <span>{selectedNiche}</span>
                  <X className="w-3 h-3 text-purple-400" />
                </button>
              )}

              {selectedSubNiche !== "All Sub-Niches" && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubNiche("All Sub-Niches");
                    fetchFilteredPage(1, { subNiche: "All Sub-Niches" });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] border border-indigo-200 transition-colors"
                >
                  <span>{selectedSubNiche}</span>
                  <X className="w-3 h-3 text-indigo-400" />
                </button>
              )}

              {advancedFilters.minViews > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const adv = { ...advancedFilters, minViews: 0 };
                    setAdvancedFilters(adv);
                    fetchFilteredPage(1, { advanced: adv });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 transition-colors"
                >
                  <span>{formatCompactNumber(advancedFilters.minViews)}+ views</span>
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {advancedFilters.period !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    const adv = { ...advancedFilters, period: "all" as const };
                    setAdvancedFilters(adv);
                    fetchFilteredPage(1, { advanced: adv });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 transition-colors"
                >
                  <span>Last {advancedFilters.period === "21d" ? "3 weeks" : advancedFilters.period === "7d" ? "7 days" : advancedFilters.period}</span>
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {advancedFilters.maxChannelAgeDays > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const adv = { ...advancedFilters, maxChannelAgeDays: 0 };
                    setAdvancedFilters(adv);
                    fetchFilteredPage(1, { advanced: adv });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] border border-emerald-200 transition-colors font-medium"
                >
                  <span>Channel age under {advancedFilters.maxChannelAgeDays} days</span>
                  <X className="w-3 h-3 text-emerald-500" />
                </button>
              )}

              {advancedFilters.minOutlier > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const adv = { ...advancedFilters, minOutlier: 0 };
                    setAdvancedFilters(adv);
                    fetchFilteredPage(1, { advanced: adv });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] border border-amber-200 transition-colors font-medium"
                >
                  <span>Outlier &ge; {advancedFilters.minOutlier}x</span>
                  <X className="w-3 h-3 text-amber-500" />
                </button>
              )}

              {advancedFilters.maxSubs > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const adv = { ...advancedFilters, maxSubs: 0 };
                    setAdvancedFilters(adv);
                    fetchFilteredPage(1, { advanced: adv });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 transition-colors"
                >
                  <span>&lt; {formatCompactNumber(advancedFilters.maxSubs)} subs</span>
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {searchFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilter("");
                    fetchFilteredPage(1, { search: "" });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] border border-slate-200 transition-colors"
                >
                  <span>Keyword: "{searchFilter}"</span>
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}

              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-slate-500 hover:text-slate-900 underline ml-2 cursor-pointer font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Real-time Discovery Progress Dashboard */}
          {currentJob && currentJob.status === "running" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Scanning "{currentJob.query}"</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold">
                        {(currentJob.depth || "DEEP").toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">{currentJob.message}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-mono font-semibold">
                  {currentJob.uniqueVideosCount} unique videos found
                </div>
              </div>
            </div>
          )}

          {/* Niche Saturation Assessment & Validated Multi-Channel Breakouts Banner */}
          {saturationScore && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-center ${
                      saturationScore.level === "blue_ocean"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : saturationScore.level === "saturated"
                        ? "bg-rose-50 border-rose-200 text-rose-600"
                        : "bg-amber-50 border-amber-200 text-amber-600"
                    }`}
                  >
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Niche Saturation Score :
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          saturationScore.level === "blue_ocean"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : saturationScore.level === "saturated"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {saturationScore.label}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        ({saturationScore.score}/100)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{saturationScore.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Creators</span>
                    <span className="font-mono font-bold text-slate-900">{saturationScore.distinctCreators}</span>
                  </div>
                  <div className="w-px h-5 bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Views / Creator</span>
                    <span className="font-mono font-bold text-blue-600">
                      {formatCompactNumber(saturationScore.viewsPerCreator)}
                    </span>
                  </div>
                  <div className="w-px h-5 bg-slate-200" />
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Breakout Rate</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {saturationScore.smallChannelsBreakoutRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Channel Validated Breakout Topics */}
              {validatedBreakoutTopics.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    Validated Concepts (3+ creators broke out) :
                  </span>
                  {validatedBreakoutTopics.map((val: any) => (
                    <button
                      key={val.topic}
                      type="button"
                      onClick={() => {
                        setSearchFilter(val.topic);
                        fetchFilteredPage(1, { search: val.topic });
                      }}
                      className="px-2.5 py-0.5 rounded-lg bg-[#111722] hover:bg-[#182130] text-slate-200 text-xs border border-[#1e2738] flex items-center gap-1"
                    >
                      <span className="capitalize">{val.topic}</span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">
                        {val.distinctChannelsCount} ch.
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results Count & Sort Bar (Algrow standard header above cards) */}
          <div className="flex items-center justify-between border-b border-[#141c28] pb-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <span className="text-white font-bold">{totalCount.toLocaleString()}</span>
              <span>viral videos found</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Updated just now</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium hidden sm:inline">Sort by</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setSortBy(val);
                    fetchFilteredPage(1, { sort: val });
                  }}
                  className="bg-[#0c1017] hover:bg-[#121824] border border-[#1c2433] text-slate-300 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none appearance-none pr-7 cursor-pointer transition-colors"
                >
                  <option value="vbs" className="bg-[#0c1017] text-white">
                    🔥 Viral Breakout Score (VBS)
                  </option>
                  <option value="views" className="bg-[#0c1017] text-white">
                    Most Views
                  </option>
                  <option value="outlier" className="bg-[#0c1017] text-white">
                    Outlier Multiplier
                  </option>
                  <option value="viral_ratio" className="bg-[#0c1017] text-white">
                    Viral Ratio (V/S)
                  </option>
                  <option value="vpd" className="bg-[#0c1017] text-white">
                    Velocity (Views/Day)
                  </option>
                  <option value="date" className="bg-[#0c1017] text-white">
                    Most Recent
                  </option>
                  <option value="engagement" className="bg-[#0c1017] text-white">
                    Engagement Rate
                  </option>
                  <option value="relevance" className="bg-[#0c1017] text-white">
                    Relevance
                  </option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Videos Grid (Algrow 3-column card design) */}
          {videos.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {videos.map((item) => {
                  const isSaved = savedVideoIds.includes(item.id);
                  const isTracked = trackedSuccessIds.includes(item.channelId);
                  const isTracking = trackingId === item.channelId;

                  // Infer Algrow Taxonomy: Category, Sub-niche, Clean Subject and Title Format
                  const taxonomy = inferVideoTaxonomy({
                    title: item.title,
                    category: (item as any).category || (item as any).foundViaQuery,
                    subNiche: (item as any).subNiche,
                    titlePattern: (item as any).titlePattern,
                    titleTemplate: (item as any).titleTemplate,
                  });

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
                    >
                      {/* Thumbnail Container */}
                      <div
                        onClick={() => setSelectedVideoId(item.id)}
                        className="relative aspect-video w-full bg-slate-900 overflow-hidden cursor-pointer group/thumb"
                        title="Click to inspect A/B testing & packaging history"
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                        />

                        {/* Bottom Left: Outlier Badge */}
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 backdrop-blur-md shadow-md ${
                              item.outlierMultiplier >= 5
                                ? "bg-rose-600 text-white"
                                : item.outlierMultiplier >= 2
                                ? "bg-amber-500 text-slate-950"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5 fill-current" />
                            <span>{item.outlierMultiplier}x</span>
                          </span>

                          {/* Score /100 and Outlier Badge */}
                          {((item as any).viralBreakoutScore || (item as any).relevanceScore) && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-mono font-bold backdrop-blur-md">
                              Score {((item as any).viralBreakoutScore || (item as any).relevanceScore)}/100
                            </span>
                          )}

                          {item.isValidatedBreakoutTopic && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                              Breakout
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                          <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Inspect Packaging & A/B</span>
                          </span>
                        </div>

                        {/* Duration Badge bottom right */}
                        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/85 text-white font-mono text-[10px] font-bold">
                          {item.durationFormatted}
                        </div>
                      </div>

                      {/* Card Body - Algrow Anatomy */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                        <div className="space-y-2">
                          {/* Video Title */}
                          <h3
                            onClick={() => setSelectedVideoId(item.id)}
                            className="font-bold text-slate-900 text-sm line-clamp-2 hover:text-blue-600 transition-colors leading-snug cursor-pointer"
                            title={item.title}
                          >
                            {item.title}
                          </h3>

                          {/* Stats Subline (Views • Age • VPD • VSR • Médiane estimée) */}
                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-slate-900 font-bold">{formatCompactNumber(item.viewCount)} Views</span>
                            <span>•</span>
                            <span>{getElapsedString(item.publishedAt)}</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-mono font-semibold">+{formatCompactNumber(item.viewsPerDay)}/j</span>
                            <span>•</span>
                            <span className="text-purple-600 font-mono font-semibold" title="Ratio Vues / Abonnés">
                              VSR: {((item as any).viralRatio || (item.viewCount / Math.max(item.channelSubscribers, 1))).toFixed(1)}x
                            </span>
                            {(item as any).medianReliable === false && (
                              <span className="text-amber-700 text-[10px] font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Médiane basée sur moins de 5 vidéos comparables">
                                (médiane estimée)
                              </span>
                            )}
                          </div>

                          {/* Category & Sub-Niche Pills */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                              {taxonomy.category}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                              {taxonomy.subNiche}
                            </span>
                          </div>

                          {/* Algrow Detail Lines: Subject & Title Format */}
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                            <div className="text-xs">
                              <span className="text-slate-400 font-medium block">Subject</span>
                              <span className="text-slate-800 font-semibold truncate block">
                                {taxonomy.subject}
                              </span>
                            </div>

                            <div className="text-xs">
                              <span className="text-slate-400 font-medium block">Title Format</span>
                              <span className="text-blue-600 font-medium font-mono text-[11px] truncate block" title={taxonomy.titleFormat}>
                                {taxonomy.titleFormat}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Channel Context Footer (Avatar + Name + Subs + Bookmark + Options) */}
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <div
                            onClick={() => router.push(`/channel/${item.channelId}`)}
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                          >
                            {item.channelAvatar ? (
                              <img
                                src={item.channelAvatar}
                                alt={item.channelTitle}
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                className="w-7 h-7 rounded-full border border-slate-200 object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0 border border-slate-200">
                                {item.channelTitle[0]}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px] leading-tight">
                                {item.channelTitle}
                              </div>
                              <div className="text-[11px] text-slate-500 leading-tight">
                                {formatCompactNumber(item.channelSubscribers)} Subs
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions (Track Channel in Channel Tracking + Bookmark + External YouTube) */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTrackChannel(
                                  item.channelId,
                                  item.channelTitle,
                                  item.channelAvatar || "",
                                  item.channelSubscribers || 1000
                                );
                              }}
                              disabled={isTracked || isTracking}
                              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                                isTracked
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                              }`}
                              title={isTracked ? "Chaîne suivie dans Channel Tracking" : "Suivre cette chaîne dans Channel Tracking"}
                            >
                              <Users className="w-3.5 h-3.5" />
                              {isTracked && <span className="text-[10px] font-bold">Suivie</span>}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVideoId(item.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1"
                              title="Voir l'historique et scraper les vidéos similaires"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => toggleSaveVideo(item.id, e)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSaved
                                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              }`}
                              title={isSaved ? "Vidéo sauvegardée" : "Sauvegarder la vidéo"}
                            >
                              {isSaved ? (
                                <BookmarkCheck className="w-4 h-4 fill-current text-amber-500" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>

                            <a
                              href={`https://www.youtube.com/watch?v=${item.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Ouvrir sur YouTube"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Server-Side Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    type="button"
                    onClick={() => fetchFilteredPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Previous
                  </button>

                  <span className="text-xs text-slate-500 font-mono px-3">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => fetchFilteredPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            !loading && (
              <div className="text-center py-20 bg-slate-50/50 border border-slate-200 rounded-2xl p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No viral videos found for this search</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try searching a broader niche (like "AI", "Gaming", "Horror Iceberg") or reducing the outlier filter threshold.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQueryInput("Minecraft challenge documentary");
                    startSearchJob("Minecraft challenge documentary");
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Try an example search
                </button>
              </div>
            )
          )}
        </main>

      {/* Video Detail & A/B Testing Modal */}
      {selectedVideoId && (
        <VideoDetailModal
          videoId={selectedVideoId}
          onClose={() => setSelectedVideoId(null)}
          onFindSimilar={(similarQuery) => {
            setQueryInput(similarQuery);
            handleInstantSearch(similarQuery);
          }}
        />
      )}

      {/* Advanced Filters Modal (Algrow 7 criteria) */}
      <AdvancedFiltersModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        filters={advancedFilters}
        onApply={(newFilters) => {
          setAdvancedFilters(newFilters);
          fetchFilteredPage(1, { advanced: newFilters });
        }}
        onReset={() => {
          resetAllFilters();
        }}
      />
    </div>
  );
}

export default function NicheFinderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-white items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <NicheFinderContent />
    </Suspense>
  );
}
