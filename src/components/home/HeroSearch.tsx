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
    <section className="px-6 pb-14 pt-20 text-center md:px-10 md:pb-16 md:pt-24">
      <div className="mx-auto max-w-3xl">
        {/* Eyebrow badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-4 py-1.5 text-[12.5px] font-semibold text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          Radar de vidéos hors-norme
        </div>

        {/* Title */}
        <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 md:text-[3.4rem]">
          Trouvez votre prochaine
          <span className="block text-blue-600">vidéo atypique</span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-500 md:text-base">
          Repérez les vidéos qui surperforment leur chaîne, explorez les niches qui montent et trouvez votre prochain sujet.
        </p>

        {/* Pill Search Bar with Aléatoire button */}
        <form
          onSubmit={handleSearch}
          className="mx-auto mt-9 flex max-w-2xl items-center justify-center"
          role="search"
        >
          <div className="relative flex w-full items-center rounded-2xl border border-slate-200 bg-white py-2 pl-5 pr-2 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.12)] transition-all hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
            <Search className="mr-3 h-[18px] w-[18px] shrink-0 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher une niche, une chaîne, un sujet…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher des vidéos"
              className="w-full bg-transparent text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleRandom}
              className="ml-3 flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-slate-700 active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              <span>Aléatoire</span>
            </button>
          </div>
        </form>

        {/* Quick suggestions */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[13px]">
          <span className="text-slate-500">Essayez :</span>
          {["cuisine", "finance", "gaming", "sport"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => router.push(`/niche-finder?q=${encodeURIComponent(s)}`)}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}