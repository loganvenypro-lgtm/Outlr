"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  Briefcase, 
  Search, 
  Building, 
  Users, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Download, 
  Bookmark, 
  BookmarkCheck, 
  Filter, 
  Loader2, 
  ArrowRight,
  TrendingUp,
  Tag,
  Mail,
  Layers,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";

interface BrandItem {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  contactEmail?: string;
  contactRole?: string;
  collaborationsCount: number;
  creatorsCount: number;
  creators: any[];
  totalViews: number;
  lastDetected: string;
  commercialStatus: string;
  isFavorite: boolean;
}

export default function SponsorDiscoveryPage() {
  const router = useRouter();

  // Search Mode: 'global' | 'creator' | 'brand'
  const [searchMode, setSearchMode] = useState<"global" | "creator" | "brand">("creator");
  const [query, setQuery] = useState("@MrBeast");
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [creatorAuditReports, setCreatorAuditReports] = useState<any[]>([]);
  const [creatorInfo, setCreatorInfo] = useState<any | null>(null);

  // Filters & sorting
  const [industryFilter, setIndustryFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"views" | "deals" | "recent">("deals");
  const [searchFilter, setSearchFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Initial load: Fetch saved brands from local DB
  const loadBrandsFromDb = async (searchTerm = "") => {
    try {
      const res = await fetch(`/api/brands?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (res.ok && data.brands) {
        setBrands(data.brands);
      }
    } catch {}
  };

  useEffect(() => {
    loadBrandsFromDb();
  }, []);

  // Execute Creator Search (Method A)
  const handleCreatorSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    setProgressText("Identification de la chaîne YouTube...");

    try {
      // 1. Resolve channel ID
      const sRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchTerm.trim())}`);
      const sData = await sRes.json();
      if (!sRes.ok || !sData.channels || sData.channels.length === 0) {
        throw new Error("Chaîne introuvable. Vérifiez le nom, handle ou ID.");
      }

      const chan = sData.channels[0];
      setCreatorInfo(chan);
      setProgressText(`Récupération des métadonnées de ${chan.title}...`);

      // 2. Fetch uploads playlist
      const chRes = await fetch(`/api/youtube/channel?id=${chan.id}`);
      const chData = await chRes.json();
      if (!chRes.ok || !chData.channel) {
        throw new Error("Impossible de charger les métadonnées de la chaîne.");
      }

      setProgressText("Analyse des vidéos & détection des sponsors (SponsorBlock + Descriptions)...");

      // 3. Audit sponsors and save to local DB
      const spRes = await fetch(
        `/api/youtube/sponsors?playlistId=${encodeURIComponent(chData.channel.uploadsPlaylistId)}&channelId=${chan.id}`
      );
      const spData = await spRes.json();

      if (!spRes.ok) {
        throw new Error(spData.error || "Erreur lors de l'audit sponsor.");
      }

      setCreatorAuditReports(spData.reports || []);
      // Reload updated local DB brands
      await loadBrandsFromDb();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la recherche du créateur");
    } finally {
      setLoading(false);
      setProgressText("");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === "creator") {
      handleCreatorSearch(query);
    } else {
      loadBrandsFromDb(query);
    }
  };

  // Export to CSV functionality
  const exportToCSV = () => {
    if (brands.length === 0) return;
    const headers = ["Marque", "Secteur", "Collaborations", "Createurs", "Vues Cumulees", "Derniere Detection", "Email", "Statut Commercial"];
    const rows = brands.map((b) => [
      `"${b.name}"`,
      `"${b.industry || 'N/A'}"`,
      b.collaborationsCount,
      b.creatorsCount,
      b.totalViews,
      `"${formatDate(b.lastDetected)}"`,
      `"${b.contactEmail || 'N/A'}"`,
      `"${b.commercialStatus || 'A contacter'}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `newiq_sponsors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered & Sorted Brands list
  const filteredBrands = brands
    .filter((b) => {
      const matchSearch = b.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (b.industry && b.industry.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (b.contactEmail && b.contactEmail.toLowerCase().includes(searchFilter.toLowerCase()));
      const matchIndustry = industryFilter === "all" || b.industry === industryFilter;
      return matchSearch && matchIndustry;
    })
    .sort((a, b) => {
      if (sortBy === "views") return b.totalViews - a.totalViews;
      if (sortBy === "recent") return new Date(b.lastDetected).getTime() - new Date(a.lastDetected).getTime();
      return b.collaborationsCount - a.collaborationsCount;
    });

  // Pagination slice
  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage) || 1;
  const paginatedBrands = filteredBrands.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const industriesList = Array.from(new Set(brands.map((b) => b.industry).filter(Boolean)));

  return (
    <div className="min-h-full bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="Sponsor Discovery" 
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Sponsor Discovery (Creator Intel)" }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-8">
          {/* Header & Modes Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Sponsor Discovery
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  Base Locale Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Recherchez par créateur, par marque ou explorez les partenariats détectés sur YouTube avec conservation des preuves et timecodes.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setSearchMode("creator")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  searchMode === "creator" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Par Créateur
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("brand")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  searchMode === "brand" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Par Marque
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("global")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  searchMode === "global" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Tableau Global
              </button>
            </div>
          </div>

          {/* Search Box */}
          {searchMode !== "global" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-3">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      searchMode === "creator" 
                        ? "Nom de chaîne, handle (@MrBeast), ID, ou URL YouTube..."
                        : "Nom de la marque (ex: NordVPN, BetterHelp, Step, iFIT...)"
                    }
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 pl-11 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md shadow-blue-600/30 shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyse</span>
                    </>
                  ) : (
                    <>
                      <span>{searchMode === "creator" ? "Scanner les Sponsors" : "Chercher la Marque"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {loading && progressText && (
                <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{progressText}</span>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-rose-200">Erreur d'analyse</p>
                <p className="mt-0.5 text-rose-300/90">{error}</p>
              </div>
            </div>
          )}

          {/* Mode A Results: Creator Sponsor Breakdown */}
          {searchMode === "creator" && creatorInfo && !loading && (
            <div className="space-y-6">
              {/* Creator Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-4">
                  <img
                    src={creatorInfo.thumbnail}
                    alt={creatorInfo.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-14 h-14 rounded-2xl border border-slate-700 object-cover"
                  />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      <span>{creatorInfo.title}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        {creatorAuditReports.length} vidéos analysées
                      </span>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {creatorInfo.customUrl && <span>{creatorInfo.customUrl}</span>}
                      <span>•</span>
                      <span>{formatCompactNumber(creatorInfo.subscriberCount)} abonnés</span>
                      <span>•</span>
                      <span>{formatCompactNumber(creatorInfo.viewCount)} vues totales</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/channel/${creatorInfo.id}`)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all"
                >
                  Voir Dashboard Complet
                </button>
              </div>

              {/* Videos and Detected Sponsors List */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Dernières Vidéos & Sponsors Associés</span>
                  <span className="text-xs text-slate-500 font-normal">
                    (Vérification descriptions, codes promos et SponsorBlock)
                  </span>
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {creatorAuditReports.map((report) => (
                    <div
                      key={report.videoId}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg space-y-4"
                    >
                      {/* Video Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={report.videoThumbnail}
                            alt={report.videoTitle}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="w-24 aspect-video rounded-lg object-cover shrink-0 border border-slate-800"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate hover:text-blue-400">
                              <a href={`https://www.youtube.com/watch?v=${report.videoId}`} target="_blank" rel="noopener noreferrer">
                                {report.videoTitle}
                              </a>
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              <span>{formatDate(report.publishedAt)}</span>
                              <span>•</span>
                              <span>{formatCompactNumber(report.viewCount)} vues</span>
                              {report.durationFormatted && <span>• ⏱ {report.durationFormatted}</span>}
                            </div>
                          </div>
                        </div>

                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto ${
                          report.sponsors.length > 0
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-800/60 text-slate-400 border border-slate-700/60"
                        }`}>
                          {report.sponsors.length > 0 ? `${report.sponsors.length} sponsor(s) détecté(s)` : "Aucun sponsor"}
                        </span>
                      </div>

                      {/* Sponsors Cards */}
                      {report.sponsors.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {report.sponsors.map((sp: any, sIdx: number) => (
                            <div
                              key={sIdx}
                              className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 flex flex-col justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                    <Building className="w-4 h-4 text-blue-400" />
                                    <span>{sp.sponsorName}</span>
                                  </span>

                                  {sp.timeCode && (
                                    <a
                                      href={`https://www.youtube.com/watch?v=${report.videoId}&t=${Math.floor(sp.startSeconds || 0)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold hover:bg-amber-500/20 transition-colors"
                                      title="Lancer le passage sponsorisé exact"
                                    >
                                      <Clock className="w-3 h-3" />
                                      <span>{sp.timeCode}</span>
                                    </a>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#162138] text-slate-600">
                                    Confiance: {sp.confidence === "high" ? "Élevée (Confirmé)" : "Moyenne (Probable)"}
                                  </span>
                                  {sp.category && (
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {sp.category}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-500 italic line-clamp-2 mt-1">
                                  Preuve : "{sp.contextSnippet}"
                                </p>
                              </div>

                              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                {sp.sponsorEmail ? (
                                  <a href={`mailto:${sp.sponsorEmail}`} className="font-mono text-blue-300 hover:underline text-[11px] flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-blue-400" />
                                    <span>{sp.sponsorEmail}</span>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-slate-500">Email marque non indexé</span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => router.push(`/discovery/brand/${encodeURIComponent(sp.sponsorName)}`)}
                                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <span>Fiche Sponsor</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-1">
                          Aucun segment sponsorisé formel n'a été repéré sur cet upload.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mode B & C: Global Sponsors Directory Table with Full Filters & Pagination */}
          {(searchMode === "global" || searchMode === "brand") && (
            <div className="space-y-6">
              {/* Controls & Filters Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  {/* Instant search */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Filtrer marque, email, secteur..."
                      value={searchFilter}
                      onChange={(e) => {
                        setSearchFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Industry filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={industryFilter}
                      onChange={(e) => {
                        setIndustryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Tous les secteurs</option>
                      {industriesList.map((ind: any) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort by */}
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="deals">Trier par Collaborations</option>
                    <option value="views">Trier par Vues Cumulées</option>
                    <option value="recent">Trier par Détection Récente</option>
                  </select>
                </div>

                {/* CSV Export Button */}
                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={brands.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Exporter les données au format CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Exporter CSV</span>
                </button>
              </div>

              {/* Data Table Required in Specification */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Marque</th>
                        <th className="py-3.5 px-4">Créateurs Associés</th>
                        <th className="py-3.5 px-4 text-center">Vidéos Détectées</th>
                        <th className="py-3.5 px-4 text-right">Vues Cumulées</th>
                        <th className="py-3.5 px-4">Contact & Email</th>
                        <th className="py-3.5 px-4 text-right">Dernière Détection</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedBrands.length > 0 ? (
                        paginatedBrands.map((brand) => (
                          <tr key={brand.id} className="hover:bg-slate-50 transition-colors">
                            {/* Brand Name & Industry */}
                            <td className="py-3.5 px-4">
                              <div 
                                className="cursor-pointer group flex items-center gap-2.5"
                                onClick={() => router.push(`/discovery/brand/${encodeURIComponent(brand.name)}`)}
                              >
                                <div className="p-2 rounded-xl bg-blue-600/15 border border-blue-500/25 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  <Building className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 text-sm group-hover:text-blue-400 transition-colors block">
                                    {brand.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">
                                    {brand.industry || "Sponsor Général"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Creators */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {brand.creators && brand.creators.length > 0 ? (
                                  brand.creators.map((c: any) => (
                                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#162137] text-slate-600 text-[11px] font-medium">
                                      {c.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-500 italic text-[11px]">Chaînes multiples</span>
                                )}
                              </div>
                            </td>

                            {/* Videos Count */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 font-bold text-xs border border-blue-500/20">
                                {brand.collaborationsCount}
                              </span>
                            </td>

                            {/* Views */}
                            <td className="py-3.5 px-4 font-bold text-slate-900 text-right font-mono">
                              {formatCompactNumber(brand.totalViews)}
                            </td>

                            {/* Contact Email */}
                            <td className="py-3.5 px-4">
                              {brand.contactEmail ? (
                                <a
                                  href={`mailto:${brand.contactEmail}`}
                                  className="font-mono text-blue-300 hover:underline flex items-center gap-1.5 text-[11px]"
                                >
                                  <Mail className="w-3 h-3 text-blue-400" />
                                  <span>{brand.contactEmail}</span>
                                </a>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">Via site officiel</span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-4 text-slate-500 text-right text-[11px]">
                              {formatDate(brand.lastDetected)}
                            </td>

                            {/* Action */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => router.push(`/discovery/brand/${encodeURIComponent(brand.name)}`)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-600 text-slate-600 hover:text-white transition-colors text-xs font-semibold"
                              >
                                <span>Voir fiche</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                            Aucune marque enregistrée. Lancez un scan de créateur (ex: @MrBeast) pour peupler la base de données locale.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredBrands.length > itemsPerPage && (
                  <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredBrands.length)} sur {filteredBrands.length} marques
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-semibold text-slate-900 px-2">Page {currentPage} / {totalPages}</span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
