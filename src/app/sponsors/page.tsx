"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { ChannelSearchResult, VideoSponsorReport } from "@/types/youtube";
import { KNOWN_SPONSORS } from "@/lib/sponsorIntelligence";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  Search, 
  Briefcase, 
  Building, 
  Mail, 
  ExternalLink, 
  Clock, 
  Sparkles, 
  Check, 
  Copy, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Tag,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Bookmark,
  Send
} from "lucide-react";

interface BrandSummary {
  brandName: string;
  placementsCount: number;
  contactEmail?: string;
  category?: string;
  websiteUrl?: string;
  contactRole?: string;
}

export default function GlobalSponsorHunterPage() {
  const router = useRouter();

  // Search input state
  const [channelQuery, setChannelQuery] = useState("@MrBeast");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzingStep, setAnalyzingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [selectedChannel, setSelectedChannel] = useState<any | null>(null);
  const [reports, setReports] = useState<VideoSponsorReport[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [channelEmails, setChannelEmails] = useState<string[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [filterBrandKeyword, setFilterBrandKeyword] = useState("");
  const [viewTab, setViewTab] = useState<"brands" | "videos" | "database">("brands");

  // Initial auto-search on mount
  useEffect(() => {
    runAudit("@MrBeast");
  }, []);

  const runAudit = async (target: string) => {
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setProgress(15);
    setAnalyzingStep("Recherche de la chaîne YouTube...");

    try {
      // 1. Resolve channel ID
      const sRes = await fetch(`/api/youtube/search?q=${encodeURIComponent(target.trim())}`);
      const sData = await sRes.json();
      if (!sRes.ok || !sData.channels || sData.channels.length === 0) {
        throw new Error("Chaîne introuvable. Vérifiez l'identifiant ou le lien.");
      }

      const chan = sData.channels[0];
      setSelectedChannel(chan);
      setProgress(40);
      setAnalyzingStep(`Récupération de la chaîne ${chan.title}...`);

      // 2. Fetch full channel details (uploads playlist)
      const chRes = await fetch(`/api/youtube/channel?id=${chan.id}`);
      const chData = await chRes.json();
      if (!chRes.ok || !chData.channel) {
        throw new Error("Impossible de charger les métadonnées de la chaîne.");
      }

      setProgress(65);
      setAnalyzingStep("Analyse approfondie des sponsors (SponsorBlock + Descriptions)...");

      // 3. Run Sponsor Audit API
      const spRes = await fetch(`/api/youtube/sponsors?playlistId=${encodeURIComponent(chData.channel.uploadsPlaylistId)}`);
      const spData = await spRes.json();

      setProgress(90);
      setAnalyzingStep("Finalisation de l'annuaire des marques et extraction des emails...");

      if (spRes.ok) {
        setReports(spData.reports || []);
        setBrands(spData.uniqueBrands || []);
        setChannelEmails(spData.channelEmailsFound || []);
      }
      setProgress(100);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'audit sponsor");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAudit(channelQuery);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredBrands = brands.filter((b) =>
    b.brandName.toLowerCase().includes(filterBrandKeyword.toLowerCase()) ||
    (b.category && b.category.toLowerCase().includes(filterBrandKeyword.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="Sponsor Hunter"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Sponsor Hunter (MeetSponsors)" }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Hero Header MeetSponsors style */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MeetSponsors Engine • Intelligence Marques & Démarchage</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Trouvez qui finance les créateurs et <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">contactez les marques</span>
            </h1>
            <p className="text-slate-500 text-xs md:text-sm leading-relaxed">
              Analysez n'importe quelle chaîne YouTube : découvrez les marques qui sponsorisent ses vidéos, les minutes exactes de diffusion (timecodes), les codes promos et les emails des décideurs marketing.
            </p>

            {/* Prominent Search Bar */}
            <form onSubmit={handleFormSubmit} className="pt-4">
              <div className="relative flex items-center bg-white border-2 border-slate-200 focus-within:border-blue-500 rounded-2xl p-2 shadow-2xl transition-all">
                <Search className="w-6 h-6 text-slate-500 ml-3 mr-2 shrink-0" />
                <input
                  type="text"
                  value={channelQuery}
                  onChange={(e) => setChannelQuery(e.target.value)}
                  placeholder="Entrez une chaîne (ex: @MrBeast, Veritasium, Fireship, MKBHD...)"
                  className="w-full bg-transparent text-slate-900 text-sm md:text-base placeholder-slate-400 focus:outline-none px-2"
                />
                <button
                  type="submit"
                  disabled={loading || !channelQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-blue-600/30 text-xs md:text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scan en cours</span>
                    </>
                  ) : (
                    <>
                      <span>Auditer les Sponsors</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 mt-2.5">
                <span className="text-slate-500">Exemples rapides :</span>
                {["@MrBeast", "Veritasium", "MKBHD", "Fireship", "Squeezie"].map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => {
                      setChannelQuery(tag);
                      runAudit(tag);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#141d33] hover:bg-slate-50 hover:text-blue-400 text-slate-600 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Loading Progress Bar */}
          {loading && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-900 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span>{analyzingStep}</span>
                </span>
                <span className="text-blue-400 font-mono">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 max-w-2xl mx-auto flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-rose-200">Erreur lors du scan</p>
                <p className="mt-0.5 text-rose-300/90">{error}</p>
              </div>
            </div>
          )}

          {/* Results Workspace */}
          {!loading && !error && selectedChannel && (
            <div className="space-y-6">
              {/* Channel Profile Banner */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedChannel.thumbnail}
                      alt={selectedChannel.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-16 h-16 rounded-2xl border border-slate-700 object-cover shadow-lg shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-slate-900">{selectedChannel.title}</h2>
                        {selectedChannel.customUrl && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            {selectedChannel.customUrl.startsWith("@") ? selectedChannel.customUrl : `@${selectedChannel.customUrl}`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{formatCompactNumber(selectedChannel.subscriberCount)} abonnés</span>
                        <span>•</span>
                        <span>{formatCompactNumber(selectedChannel.viewCount)} vues totales</span>
                        <span>•</span>
                        <span>{selectedChannel.videoCount} uploads</span>
                      </div>
                    </div>
                  </div>

                  {/* Creator Inquiries Email */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-1 min-w-[280px]">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>Email Business Créateur</span>
                    </span>
                    {channelEmails.length > 0 ? (
                      <div className="flex items-center justify-between gap-2">
                        <a href={`mailto:${channelEmails[0]}`} className="font-mono text-xs text-blue-300 hover:underline truncate">
                          {channelEmails[0]}
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(channelEmails[0], "creator-email")}
                          className="p-1 text-slate-500 hover:text-slate-900"
                          title="Copier"
                        >
                          {copiedText === "creator-email" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Extrait via demande pro YouTube</span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs (MeetSponsors 3-pillar layout) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 self-start">
                  <button
                    type="button"
                    onClick={() => setViewTab("brands")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      viewTab === "brands" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Marques Détectées ({brands.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab("videos")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      viewTab === "videos" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Vidéos & Séquences ({reports.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab("database")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      viewTab === "database" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Base Marques & Décideurs ({Object.keys(KNOWN_SPONSORS).length})
                  </button>
                </div>

                {/* Filter */}
                {viewTab !== "database" && (
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Filtrer une marque..."
                      value={filterBrandKeyword}
                      onChange={(e) => setFilterBrandKeyword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                )}
              </div>

              {/* Tab 1: Brands Directory for this Creator */}
              {viewTab === "brands" && (
                <div className="space-y-4">
                  {filteredBrands.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBrands.map((b, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 truncate">
                                <Building className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="truncate">{b.brandName}</span>
                              </h3>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 shrink-0">
                                {b.placementsCount} deal(s)
                              </span>
                            </div>

                            {b.category && (
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mt-1 font-medium">
                                {b.category}
                              </span>
                            )}
                          </div>

                          {/* Contact Email Section */}
                          <div className="pt-3 border-t border-slate-200 space-y-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                              Contact Partenariat / Sponsoring
                            </span>

                            {b.contactEmail ? (
                              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                                <a 
                                  href={`mailto:${b.contactEmail}`}
                                  className="font-mono text-xs text-blue-300 hover:underline truncate"
                                >
                                  {b.contactEmail}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(b.contactEmail!, b.brandName)}
                                  className="p-1 hover:text-slate-900 text-slate-500 ml-2"
                                  title="Copier"
                                >
                                  {copiedText === b.brandName ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                                Contact via leur portail relations créateurs
                              </div>
                            )}

                            {b.websiteUrl && (
                              <a
                                href={b.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:underline flex items-center gap-1.5 pt-0.5"
                              >
                                <span>Visiter le site web de la marque</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
                      Aucune marque trouvée avec ce filtre.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Videos with exact sequence timecodes */}
              {viewTab === "videos" && (
                <div className="space-y-4">
                  {reports.map((rep) => {
                    const videoUrl = `https://www.youtube.com/watch?v=${rep.videoId}`;
                    return (
                      <div
                        key={rep.videoId}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={rep.videoThumbnail}
                              alt={rep.videoTitle}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-20 aspect-video rounded-lg object-cover shrink-0 border border-slate-800"
                            />
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-sm truncate hover:text-blue-400 transition-colors">
                                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                                  {rep.videoTitle}
                                </a>
                              </h3>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                                <span>{formatDate(rep.publishedAt)}</span>
                                <span>•</span>
                                <span>{formatCompactNumber(rep.viewCount)} vues</span>
                                {rep.durationFormatted && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">⏱ {rep.durationFormatted}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors self-start sm:self-auto"
                          >
                            <span>Regarder</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Sponsors with sequence minute */}
                        {rep.sponsors.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {rep.sponsors.map((sp, idx) => (
                              <div
                                key={idx}
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
                                        href={`${videoUrl}&t=${Math.floor(sp.startSeconds || 0)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-mono font-bold transition-colors"
                                        title="Lancer le passage sponsorisé exact"
                                      >
                                        <Clock className="w-3 h-3" />
                                        <span>{sp.timeCode}</span>
                                      </a>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-slate-500 line-clamp-2 italic">
                                    "{sp.contextSnippet}"
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                  {sp.sponsorEmail ? (
                                    <div className="flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                                      <a href={`mailto:${sp.sponsorEmail}`} className="font-mono text-blue-300 hover:underline text-[11px]">
                                        {sp.sponsorEmail}
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-500">Contact via site web</span>
                                  )}

                                  {sp.sponsorUrl && (
                                    <a
                                      href={sp.sponsorUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-[11px]"
                                    >
                                      <span>Lien sponsorisé</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic py-1">
                            Aucune séquence de sponsoring publicitaire répertoriée sur cet upload.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: Global MeetSponsors Database */}
              {viewTab === "database" && (
                <div className="space-y-4">
                  <div className="bg-white border border-blue-500/30 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span>Répertoire Vérifié des Marques Sponsors YouTube</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Base de données des plus grands acheteurs média sur YouTube avec contact et poste du responsable.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(KNOWN_SPONSORS).map(([domain, data], idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-slate-900 text-base">{data.name}</h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600">
                              Actif
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">{data.category}</span>
                          {data.contactRole && (
                            <span className="text-[11px] text-blue-400 block mt-1">
                              Poste : {data.contactRole}
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                          {data.email && (
                            <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                              <a href={`mailto:${data.email}`} className="font-mono text-blue-300 text-[11px] truncate">
                                {data.email}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(data.email!, data.name)}
                                className="p-1 text-slate-500 hover:text-slate-900"
                                title="Copier"
                              >
                                {copiedText === data.name ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          <a
                            href={data.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span>Site officiel</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
