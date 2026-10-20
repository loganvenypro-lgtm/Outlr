"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatFullNumber } from "@/lib/utils";
import { 
  Users, 
  Search, 
  ArrowRight, 
  ArrowLeftRight, 
  Loader2, 
  Trophy, 
  Eye, 
  Video, 
  Check, 
  ExternalLink,
  Sparkles,
  TrendingUp,
  Percent
} from "lucide-react";

export default function ComparePage() {
  const [query1, setQuery1] = useState("@MrBeast");
  const [query2, setQuery2] = useState("Veritasium");

  const [channel1, setChannel1] = useState<any | null>(null);
  const [channel2, setChannel2] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChannelData = async (q: string) => {
    const sRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(q.trim())}`);
    const sData = await sRes.json();
    if (!sRes.ok || !sData.channels || sData.channels.length === 0) {
      throw new Error(`Chaîne "${q}" introuvable.`);
    }
    const cId = sData.channels[0].id;
    const chRes = await fetch(`/api/youtube/channel?id=${cId}`);
    const chData = await chRes.json();
    return chData.channel;
  };

  const handleCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query1.trim() || !query2.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const [c1, c2] = await Promise.all([
        fetchChannelData(query1),
        fetchChannelData(query2),
      ]);
      setChannel1(c1);
      setChannel2(c2);
    } catch (err: any) {
      setError(err.message || "Erreur de comparaison");
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    handleCompare();
  });

  const getWinner = (v1: number = 0, v2: number = 0) => {
    if (v1 > v2) return 1;
    if (v2 > v1) return 2;
    return 0;
  };

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="Comparateur de Concurrents" 
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Comparateur de Chaînes (ViewStats Battle)" }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Comparateur de Concurrents
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  ViewStats Head-to-Head
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Comparez les performances réelles de 2 créateurs YouTube côte à côte (abonnés, ratio vues/vidéo, volume d'uploads).
              </p>
            </div>
          </div>

          {/* Compare Input Bar */}
          <form onSubmit={handleCompare} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query1}
                  onChange={(e) => setQuery1(e.target.value)}
                  placeholder="Chaîne 1 (ex: @MrBeast)..."
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query2}
                    onChange={(e) => setQuery2(e.target.value)}
                    placeholder="Chaîne 2 (ex: Veritasium)..."
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30 shrink-0"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                  <span>Comparer</span>
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Results Comparison Grid */}
          {!loading && channel1 && channel2 && (
            <div className="space-y-6">
              {/* Top Profile Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Channel 1 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={channel1.avatar}
                      alt={channel1.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-16 h-16 rounded-2xl border border-slate-700 object-cover shadow-lg"
                    />
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">{channel1.title}</h3>
                      <p className="text-xs text-blue-400">{channel1.customUrl || channel1.id}</p>
                    </div>
                  </div>
                  <a
                    href={`/channel/${channel1.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Voir Analytics
                  </a>
                </div>

                {/* Channel 2 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={channel2.avatar}
                      alt={channel2.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-16 h-16 rounded-2xl border border-slate-700 object-cover shadow-lg"
                    />
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">{channel2.title}</h3>
                      <p className="text-xs text-blue-400">{channel2.customUrl || channel2.id}</p>
                    </div>
                  </div>
                  <a
                    href={`/channel/${channel2.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Voir Analytics
                  </a>
                </div>
              </div>

              {/* Head to Head Metrics Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Face-à-Face des Métriques Réelles</span>
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      label: "Abonnés Vérifiés",
                      v1: channel1.subscriberCount || 0,
                      v2: channel2.subscriberCount || 0,
                      formatted1: formatCompactNumber(channel1.subscriberCount),
                      formatted2: formatCompactNumber(channel2.subscriberCount),
                    },
                    {
                      label: "Vues Totales à Vie",
                      v1: channel1.viewCount,
                      v2: channel2.viewCount,
                      formatted1: formatCompactNumber(channel1.viewCount),
                      formatted2: formatCompactNumber(channel2.viewCount),
                    },
                    {
                      label: "Vidéos Téléversées",
                      v1: channel1.videoCount,
                      v2: channel2.videoCount,
                      formatted1: formatCompactNumber(channel1.videoCount),
                      formatted2: formatCompactNumber(channel2.videoCount),
                    },
                    {
                      label: "Moyenne Vues / Vidéo",
                      v1: channel1.videoCount > 0 ? Math.round(channel1.viewCount / channel1.videoCount) : 0,
                      v2: channel2.videoCount > 0 ? Math.round(channel2.viewCount / channel2.videoCount) : 0,
                      formatted1: formatCompactNumber(channel1.videoCount > 0 ? Math.round(channel1.viewCount / channel1.videoCount) : 0),
                      formatted2: formatCompactNumber(channel2.videoCount > 0 ? Math.round(channel2.viewCount / channel2.videoCount) : 0),
                    },
                  ].map((row, idx) => {
                    const win = getWinner(row.v1, row.v2);
                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                        <div className={`flex-1 text-left ${win === 1 ? "text-emerald-400 font-extrabold" : "text-slate-900 font-bold"}`}>
                          <span className="text-lg font-mono block">{row.formatted1}</span>
                          {win === 1 && <span className="text-[10px] uppercase font-semibold text-emerald-400">En tête (+{formatCompactNumber(row.v1 - row.v2)})</span>}
                        </div>

                        <div className="text-center px-4">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{row.label}</span>
                        </div>

                        <div className={`flex-1 text-right ${win === 2 ? "text-emerald-400 font-extrabold" : "text-slate-900 font-bold"}`}>
                          <span className="text-lg font-mono block">{row.formatted2}</span>
                          {win === 2 && <span className="text-[10px] uppercase font-semibold text-emerald-400">En tête (+{formatCompactNumber(row.v2 - row.v1)})</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
