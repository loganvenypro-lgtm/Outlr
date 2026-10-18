"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User } from "lucide-react";

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
    router.push(`/?q=${encodeURIComponent(headerSearch.trim())}`);
  };

  return (
    <header className="h-16 bg-[#0a0f1c]/80 backdrop-blur-md border-b border-[#1a2337] px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title / Breadcrumbs */}
      <div className="flex items-center gap-2">
        {breadcrumbs ? (
          <nav className="flex items-center text-sm font-medium text-slate-400">
            {breadcrumbs.map((b, idx) => (
              <span key={idx} className="flex items-center">
                {idx > 0 && <span className="mx-2 text-slate-600">/</span>}
                {b.href ? (
                  <a href={b.href} className="hover:text-blue-400 transition-colors">
                    {b.label}
                  </a>
                ) : (
                  <span className="text-white font-semibold">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        )}
      </div>

      {/* Quick Search & Profile Placeholder */}
      <div className="flex items-center gap-4">
        <form onSubmit={handleQuickSearch} className="relative hidden md:block w-72">
          <input
            type="text"
            placeholder="Quick channel search..."
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            className="w-full bg-[#11192d] border border-[#1e2a42] rounded-lg px-3.5 py-1.5 pl-9 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </form>

        {/* YouTube API Status Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>API Connected</span>
        </div>

        {/* Profile Placeholder (No auth as requested) */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1a2337]">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
