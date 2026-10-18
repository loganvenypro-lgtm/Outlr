"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface TopNavProps {
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export function TopNav({ title = "Dashboard", breadcrumbs }: TopNavProps) {
  const router = useRouter();
  const [headerSearch, setHeaderSearch] = useState("");

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    router.push(`/niche-finder?q=${encodeURIComponent(headerSearch.trim())}`);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      {/* Sidebar toggle + Title / Breadcrumbs */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg" />
        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {breadcrumbs ? (
          <nav className="flex items-center text-xs font-medium text-slate-500">
            {breadcrumbs.map((b, idx) => (
              <span key={idx} className="flex items-center">
                {idx > 0 && <span className="mx-2 text-slate-300">/</span>}
                {b.href ? (
                  <a
                    href={b.href}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {b.label}
                  </a>
                ) : (
                  <span className="text-slate-900 font-semibold">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
        )}
      </div>

      {/* Quick Search & Status */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleQuickSearch} className="relative hidden md:block w-64">
          <input
            type="text"
            placeholder="Rechercher une chaîne, niche..."
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </form>

        {/* Live Radar Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Radar Actif</span>
        </div>

        {/* User Avatar */}
        <div className="flex items-center pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </header>
  );
}
