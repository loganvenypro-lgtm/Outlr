"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  Building, 
  ArrowLeft, 
  Mail, 
  ExternalLink, 
  Clock, 
  Check, 
  Copy, 
  Briefcase, 
  Users, 
  Eye, 
  Star, 
  FileSpreadsheet, 
  Edit3, 
  Sparkles, 
  Save, 
  ShieldCheck,
  TrendingUp,
  Tag
} from "lucide-react";

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandNameParam = decodeURIComponent(params?.brandName as string || "");

  const [brandData, setBrandData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [commercialStatus, setCommercialStatus] = useState<string>("A contacter");
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    async function loadBrand() {
      if (!brandNameParam) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Search brand in database
        const res = await fetch(`/api/brands?q=${encodeURIComponent(brandNameParam)}`);
        const data = await res.json();

        if (!res.ok || !data.brands || data.brands.length === 0) {
          throw new Error(`Marque "${brandNameParam}" non répertoriée dans la base de données.`);
        }

        const brandSummary = data.brands[0];

        // 2. Fetch full detail by ID
        const detailRes = await fetch(`/api/brands?id=${brandSummary.id}`);
        const detailData = await detailRes.json();

        if (detailRes.ok && detailData.brand) {
          setBrandData(detailData);
          if (detailData.commercialNote) {
            setNoteContent(detailData.commercialNote.content || "");
            setCommercialStatus(detailData.commercialNote.commercialStatus || "A contacter");
            setIsFavorite(detailData.commercialNote.isFavorite || false);
          }
        }
      } catch (err: any) {
        setError(err.message || "Erreur de chargement de la marque");
      } finally {
        setLoading(false);
      }
    }

    loadBrand();
  }, [brandNameParam]);

  const handleSaveCommercialNote = async () => {
    if (!brandData?.brand?.id) return;
    setSavingNote(true);
    try {
      await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: brandData.brand.id,
          content: noteContent,
          commercialStatus,
          isFavorite,
        }),
      });
    } catch {}
    finally {
      setSavingNote(false);
    }
  };

  const exportBrandCollabsToCSV = () => {
    if (!brandData || !brandData.collaborations) return;
    const headers = ["Chaine", "Titre Video", "Vues", "Date", "Preuve", "Lien Video"];
    const rows = brandData.collaborations.map((c: any) => [
      `"${c.channel?.name || 'N/A'}"`,
      `"${c.video?.title || 'N/A'}"`,
      c.video?.viewCount || 0,
      `"${formatDate(c.video?.publishedAt)}"`,
      `"${c.evidence || 'N/A'}"`,
      `"${c.video?.videoUrl || 'N/A'}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${brandData.brand.name}_collaborations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="Fiche Sponsor" 
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Sponsor Discovery", href: "/discovery" },
            { label: brandNameParam }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          <button
            type="button"
            onClick={() => router.push("/discovery")}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à Sponsor Discovery</span>
          </button>

          {loading && (
            <div className="py-20 text-center text-slate-500 text-xs">
              Chargement des collaborations et de la fiche marque...
            </div>
          )}

          {error && !loading && (
            <div className="bg-white border border-rose-900/50 rounded-2xl p-8 text-center space-y-3">
              <h3 className="text-base font-bold text-slate-900">Marque introuvable</h3>
              <p className="text-xs text-slate-500">{error}</p>
            </div>
          )}

          {!loading && !error && brandData && (
            <div className="space-y-6">
              {/* Brand Header */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl">
                      <Building className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-slate-900">{brandData.brand.name}</h1>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFavorite(!isFavorite);
                            setTimeout(handleSaveCommercialNote, 50);
                          }}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isFavorite 
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-400" 
                              : "bg-white border-slate-200 text-slate-400 hover:text-white"
                          }`}
                          title="Favori"
                        >
                          <Star className={`w-4 h-4 ${isFavorite ? "fill-amber-400" : ""}`} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                        <span className="font-semibold text-slate-600">{brandData.brand.industry || "Sponsor Général"}</span>
                        <span>•</span>
                        <span>{brandData.metrics.totalCollaborations} collaborations indexées</span>
                        <span>•</span>
                        <span>{formatCompactNumber(brandData.metrics.totalViews)} vues cumulées</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Export */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={exportBrandCollabsToCSV}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Exporter Collaborations</span>
                    </button>

                    {brandData.brand.website && (
                      <a
                        href={brandData.brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
                      >
                        <span>Site officiel</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Verified Contact Card */}
                {brandData.brand.contactEmail && (
                  <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                          Contact Décisionnaire Partenariats
                        </span>
                        <a href={`mailto:${brandData.brand.contactEmail}`} className="font-mono text-xs text-blue-300 hover:underline">
                          {brandData.brand.contactEmail}
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(brandData.brand.contactEmail);
                        setCopiedEmail(true);
                        setTimeout(() => setCopiedEmail(false), 2000);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-900"
                      title="Copier l'email"
                    >
                      {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Commercial CRM Note & Pipeline Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-400" />
                    <span>Gestion Commerciale & Notes d'Agence</span>
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Statut Pipeline :</span>
                    <select
                      value={commercialStatus}
                      onChange={(e) => setCommercialStatus(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="A contacter">À contacter</option>
                      <option value="Contacté">Contacté</option>
                      <option value="En discussion">En discussion</option>
                      <option value="Client">Client / Signé 🎉</option>
                      <option value="Non pertinent">Non pertinent</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Notes internes pour l'équipe (ex: budget demandé, personne contactée, conditions de sponsoring)..."
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveCommercialNote}
                      disabled={savingNote}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingNote ? "Enregistrement..." : "Enregistrer la note"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Collaborations History Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden space-y-4 p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-base">
                    Historique des Collaborations avec les Créateurs ({brandData.collaborations.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Preuves sourcées et liens vérifiés
                  </span>
                </div>

                <div className="space-y-3">
                  {brandData.collaborations.map((collab: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {collab.video?.thumbnailUrl && (
                          <img
                            src={collab.video.thumbnailUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="w-20 aspect-video rounded-lg object-cover shrink-0 border border-slate-800"
                          />
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block truncate hover:text-blue-400">
                            {collab.video?.title || "Vidéo Sponsorisée"}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                            <span className="text-blue-400 font-semibold">{collab.channel?.name || "Créateur"}</span>
                            <span>•</span>
                            <span>{formatDate(collab.video?.publishedAt)}</span>
                            <span>•</span>
                            <span>{formatCompactNumber(collab.video?.viewCount)} vues</span>
                            {collab.timeCode && (
                              <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                ⏱ {collab.timeCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 italic line-clamp-1 mt-1">
                            Preuve : {collab.evidence}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#162138] text-emerald-400 border border-emerald-500/20">
                          {collab.status === "sponsor_confirmed" ? "Sponsor Confirmé" : "Lien Affilié"}
                        </span>
                        {collab.video?.videoUrl && (
                          <a
                            href={collab.video.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white hover:bg-blue-600 text-slate-600 hover:text-white transition-colors"
                            title="Ouvrir sur YouTube"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
