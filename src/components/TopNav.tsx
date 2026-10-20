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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-md md:px-8">
      {/* Sidebar toggle + Title / Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="h-9 w-9 rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" />
        <div className="hidden h-5 w-px bg-slate-200 sm:block" />

        {breadcrumbs ? (
          <nav className="flex min-w-0 items-center text-[13px] font-medium text-slate-500" aria-label="Fil d'Ariane">
            {breadcrumbs.map((b, idx) => (
              <span key={idx} className="flex min-w-0 items-center">
                {idx > 0 && <span className="mx-2 shrink-0 text-slate-600">/</span>}
                {b.href ? (
                  <a
                    href={b.href}
                    className="truncate transition-colors hover:text-blue-600"
                  >
                    {b.label}
                  </a>
                ) : (
                  <span className="truncate font-semibold text-slate-900">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
            {title}
          </h1>
        )}
      </div>

      {/* Quick Search & Status */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleQuickSearch} className="relative hidden w-72 lg:block" role="search">
          <input
            type="text"
            placeholder="Rechercher une chaîne, une niche…"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            aria-label="Recherche rapide"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[13px] text-slate-900 placeholder-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </form>

        {/* Live Radar Badge */}
        <div className="hidden items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span>Radar actif</span>
        </div>

        {/* User Login & Avatar */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-blue-600 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-xs">
              L
            </div>
            <span className="hidden sm:inline">Connexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
