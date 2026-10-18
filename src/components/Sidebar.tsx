"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  Search, 
  Flame, 
  Sparkles, 
  Zap, 
  Layers, 
  Bell, 
  Compass, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  DollarSign,
  Radio,
  Video,
  Film,
  FolderHeart,
  Wand2,
  Cpu,
  Share2,
  Headphones,
  CreditCard,
  Settings,
  LogOut,
  SlidersHorizontal,
  Gift,
  BarChart3
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  // Collapsible sections state
  const [researchOpen, setResearchOpen] = useState(true);
  const [creationOpen, setCreationOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const researchTools = [
    {
      name: "Viral Videos",
      href: "/niche-finder",
      icon: Flame,
      active: pathname === "/niche-finder",
      badge: "Outliers",
    },
    {
      name: "Viral AI Strategist",
      href: "/viral-chat",
      icon: Sparkles,
      active: pathname === "/viral-chat",
      badge: "Chat RAG",
    },
    {
      name: "Global Pipeline Stats",
      href: "/stats",
      icon: BarChart3,
      active: pathname === "/stats" || pathname === "/dashboard",
      badge: "14.6k+",
    },
    {
      name: "Find Channel",
      href: "/",
      icon: Search,
      active: pathname === "/" || pathname.startsWith("/search") || pathname.startsWith("/channel"),
    },
    {
      name: "Channel Trends",
      href: "/trending",
      icon: TrendingUp,
      active: pathname === "/trending",
    },
    {
      name: "Channel Tracking",
      href: "/tracking",
      icon: Bell,
      active: pathname === "/tracking",
      badge: "Radar",
    },
    {
      name: "Concurrents & Niche",
      href: "/dashboard/similar-channels",
      icon: Compass,
      active: pathname.startsWith("/dashboard/similar-channels"),
      badge: "Audience",
    },
    {
      name: "Thumbnail Intelligence",
      href: "/thumbnail-intelligence",
      icon: Sparkles,
      active: pathname === "/thumbnail-intelligence",
      badge: "A/B Test",
    },
  ];

  const creationTools = [
    {
      name: "TubeLab Studio",
      href: "/tubelab",
      icon: Zap,
      active: pathname === "/tubelab",
      badge: "Studio",
    },
    {
      name: "Title & Packaging",
      href: "/title-lab",
      icon: Wand2,
      active: pathname === "/title-lab",
    },
  ];

  const marketTools = [
    {
      name: "Monetization Tracker",
      href: "/sponsors",
      icon: DollarSign,
      active: pathname === "/sponsors",
    },
    {
      name: "Brand Discovery",
      href: "/leads",
      icon: FolderHeart,
      active: pathname === "/leads",
    },
  ];

  return (
    <aside className="w-64 bg-[#0a0d14] border-r border-[#161b26] flex flex-col justify-between shrink-0 h-screen sticky top-0 text-slate-300 select-none z-40 text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
      <div className="flex flex-col p-3 space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/30">
              N
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-white tracking-tight group-hover:text-blue-400 transition-colors">
                NewIQ
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Creator Intel &amp; Viral Radar</span>
            </div>
          </Link>
          <div className="w-6 h-6 rounded-md hover:bg-slate-800/60 flex items-center justify-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors" title="Algrow Layout">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Quick Search Input with ⌘K Badge */}
        <div className="relative px-1">
          <div className="flex items-center gap-2 bg-[#10141e] border border-[#1d2333] hover:border-[#2a3349] focus-within:border-blue-500/80 rounded-xl px-2.5 py-1.5 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
            <kbd className="px-1.5 py-0.5 rounded bg-[#161c2b] text-[10px] text-slate-400 font-mono border border-[#232c42] shrink-0">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Section 1: Research Tools */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setResearchOpen(!researchOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-slate-400 hover:text-white font-semibold text-[11px] uppercase tracking-wider transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Research Tools</span>
            </div>
            {researchOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {researchOpen && (
            <div className="space-y-0.5 pt-0.5">
              {researchTools.map((item) => {
                const Icon = item.icon;
                const isActive = item.active;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-medium transition-all group ${
                      isActive
                        ? "bg-[#141b29] text-white border border-blue-500/30 shadow-sm shadow-blue-950/40"
                        : "text-slate-400 hover:text-white hover:bg-[#121622]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0 font-mono ${
                        isActive
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : item.badge === "Zero Quota"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-[#182030] text-slate-400 border border-[#222b40]"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Creation Tools */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setCreationOpen(!creationOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-slate-400 hover:text-white font-semibold text-[11px] uppercase tracking-wider transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Creation Tools</span>
            </div>
            {creationOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {creationOpen && (
            <div className="space-y-0.5 pt-0.5">
              {creationTools.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl font-medium transition-all group ${
                      item.active
                        ? "bg-[#141b29] text-white border border-blue-500/30"
                        : "text-slate-400 hover:text-white hover:bg-[#121622]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#182030] text-slate-400 border border-[#222b40] shrink-0 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Section: Account + Credits Widget + Log Out */}
      <div className="p-3 border-t border-[#161b26] space-y-3 bg-[#080b10]">
        {/* Account links */}
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider px-2 font-semibold block">Account</span>
          <a
            href="mailto:support@newiq.app"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#10141e] transition-colors"
          >
            <Headphones className="w-3.5 h-3.5 text-slate-400" />
            <span>Priority Support</span>
          </a>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#10141e] transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </Link>
        </div>

        {/* Algrow-Style Credits Widget */}
        <div className="bg-[#0e121a] border border-[#1b2233] rounded-xl p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <div className="flex items-center gap-1.5 text-blue-400">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Credits</span>
            </div>
            <span className="font-mono text-slate-300 text-[11px]">Illimité / 0 Quota</span>
          </div>

          {/* Dash style progress indicator */}
          <div className="flex items-center gap-1">
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-sm ${i < 11 ? "bg-blue-500" : "bg-slate-700/50"}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span>InnerTube + RSS Active</span>
            <button
              type="button"
              onClick={() => alert("Scraping en direct actif : Vos scans consomment 0 quota officiel.")}
              className="px-2 py-0.5 rounded-md bg-[#182133] hover:bg-blue-600 text-slate-200 hover:text-white font-semibold transition-colors border border-[#243049]"
            >
              Statut
            </button>
          </div>
        </div>

        {/* Log Out */}
        <button
          type="button"
          onClick={() => alert("Session locale active.")}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-lg hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
