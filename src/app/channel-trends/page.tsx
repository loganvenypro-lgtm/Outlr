"use client";

import { useState, useEffect } from "react";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber } from "@/lib/utils";
import { 
  Flame, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Filter, 
  ExternalLink, 
  Bookmark, 
  Check, 
  Share2, 
  SlidersHorizontal, 
  ChevronDown, 
  Zap, 
  Play, 
  Video, 
  Eye, 
  Users, 
  DollarSign, 
  Layers, 
  Globe,
  Loader2,
  Tv,
  Radio,
  ArrowUpRight,
  TrendingDown,
  MoreHorizontal
} from "lucide-react";

interface TrendingVideo {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  viewsFormatted: string;
  publishedTimeText: string;
  multiplier: number;
  isShort?: boolean;
}

interface TrendingChannel {
  rank: number;
  channelId: string;
  title: string;
  handle?: string;
  avatar: string;
  subscriberCount?: number;
  subscribersFormatted?: string;
  language: string;
  category: string;
  isFaceless?: boolean;
  monetized?: boolean;
  views24h: number;
  views24hFormatted: string;
  dayBeforeViewsFormatted: string;
  growthPct: number;
  views48hFormatted: string;
  subs24hFormatted: string;
  topVideos: TrendingVideo[];
}

const QUICK_TAGS = [
  "AI",
  "Gaming",
  "Documentaries",
  "Motivation",
  "Business",
  "Sports",
  "Movies",
  "Horror & Iceberg",
  "Tech",
];

export default function ChannelTrendsPage() {
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<TrendingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [formatFilter, setFormatFilter] = useState<"all" | "long" | "short">("short");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"views24h" | "growth" | "subscribers">("views24h");
  const [savedChannels, setSavedChannels] = useState<Set<string>>(new Set());

  // Fetch Channel Trends
  const fetchChannelTrends = async (searchTerm = query, format = formatFilter, sort = sortBy) => {
    setLoading(true);
    try {
      const q = searchTerm.trim() || "trending";
      const res = await fetch(`/api/youtube/channel-trends?q=${encodeURIComponent(q)}&format=${format}&sort=${sort}`);
      const data = await res.json();
      if (data.channels) {
        setChannels(data.channels);
      }
    } catch (err) {
      console.error("Failed to load channel trends:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannelTrends(query, formatFilter, sortBy);
  }, [formatFilter, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChannelTrends(query, formatFilter, sortBy);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    fetchChannelTrends(tag, formatFilter, sortBy);
  };

  const toggleSave = (channelId: string) => {
    setSavedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  };

  // Local filter for category
  const filteredChannels = channels.filter((c) => {
    if (selectedCategory !== "all" && c.category.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 min-w-0 bg-white text-slate-900 min-h-screen">
      {/* TopNav */}
      <TopNav
        title="Channel Trends"
        breadcrumbs={[
          { label: "Research Tools", href: "/dashboard" },
          { label: "Channel Trends" }
        ]}
      />

      <main className="px-4 sm:px-8 py-8 max-w-7xl mx-auto space-y-6">
        {/* Header matching reference */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse text-blue-500" /> Research Tools
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Channel Trends</h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
            Discover channels gaining unusual momentum right now with 24h & 48h live volume tracking.
          </p>
        </div>

        {/* Search Bar matching screenshot */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Channel, Niches, @handles or topics..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-28 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-inner transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30"
            >
              Search <span className="text-[13px]">→</span>
            </button>
          </div>
        </form>

        {/* Try Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-medium mr-1 text-[11.5px] uppercase tracking-wider">Try</span>
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                query.toLowerCase() === tag.toLowerCase()
                  ? "bg-blue-600/25 border-blue-500/60 text-blue-300 shadow-sm"
                  : "bg-white border-slate-200 text-slate-300 hover:bg-slate-50 hover:text-white"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Filter by Bar matching screenshot */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 font-medium mr-1">Filter by</span>

            {/* Shorts / Longform pills */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setFormatFilter("short")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  formatFilter === "short"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/10"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Tv className="w-3.5 h-3.5 text-rose-400" /> Short
              </button>
              <button
                type="button"
                onClick={() => setFormatFilter("long")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  formatFilter === "long"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/10"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Video className="w-3.5 h-3.5 text-blue-400" /> Longform
              </button>
              <button
                type="button"
                onClick={() => setFormatFilter("all")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  formatFilter === "all"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/10"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All
              </button>
            </div>

            {/* Category dropdown pill */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 text-slate-600 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-slate-500 font-medium"
            >
              <option value="all">Category (All)</option>
              <option value="Documentary">Documentary</option>
              <option value="Gaming">Gaming</option>
              <option value="Tech & Reviews">Tech & Reviews</option>
              <option value="Business & Finance">Business & Finance</option>
              <option value="Commentary">Commentary</option>
              <option value="Sports">Sports</option>
              <option value="Horror & Iceberg">Horror & Iceberg</option>
            </select>

            {/* Audience pill */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-slate-50">
              <Users className="w-3.5 h-3.5 text-slate-500" /> Audience <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            {/* Monetisation pill */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-slate-50">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Monetisation <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            {/* Faceless pill */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-slate-50">
              <Eye className="w-3.5 h-3.5 text-amber-400" /> Faceless <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            {/* Collabs pill */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-slate-50">
              Collabs <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            {/* CMS */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-slate-50">
              CMS <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            {/* More Filters */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer hover:bg-slate-50">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> More Filters
            </div>
          </div>

          {/* Sort By selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 text-slate-900 font-semibold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="views24h">Views (24h)</option>
              <option value="growth">Velocity / Spike</option>
              <option value="subscribers">Subscribers</option>
            </select>
          </div>
        </div>

        {/* Content State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-500 space-y-4">
            <Loader2 className="w-9 h-9 animate-spin text-blue-500" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-900">Live YouTube Momentum Radar</p>
              <p className="text-xs text-slate-500 mt-1">Aggregating real-time 24h & 48h view metrics from channels...</p>
            </div>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-24 bg-white border border-slate-200 rounded-3xl">
            <p className="text-slate-600 font-medium text-sm">No trending channels found matching this query or format.</p>
            <button
              onClick={() => { setFormatFilter("all"); setQuery(""); }}
              className="mt-3 text-xs text-blue-400 hover:underline font-semibold"
            >
              Reset filters & format
            </button>
          </div>
        ) : (
          /* Cards Grid (3 Columns) - Ultra sleek modern design matching screenshot */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChannels.map((channel) => (
              <div
                key={channel.channelId}
                className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-slate-200 hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all flex flex-col justify-between relative group"
              >
                <div className="space-y-4">
                  {/* Top Bar: #Rank, Avatar, Title, Metadata Tags */}
                  <div className="flex items-start gap-3.5">
                    <span className="text-2xl font-black text-slate-500 font-mono tracking-tighter shrink-0 pt-0.5">
                      #{channel.rank}
                    </span>
                    <img
                      src={channel.avatar}
                      alt={channel.title}
                      className="w-11 h-11 rounded-2xl object-cover border border-slate-200 bg-[#1a1d2c] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900 truncate hover:text-blue-400 transition-colors">
                          <a
                            href={`https://youtube.com/channel/${channel.channelId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {channel.title}
                          </a>
                        </h3>
                      </div>
                      
                      {/* Meta pills matching screenshot: 900K • English • Category */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] text-slate-500">
                        {channel.subscribersFormatted && (
                          <span className="font-semibold text-slate-600">{channel.subscribersFormatted}</span>
                        )}
                        <span className="text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <Globe className="w-3 h-3 text-slate-500" /> {channel.language}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#1e2233] border border-slate-200 text-slate-600 text-[10px] font-medium">
                          {channel.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Videos Showcase (Cards with Outlier Badges & Aspect) */}
                  <div className={`grid ${formatFilter === "short" ? "grid-cols-3" : "grid-cols-2"} gap-2.5 pt-1`}>
                    {channel.topVideos.map((video) => (
                      <a
                        key={video.id}
                        href={`https://youtube.com/watch?v=${video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/vid block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-500/80 transition-all shadow-sm"
                      >
                        <div className={`relative ${formatFilter === "short" ? "aspect-[9/16]" : "aspect-video"} w-full bg-slate-900 overflow-hidden`}>
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover/vid:scale-105 transition-transform duration-300"
                          />
                          {/* Multiplier Outlier Badge */}
                          <div className="absolute bottom-1.5 left-1.5 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold text-amber-300 flex items-center gap-1 border border-amber-500/30 shadow-md">
                            <Zap className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                            {video.multiplier}x
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          <p className="text-[11.5px] font-medium text-slate-700 line-clamp-1 group-hover/vid:text-blue-400">
                            {video.title}
                          </p>
                          <div className="flex items-center justify-between text-[10.5px] text-slate-500">
                            <span className="font-semibold text-slate-600">{video.viewsFormatted} views</span>
                            <span className="text-slate-500">{video.publishedTimeText}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Large 24h Views & Momentum Metrics matching screenshot */}
                  <div className="pt-2">
                    <div className="text-3xl font-black text-emerald-400 tracking-tight font-mono">
                      {channel.views24hFormatted}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                      Views • 24h
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 text-xs">
                      {/* Spike badge */}
                      <div className="flex items-center gap-1.5">
                        {channel.growthPct >= 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" /> +{channel.growthPct}%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[11px] flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" /> {channel.growthPct}%
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px]">
                          Day before {channel.dayBeforeViewsFormatted}
                        </span>
                      </div>

                      {/* 48h and Subs metric */}
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span>Views 48h <strong className="text-slate-600">{channel.views48hFormatted}</strong></span>
                        <span>Subs 24h <strong className="text-slate-600">{channel.subs24hFormatted}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Save & Actions matching screenshot */}
                <div className="mt-5 pt-3.5 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => toggleSave(channel.channelId)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border transition-all ${
                      savedChannels.has(channel.channelId)
                        ? "bg-blue-600/25 border-blue-500/60 text-blue-300"
                        : "bg-white border-slate-200 text-slate-300 hover:bg-slate-50 hover:text-white"
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${savedChannels.has(channel.channelId) ? "fill-blue-400 text-blue-400" : ""}`} />
                    {savedChannels.has(channel.channelId) ? "Saved" : "Save"}
                  </button>

                  <div className="flex items-center gap-1">
                    <a
                      href={`https://youtube.com/channel/${channel.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all"
                      title="Open on YouTube"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
