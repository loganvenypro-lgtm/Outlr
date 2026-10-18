"use client";

import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/niche-finder?q=${encodeURIComponent(query.trim())}`);
  };

  const handleRandom = () => {
    router.push(`/niche-finder`);
  };

  return (
    <section className="pt-16 pb-12 px-4 text-center max-w-4xl mx-auto">
      {/* Title matching screenshot */}
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
        Trouvez votre prochaine
        <span className="block text-[#2563eb] mt-1">vidéo atypique</span>
      </h1>

      {/* Pill Search Bar with Aléatoire button */}
      <form
        onSubmit={handleSearch}
        className="mt-8 flex items-center justify-center max-w-2xl mx-auto"
      >
        <div className="relative w-full flex items-center bg-white border border-slate-200/90 rounded-full pl-4 pr-1.5 py-1.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
          <input
            type="text"
            placeholder="Rechercher des vidéos, miniatures, niches et chaînes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleRandom}
            className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-colors shadow-sm ml-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aléatoire</span>
          </button>
        </div>
      </form>
    </section>
  );
}