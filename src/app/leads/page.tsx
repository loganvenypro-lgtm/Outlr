"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { SavedChannelLead } from "@/types/youtube";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  Users, 
  Mail, 
  Trash2, 
  ExternalLink, 
  Briefcase, 
  Eye, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send
} from "lucide-react";

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<SavedChannelLead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("newiq_saved_leads");
      if (stored) {
        setLeads(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveLeadsToStorage = (updated: SavedChannelLead[]) => {
    setLeads(updated);
    try {
      localStorage.setItem("newiq_saved_leads", JSON.stringify(updated));
    } catch {}
  };

  const removeLead = (id: string) => {
    const updated = leads.filter((l) => l.id !== id);
    saveLeadsToStorage(updated);
  };

  const updateStatus = (id: string, status: SavedChannelLead["status"]) => {
    const updated = leads.map((l) => (l.id === id ? { ...l, status } : l));
    saveLeadsToStorage(updated);
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) || 
      (l.customUrl && l.customUrl.toLowerCase().includes(search.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-[#080c14]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav 
          title="Mes Leads Sponsors" 
          breadcrumbs={[
            { label: "Dashboard", href: "/" },
            { label: "Mes Leads Sponsors" }
          ]}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Pipeline & CRM Sponsors
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Gérez vos chaînes YouTube cibles, suivez vos prises de contact et lancez vos campagnes de sponsoring.
              </p>
            </div>

            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 self-start sm:self-auto">
              {leads.length} chaîne(s) enregistrée(s)
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-[#0e1628] border border-[#1e2b46] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Rechercher par nom, handle ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#090f1d] border border-[#1c2944] rounded-xl px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Statut :</span>
              {["all", "identified", "contacted", "negotiating", "signed"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-[#090f1d] text-slate-400 hover:text-slate-200 border border-[#1c2944]"
                  }`}
                >
                  {st === "all" ? "Tous" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Leads Table */}
          {filteredLeads.length > 0 ? (
            <div className="bg-[#0e1628] border border-[#1e2b46] rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1c2944] bg-[#0a1120] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Chaîne</th>
                      <th className="py-3 px-4">Abonnés</th>
                      <th className="py-3 px-4">Vues Moyennes</th>
                      <th className="py-3 px-4">Contact Commercial</th>
                      <th className="py-3 px-4">Statut Pipeline</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#152037]">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#11192e] transition-colors">
                        <td className="py-3.5 px-4">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => router.push(`/channel/${lead.id}`)}
                          >
                            <img
                              src={lead.avatar}
                              alt={lead.title}
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors truncate block">
                                {lead.title}
                              </span>
                              {lead.customUrl && (
                                <span className="text-[11px] text-slate-400 block">
                                  {lead.customUrl.startsWith("@") ? lead.customUrl : `@${lead.customUrl}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-200">
                          {formatCompactNumber(lead.subscriberCount)}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-blue-400">
                          ~{formatCompactNumber(lead.avgViews)} / vid
                        </td>

                        <td className="py-3.5 px-4">
                          {lead.email ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`mailto:${lead.email}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:text-blue-300 font-mono text-[11px] transition-colors"
                              >
                                <Mail className="w-3 h-3" />
                                <span>{lead.email}</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Via DM / About</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={lead.status}
                            onChange={(e) => updateStatus(lead.id, e.target.value as any)}
                            className="bg-[#090f1d] border border-[#1e2c4a] rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 focus:outline-none focus:border-blue-500"
                          >
                            <option value="identified">Identifié</option>
                            <option value="contacted">Email envoyé</option>
                            <option value="negotiating">En négociation</option>
                            <option value="signed">Contrat signé 🎉</option>
                            <option value="rejected">Refusé</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/channel/${lead.id}`)}
                              className="p-1.5 rounded-lg bg-[#141e33] hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
                              title="Voir Analytics"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLead(lead.id)}
                              className="p-1.5 rounded-lg bg-[#141e33] hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
                              title="Retirer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#0e1628] border border-[#1e2b46] rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
                <Briefcase className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-white">Aucune chaîne dans vos leads sponsors</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Recherchez des chaînes YouTube depuis la page d'accueil, ouvrez leur dashboard analytique et cliquez sur le bouton <strong>"Enregistrer dans mes Leads"</strong> pour centraliser vos opportunités.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
                >
                  Trouver des créateurs
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
