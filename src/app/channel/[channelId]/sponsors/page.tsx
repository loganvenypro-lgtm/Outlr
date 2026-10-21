"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { ChannelDetail, VideoSponsorReport } from "@/types/youtube";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  ArrowLeft, 
  Briefcase, 
  Mail, 
  ExternalLink, 
  Clock, 
  Tag, 
  Play, 
  Check, 
  Copy, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Send,
  Building,
  Filter,
  Search,
  CheckCircle2
} from "lucide-react";

interface BrandSummary {
  brandName: string;
  placementsCount: number;
  contactEmail?: string;
  category?: string;
  websiteUrl?: string;
}

export default function ChannelSponsorsPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params?.channelId as string;

  const [channel, setChannel] = useState<ChannelDetail | null>(null);
  const [reports, setReports] = useState<VideoSponsorReport[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [channelEmails, setChannelEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "brands">("videos");
  const [filterBrand, setFilterBrand] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!channelId) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch channel details
        const chRes = await fetch(`/api/youtube/channel?id=${encodeURIComponent(channelId)}`);
        const chData = await chRes.json();
        if (!chRes.ok) throw new Error(chData.error || "Impossible de charger la chaîne");
        setChannel(chData.channel);

        // 2. Fetch deep sponsor audit if uploads playlist is present
        if (chData.channel.uploadsPlaylistId) {
          const spRes = await fetch(`/api/youtube/sponsors?playlistId=${encodeURIComponent(chData.channel.uploadsPlaylistId)}`);
          const spData = await spRes.json();

          if (spRes.ok) {
            setReports(spData.reports || []);
            setBrands(spData.uniqueBrands || []);
            setChannelEmails(spData.channelEmailsFound || []);
          }
        }
      } catch (err: any) {
        setError(err.message || "Erreur lors de l'analyse des sponsors");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [channelId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredReports = reports.filter((r) => {
    if (!filterBrand.trim()) return true;
    const term = filterBrand.toLowerCase();
    const hasBrand = r.sponsors.some((s) => s.sponsorName.toLowerCase().includes(term) || s.category?.toLowerCase().includes(term));
    const hasTitle = r.videoTitle.toLowerCase().includes(term);
    return hasBrand || hasTitle;
  });

  return (
    <div className="min-h-full bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="Historique des Sponsors"
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: channel ? channel.title : "Chaîne", href: `/channel/${channelId}` },
            { label: "Sponsors & Placements" }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Back & Controls Bar */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push(`/channel/${channelId}`)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à l'analyse</span>
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-24 text-center space-y-4 bg-white border border-slate-200 rounded-2xl p-8">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Audit Intelligent des Sponsors en cours...</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Analyse des descriptions vidéos, extraction des segments sponsorisés via SponsorBlock, détection des emails des marques et identification des timecodes exacts.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-white border border-rose-900/50 rounded-2xl p-8 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Erreur lors de l'audit</h3>
                <p className="text-xs text-slate-500">{error}</p>
              </div>
            </div>
          )}

          {/* Loaded Content */}
          {!loading && !error && channel && (
            <div className="space-y-6">
              {/* Channel Hero Header with verified contact emails */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={channel.avatar}
                      alt={channel.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-16 h-16 rounded-2xl border border-slate-700 object-cover shadow-lg"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900">{channel.title}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
                          Audit Sponsors
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Analyse sur les <strong className="text-slate-700">{reports.length} derniers uploads</strong> • {brands.length} marques identifiées
                      </p>
                    </div>
                  </div>

                  {/* Emails found (Channel Creator + Inquiries) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-1.5 min-w-[280px]">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                      <span>Contact Business Détecté</span>
                    </span>

                    {channelEmails.length > 0 || (channel.detectedEmails && channel.detectedEmails.length > 0) ? (
                      <div className="space-y-1">
                        {Array.from(new Set([...channelEmails, ...(channel.detectedEmails || [])])).map((em) => (
                          <div key={em} className="flex items-center justify-between gap-2 text-xs">
                            <a href={`mailto:${em}`} className="font-mono text-blue-300 hover:underline truncate">
                              {em}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(em, em)}
                              className="p-1 hover:text-slate-900 text-slate-500"
                              title="Copier l'email"
                            >
                              {copiedText === em ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Aucun email direct dans les descriptions</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs (Par Vidéo vs Par Marque) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 self-start">
                  <button
                    type="button"
                    onClick={() => setActiveTab("videos")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "videos" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Par Vidéo ({reports.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("brands")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === "brands" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Annuaire des Marques ({brands.length})
                  </button>
                </div>

                {/* Filter search input */}
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Filtrer une marque (ex: NordVPN, Step...)"
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 pl-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* View 1: List by Videos with Timecodes */}
              {activeTab === "videos" && (
                <div className="space-y-4">
                  {filteredReports.map((report) => {
                    const videoUrl = `https://www.youtube.com/watch?v=${report.videoId}`;

                    return (
                      <div
                        key={report.videoId}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition-colors"
                      >
                        {/* Video Info Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={report.videoThumbnail}
                              alt={report.videoTitle}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-20 aspect-video rounded-lg object-cover shrink-0 border border-slate-800"
                            />
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-sm truncate hover:text-blue-400 transition-colors">
                                <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                                  {report.videoTitle}
                                </a>
                              </h3>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                                <span>{formatDate(report.publishedAt)}</span>
                                <span>•</span>
                                <span>{formatCompactNumber(report.viewCount)} vues</span>
                                {report.durationFormatted && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">⏱ {report.durationFormatted}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              report.sponsors.length > 0
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-800/60 text-slate-400 border border-slate-700/60"
                            }`}>
                              {report.sponsors.length > 0 ? `${report.sponsors.length} Sponsor(s)` : "Aucun sponsor détecté"}
                            </span>
                            <a
                              href={videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-white hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
                              title="Ouvrir la vidéo sur YouTube"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {/* Sponsors list for this video */}
                        {report.sponsors.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {report.sponsors.map((sp, idx) => (
                              <div
                                key={idx}
                                className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                                      <Building className="w-4 h-4 text-blue-400" />
                                      <span>{sp.sponsorName}</span>
                                    </span>

                                    {/* Timecode badge */}
                                    {sp.timeCode && (
                                      <a
                                        href={`${videoUrl}&t=${Math.floor(sp.startSeconds || 0)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[11px] font-mono font-medium transition-colors"
                                        title="Voir le passage sponsorisé sur YouTube"
                                      >
                                        <Clock className="w-3 h-3" />
                                        <span>{sp.timeCode}</span>
                                      </a>
                                    )}
                                  </div>

                                  {sp.category && (
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mt-0.5">
                                      {sp.category}
                                    </span>
                                  )}

                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 italic">
                                    "{sp.contextSnippet}"
                                  </p>
                                </div>

                                {/* Contact info of the brand */}
                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                                  {sp.sponsorEmail ? (
                                    <div className="flex items-center gap-1.5">
                                      <Mail className="w-3.5 h-3.5 text-blue-400" />
                                      <a href={`mailto:${sp.sponsorEmail}`} className="font-mono text-blue-300 hover:underline text-[11px]">
                                        {sp.sponsorEmail}
                                      </a>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-500">Email marque non indexé</span>
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
                          <p className="text-xs text-slate-500 italic py-1">
                            Vidéo sans segment sponsorisé ou sans mention contractuelle dans la description.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View 2: Brand Directory Summary */}
              {activeTab === "brands" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brands
                    .filter((b) => b.brandName.toLowerCase().includes(filterBrand.toLowerCase()))
                    .map((brand, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                              <Building className="w-4 h-4 text-blue-400" />
                              <span>{brand.brandName}</span>
                            </h4>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                              {brand.placementsCount} collab(s)
                            </span>
                          </div>

                          {brand.category && (
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mt-1">
                              {brand.category}
                            </span>
                          )}
                        </div>

                        {/* Contact details */}
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Contact Sponsoring Détecté
                          </span>

                          {brand.contactEmail ? (
                            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                              <a href={`mailto:${brand.contactEmail}`} className="font-mono text-xs text-blue-300 hover:underline truncate">
                                {brand.contactEmail}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(brand.contactEmail!, brand.brandName)}
                                className="p-1 hover:text-slate-900 text-slate-500 ml-2"
                                title="Copier"
                              >
                                {copiedText === brand.brandName ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 italic">
                              Via leur portail média / partenariats
                            </div>
                          )}

                          {brand.websiteUrl && (
                            <a
                              href={brand.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1.5 pt-1"
                            >
                              <span>Visiter le site de la marque</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
