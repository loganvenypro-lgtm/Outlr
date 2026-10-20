"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Sparkles, 
  Users, 
  Video, 
  Eye, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  TrendingUp,
  History,
  X,
  ChevronRight
} from "lucide-react";
import { ChannelSearchResult } from "@/types/youtube";
import { formatCompactNumber } from "@/lib/utils";

const RECENT_SEARCHES_KEY = "newiq_recent_channels";

interface StoredChannel {
  id: string;
  title: string;
  avatar: string;
  customUrl?: string;
}

export function ChannelSearchDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ChannelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentChannels, setRecentChannels] = useState<StoredChannel[]>([]);

  // Autocomplete / Suggestions state
  const [suggestions, setSuggestions] = useState<ChannelSearchResult[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentChannels(JSON.parse(stored));
      }
    } catch {
      // LocalStorage errors ignored
    }
  }, []);

  // Execute search if query passed from URL
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Live Suggestions as the user types (inspired by ViewStats)
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
        // Silently catch suggestion errors
      } finally {
        setIsSuggesting(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentChannel = (channel: { id: string; title: string; avatar: string; customUrl?: string }) => {
    try {
      const updated = [
        channel,
        ...recentChannels.filter((c) => c.id !== channel.id),
      ].slice(0, 6);
      setRecentChannels(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore write errors
    }
  };

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

  const executeSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setShowDropdown(false);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchTerm.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search request failed");
      }

      setResults(data.channels || []);
    } catch (err: any) {
      setError(err.message || "Failed to search for channels");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelectChannel(suggestions[selectedIndex]);
      return;
    }
    if (query.trim()) {
      executeSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSelectChannel = (channel: ChannelSearchResult) => {
    setShowDropdown(false);
    saveRecentChannel({
      id: channel.id,
      title: channel.title,
      avatar: channel.thumbnail,
      customUrl: channel.customUrl,
    });
    router.push(`/channel/${channel.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Welcome & Search Banner */}
      <section className="text-center space-y-4 pt-4 pb-2" id="search-section">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>YouTube Creator Intelligence</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-tight">
          Discover YouTube channels and explore their{" "}
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
            real-time performance
          </span>
        </h1>

        <p className="text-slate-500 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          Access verified statistics, recent video analytics, view distributions, and public creator KPIs inspired by ViewStats.
        </p>

        {/* Search Bar Input Container with Floating Live Suggestions */}
        <div className="max-w-3xl mx-auto pt-4 relative" ref={dropdownRef}>
          <form onSubmit={handleSubmit}>
            <div className={`relative flex items-center bg-white border-2 transition-all p-2 shadow-2xl shadow-blue-950/20 ${
              showDropdown && (suggestions.length > 0 || isSuggesting)
                ? "border-blue-500 rounded-t-2xl rounded-b-none border-b-[#1c2944]"
                : "border-slate-200 focus-within:border-blue-500 rounded-2xl"
            }`}>
              <Search className="w-6 h-6 text-slate-500 ml-3.5 mr-2 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search by channel name, handle (@MrBeast), ID, or YouTube link..."
                className="w-full bg-transparent text-slate-900 text-base placeholder-slate-400 focus:outline-none px-2 py-2"
                autoFocus
              />

              {isSuggesting && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400 mr-2 shrink-0" />
              )}

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSuggestions([]);
                    setShowDropdown(false);
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-900 mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-blue-600/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching</span>
                  </>
                ) : (
                  <>
                    <span>Analyze</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Autocomplete Suggestions Dropdown (Styled exactly like ViewStats) */}
          {showDropdown && (suggestions.length > 0 || isSuggesting) && (
            <div className="absolute left-0 right-0 top-full bg-white border-2 border-t-0 border-blue-500 rounded-b-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 divide-y divide-slate-200 max-h-96 overflow-y-auto">
              {suggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectChannel(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#1d2a4a]" : "hover:bg-[#18233c]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=2563eb&color=fff&size=200`}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=2563eb&color=fff&size=200`;
                        }}
                        className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <div className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                          <span>{item.title}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          {item.customUrl ? (
                            <span className="text-blue-400 font-medium">
                              {item.customUrl.startsWith("@") ? item.customUrl : `@${item.customUrl}`}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">{item.id}</span>
                          )}
                          {item.subscriberCount !== undefined && !item.hiddenSubscriberCount && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-600 font-medium">
                                {formatCompactNumber(item.subscriberCount)} subs
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-3">
                      {item.viewCount !== undefined && (
                        <div className="hidden sm:flex flex-col text-right">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Views</span>
                          <span className="text-xs font-bold text-slate-600">{formatCompactNumber(item.viewCount)}</span>
                        </div>
                      )}
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-blue-400 translate-x-0.5" : "text-slate-600"}`} />
                    </div>
                  </div>
                );
              })}

              {isSuggesting && suggestions.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Searching channels...</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 mt-3">
            <span className="text-slate-500">Try searching:</span>
            {["@MrBeast", "Veritasium", "MKBHD", "Fireship"].map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => {
                  setQuery(tag);
                  executeSearch(tag);
                }}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 hover:text-blue-400 text-slate-600 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Searched Channels */}
      {recentChannels.length > 0 && (
        <section className="bg-white/60 border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <History className="w-4 h-4 text-blue-400" />
              <span>Recently Searched</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRecentChannels([]);
                localStorage.removeItem(RECENT_SEARCHES_KEY);
              }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear history
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentChannels.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/channel/${item.id}`)}
                className="group relative flex flex-col items-center p-3 rounded-xl bg-[#141d33] border border-slate-200 hover:border-blue-500/50 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <button
                  type="button"
                  onClick={(e) => removeRecent(e, item.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                  title="Remove from history"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <img
                  src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=2563eb&color=fff&size=200`}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title)}&background=2563eb&color=fff&size=200`;
                  }}
                  className="w-12 h-12 rounded-full border border-slate-700 object-cover mb-2 group-hover:scale-105 transition-transform"
                />
                <span className="text-xs font-medium text-slate-700 truncate w-full text-center">
                  {item.title}
                </span>
                {item.customUrl && (
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">
                    {item.customUrl}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-rose-200">Unable to complete search</p>
            <p className="text-rose-300/90 mt-0.5">{error}</p>
            {error.includes("YOUTUBE_API_KEY") && (
              <p className="text-xs text-rose-400 mt-2 bg-rose-950/70 p-2 rounded">
                Please add your official YouTube Data API v3 key inside <code className="text-slate-900">.env.local</code> as <code className="text-slate-900">YOUTUBE_API_KEY=YOUR_KEY</code>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Searching YouTube API...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl p-5 flex gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 shrink-0"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-1/4"></div>
                  <div className="h-3 bg-slate-800/40 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {!loading && hasSearched && results.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span>Matching Channels</span>
              <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                {results.length} found
              </span>
            </h2>
            <span className="text-xs text-slate-500">Click a channel to open full analytics</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((channel) => (
              <div
                key={channel.id}
                onClick={() => handleSelectChannel(channel)}
                className="group relative bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all cursor-pointer shadow-lg hover:shadow-blue-900/10"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={channel.thumbnail || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.title)}&background=2563eb&color=fff&size=200`}
                    alt={channel.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.title)}&background=2563eb&color=fff&size=200`;
                    }}
                    className="w-16 h-16 rounded-full border border-slate-700 object-cover shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-base truncate group-hover:text-blue-400 transition-colors">
                        {channel.title}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </div>

                    {channel.customUrl && (
                      <p className="text-xs text-slate-500 font-medium">
                        {channel.customUrl.startsWith("@") ? channel.customUrl : `@${channel.customUrl}`}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                      {channel.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-200 text-center">
                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                      <Users className="w-3 h-3 text-blue-400" /> Subscribers
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                      {channel.hiddenSubscriberCount ? "Hidden" : formatCompactNumber(channel.subscriberCount)}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                      <Eye className="w-3 h-3 text-emerald-400" /> Total Views
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                      {formatCompactNumber(channel.viewCount)}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium">
                      <Video className="w-3 h-3 text-indigo-400" /> Videos
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                      {formatCompactNumber(channel.videoCount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* No results empty state */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-8 space-y-3">
          <Search className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No channels found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            We couldn't find any channels matching <span className="text-blue-400 font-medium">"{query}"</span>. Try searching with an exact handle (e.g. @MrBeast) or the channel ID.
          </p>
        </div>
      )}

      {/* Value props overview (Clean & informative) */}
      {!hasSearched && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Verified Channel KPIs</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Retrieve official subscriber counts, lifetime video uploads, total accumulated view counts, and channel metadata directly from YouTube.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Recent Video Performance</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analyze the latest 10–12 uploaded videos, comparing views, likes, comments, and engagement distributions with interactive charts.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No Fabricated Data</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              True-to-source analytics. Calculated statistics like sample median views and averages are transparently labeled from retrieved data.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
