"use client";

import { useState } from "react";
import { ChannelDetail } from "@/types/youtube";
import { formatCompactNumber, formatFullNumber } from "@/lib/utils";
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  Sparkles, 
  Briefcase, 
  DollarSign, 
  Bookmark, 
  BookmarkCheck,
  ExternalLink,
  ChevronDown
} from "lucide-react";

interface SponsorHubProps {
  channel: ChannelDetail;
  avgRecentViews?: number;
}

export function SponsorHub({ channel, avgRecentViews }: SponsorHubProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<"standard" | "product" | "cpm">("standard");
  const [customBrand, setCustomBrand] = useState("");

  const email = channel.detectedEmails && channel.detectedEmails.length > 0 
    ? channel.detectedEmails[0] 
    : null;

  // Estimation indicative de CPM Sponsor basé sur les vues récentes
  const estimatedViews = avgRecentViews || (channel.videoCount > 0 ? Math.round(channel.viewCount / channel.videoCount) : 0);
  // Fourchette CPM usuelle YouTube 15$ - 30$ pour du sponsoring intégré
  const lowSponsorEst = Math.round((estimatedViews / 1000) * 15);
  const highSponsorEst = Math.round((estimatedViews / 1000) * 32);

  // Check if channel is already saved in localStorage
  useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("newiq_saved_leads") || "[]");
        setIsSaved(saved.some((item: any) => item.id === channel.id));
      } catch {}
    }
  });

  const toggleSaveLead = () => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem("newiq_saved_leads") || "[]");
      if (isSaved) {
        const updated = saved.filter((item: any) => item.id !== channel.id);
        localStorage.setItem("newiq_saved_leads", JSON.stringify(updated));
        setIsSaved(false);
      } else {
        const newLead = {
          id: channel.id,
          title: channel.title,
          customUrl: channel.customUrl,
          avatar: channel.avatar,
          subscriberCount: channel.subscriberCount,
          avgViews: estimatedViews,
          email: email || undefined,
          status: "identified",
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem("newiq_saved_leads", JSON.stringify([newLead, ...saved]));
        setIsSaved(true);
      }
    } catch {}
  };

  const brandName = customBrand.trim() || "[Nom de votre Marque/Agence]";

  // Modèles d'emails de démarchage prêts à l'emploi
  const templates = {
    standard: {
      title: "Partenariat Sponsor Dédié",
      subject: `Partenariat Sponsor : ${channel.title} x ${brandName}`,
      body: `Bonjour l'équipe de ${channel.title},

Je vous contacte au nom de ${brandName}. Nous suivons vos publications avec beaucoup d'intérêt, notamment vos vidéos récentes qui rassemblent en moyenne plus de ${formatCompactNumber(estimatedViews)} vues avec une forte communauté.

Nous serions ravis de collaborer avec vous sur une intégration sponsorisée (segment de 60-90s) pour présenter notre solution à votre audience.

Seriez-vous disponibles pour échanger cette semaine sur vos disponibilités et vos tarifs de sponsoring actuels ?

Bien cordialement,
L'équipe ${brandName}`
    },
    product: {
      title: "Placement de Produit & Review",
      subject: `Proposition de collaboration produit & test : ${channel.title} x ${brandName}`,
      body: `Bonjour ${channel.title},

Nous adorons la qualité de vos contenus et votre ton très authentique. 

Chez ${brandName}, nous lançons actuellement une nouvelle gamme de produits qui correspond parfaitement aux centres d'intérêt de vos abonnés (${formatCompactNumber(channel.subscriberCount)} passionnés).

Nous aimerions vous expédier notre produit gratuitement pour un test exclusif, accompagné d'un budget dédié pour une mention sponsorisée dans l'un de vos prochains uploads.

Si l'opportunité vous intéresse, à quelle adresse pouvons-nous vous envoyer notre kit presse et média ?

Excellente journée,
${brandName}`
    },
    cpm: {
      title: "Campagne à la Performance / CPM",
      subject: `Offre de sponsoring rémunéré : ${channel.title}`,
      body: `Bonjour,

Nous préparons notre campagne média pour le prochain trimestre chez ${brandName} et nous avons sélectionné la chaîne ${channel.title} comme partenaire prioritaire.

Compte tenu de votre régularité et de votre volume d'engagement, nous pouvons vous proposer un forfait fixe garanti compétitif ainsi qu'un code promo exclusif pour votre communauté.

Pouvez-vous nous transmettre votre media kit ou nous mettre en relation avec votre manager commercial ?

Merci d'avance pour votre retour,
L'équipe commerciale de ${brandName}`
    }
  };

  const currentTemplate = templates[selectedTemplate];

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(`${currentTemplate.subject}\n\n${currentTemplate.body}`);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleOpenMailClient = () => {
    const to = email || "";
    const subject = encodeURIComponent(currentTemplate.subject);
    const body = encodeURIComponent(currentTemplate.body);
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="bg-white border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Sponsor & Agency Outreach Hub</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Pro Lead
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Détectez l'email commercial, estimez la valeur de sponsoring et générez des pitches personnalisés.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href={`/channel/${channel.id}/sponsors`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Historique Sponsors & Timecodes</span>
          </a>

          {/* Save Lead Button */}
          <button
            type="button"
            onClick={toggleSaveLead}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              isSaved
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                <span>Chaîne enregistrée (Mes Leads)</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Enregistrer dans mes Leads</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: Email & Value Estimation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-400" /> Email de Contact Détecté
            </span>
            {email && (
              <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Extrait de la bio
              </span>
            )}
          </div>

          <div>
            {email ? (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-mono text-sm text-blue-300 font-semibold truncate select-all">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(email);
                    setCopiedEmail(true);
                    setTimeout(() => setCopiedEmail(false), 2000);
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors ml-2"
                  title="Copier l'email"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                <span>Non public dans la bio (disponible via CAPTCHA YouTube)</span>
                <a
                  href={`https://www.youtube.com/${channel.customUrl || "channel/" + channel.id}/about`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Voir About</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            {email ? "Email professionnel directement joignable pour vos propositions." : "Vous pouvez aussi utiliser le modèle ci-dessous via DM ou l'onglet À Propos."}
          </p>
        </div>

        {/* Estimation Sponsoring Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Estimation Sponsor / Intégration
            </span>
            <span className="text-[10px] text-slate-500">CPM Benchmark 15-32$</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {lowSponsorEst > 0 ? `${formatCompactNumber(lowSponsorEst)}€ - ${formatCompactNumber(highSponsorEst)}€` : "Sur devis"}
            </span>
            <span className="text-xs text-slate-500">/ vidéo</span>
          </div>

          <p className="text-[11px] text-slate-500">
            Calculé sur la base de <strong className="text-slate-600">{formatCompactNumber(estimatedViews)} vues moyennes</strong> par upload récent.
          </p>
        </div>
      </div>

      {/* Outreach Templates Generator */}
      <div className="space-y-4 pt-2 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Générateur de Mail de Démarchage Prêt à l'Emploi</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Sélectionnez un modèle et personnalisez le nom de votre marque.
            </p>
          </div>

          {/* Template Switcher */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedTemplate("standard")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTemplate === "standard" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Intégration
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate("product")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTemplate === "product" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Test Produit
            </button>
            <button
              type="button"
              onClick={() => setSelectedTemplate("cpm")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTemplate === "cpm" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Performance
            </button>
          </div>
        </div>

        {/* Brand name input */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium shrink-0">Votre Agence / Marque :</span>
          <input
            type="text"
            placeholder="Ex: NordVPN, Airalo, MonEntreprise..."
            value={customBrand}
            onChange={(e) => setCustomBrand(e.target.value)}
            className="w-full sm:w-72 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Preview of the pitch */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-600 pb-2 border-b border-slate-200">
            <span className="text-slate-500">Objet :</span> {currentTemplate.subject}
          </div>
          <div className="text-xs text-slate-600 font-mono whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
            {currentTemplate.body}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyPitch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
          >
            {copiedPitch ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Texte copié !</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier le mail complet</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenMailClient}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/30"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Envoyer dans mon logiciel de messagerie</span>
          </button>
        </div>
      </div>
    </div>
  );
}
