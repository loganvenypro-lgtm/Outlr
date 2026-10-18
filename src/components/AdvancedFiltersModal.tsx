"use client";

import React, { useState, useEffect } from "react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils";

export interface AdvancedFiltersState {
  minViews: number;
  maxViews: number; // 0 = unlimited (100M+)
  period: "all" | "today" | "7d" | "21d" | "30d" | "90d" | "1y";
  minSubs: number;
  maxSubs: number; // 0 = unlimited (50M+)
  minOutlier: number;
  maxOutlier: number; // 0 = unlimited (100x+)
  minDurationMinutes: number;
  maxDurationMinutes: number; // 0 = unlimited (3h+)
  minUploadCount: number;
  maxUploadCount: number; // 0 = unlimited (10K+)
  minChannelAgeDays: number;
  maxChannelAgeDays: number; // 0 = unlimited (15y+)
}

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFiltersState;
  onApply: (filters: AdvancedFiltersState) => void;
  onReset: () => void;
}

export function AdvancedFiltersModal({
  isOpen,
  onClose,
  filters: initialFilters,
  onApply,
  onReset,
}: AdvancedFiltersModalProps) {
  const [draft, setDraft] = useState<AdvancedFiltersState>(initialFilters);

  useEffect(() => {
    setDraft(initialFilters);
  }, [initialFilters, isOpen]);

  if (!isOpen) return null;

  // Count active applied filters
  const countActive = () => {
    let count = 0;
    if (draft.minViews > 0 || draft.maxViews > 0) count++;
    if (draft.period !== "all") count++;
    if (draft.minSubs > 0 || draft.maxSubs > 0) count++;
    if (draft.minOutlier > 0 || draft.maxOutlier > 0) count++;
    if (draft.minDurationMinutes > 0 || draft.maxDurationMinutes > 0) count++;
    if (draft.minUploadCount > 0 || draft.maxUploadCount > 0) count++;
    if (draft.minChannelAgeDays > 0 || draft.maxChannelAgeDays > 0) count++;
    return count;
  };

  const handleReset = () => {
    const empty: AdvancedFiltersState = {
      minViews: 0,
      maxViews: 0,
      period: "all",
      minSubs: 0,
      maxSubs: 0,
      minOutlier: 0,
      maxOutlier: 0,
      minDurationMinutes: 0,
      maxDurationMinutes: 0,
      minUploadCount: 0,
      maxUploadCount: 0,
      minChannelAgeDays: 0,
      maxChannelAgeDays: 0,
    };
    setDraft(empty);
    onReset();
    onClose();
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const periodLabels: Record<string, string> = {
    all: "All time",
    today: "Today",
    "7d": "7 days",
    "21d": "3 weeks",
    "30d": "1 month",
    "90d": "3 months",
    "1y": "1 year",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Filtres Avancés
              </h2>
              <p className="text-xs text-slate-500">
                Ajustez précisément la taille de chaîne, les ratios de vues et l'âge de création.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors border border-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Grid */}
        <div className="p-5 overflow-y-auto space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50">
          {/* 1. VIDEO VIEWS */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Vues de la Vidéo
                </span>
                <span className="text-[11px] text-slate-500">Vues totales sur la vidéo</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minViews}
                onChange={(e) => setDraft({ ...draft, minViews: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0 vue</option>
                <option value={5000}>5K</option>
                <option value={10000}>10K</option>
                <option value={50000}>50K</option>
                <option value={100000}>100K</option>
                <option value={500000}>500K</option>
                <option value={1000000}>1M</option>
              </select>
              <span className="text-slate-400 text-xs">-</span>
              <select
                value={draft.maxViews}
                onChange={(e) => setDraft({ ...draft, maxViews: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>100M+</option>
                <option value={50000}>50K</option>
                <option value={100000}>100K</option>
                <option value={500000}>500K</option>
                <option value={1000000}>1M</option>
                <option value={5000000}>5M</option>
                <option value={10000000}>10M</option>
                <option value={50000000}>50M</option>
              </select>
            </div>
          </div>

          {/* 2. UPLOADED WITHIN */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Période de Publication
              </span>
              <span className="text-[11px] text-slate-500">Depuis combien de temps elle est en ligne</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 bg-slate-100 border border-slate-200 text-slate-500 text-xs rounded-lg px-2.5 py-1.5 font-medium">
                Aujourd'hui
              </div>
              <span className="text-slate-400 text-xs">-</span>
              <select
                value={draft.period}
                onChange={(e) => setDraft({ ...draft, period: e.target.value as any })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="today">Aujourd'hui</option>
                <option value="7d">7 jours</option>
                <option value="21d">3 semaines</option>
                <option value="30d">1 mois</option>
                <option value="90d">3 mois</option>
                <option value="1y">1 an</option>
                <option value="all">Tout l'historique</option>
              </select>
            </div>
          </div>

          {/* 3. CHANNEL SUBSCRIBERS */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Abonnés de la Chaîne
              </span>
              <span className="text-[11px] text-slate-500">Taille de l'audience de la chaîne</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minSubs}
                onChange={(e) => setDraft({ ...draft, minSubs: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0</option>
                <option value={1000}>1K</option>
                <option value={5000}>5K</option>
                <option value={10000}>10K</option>
                <option value={50000}>50K</option>
                <option value={100000}>100K</option>
              </select>
              <span className="text-slate-400 text-xs">-</span>
              <select
                value={draft.maxSubs}
                onChange={(e) => setDraft({ ...draft, maxSubs: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>50M+</option>
                <option value={10000}>10K</option>
                <option value={25000}>25K</option>
                <option value={50000}>50K</option>
                <option value={100000}>100K</option>
                <option value={250000}>250K</option>
                <option value={500000}>500K</option>
                <option value={1000000}>1M</option>
              </select>
            </div>
          </div>

          {/* 4. OUTLIER SCORE */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Score Outlier (Multiplicateur)
              </span>
              <span className="text-[11px] text-slate-500">
                Performance relative vs moyenne habituelle de la chaîne
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minOutlier}
                onChange={(e) => setDraft({ ...draft, minOutlier: parseFloat(e.target.value) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0x</option>
                <option value={1.5}>1.5x</option>
                <option value={2.0}>2.0x</option>
                <option value={3.0}>3.0x</option>
                <option value={5.0}>5.0x</option>
                <option value={10.0}>10.0x</option>
              </select>
              <span className="text-slate-400 text-xs">-</span>
              <select
                value={draft.maxOutlier}
                onChange={(e) => setDraft({ ...draft, maxOutlier: parseFloat(e.target.value) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>100x+</option>
                <option value={5.0}>5.0x</option>
                <option value={10.0}>10.0x</option>
                <option value={25.0}>25.0x</option>
                <option value={50.0}>50.0x</option>
              </select>
            </div>
          </div>

          {/* 5. VIDEO LENGTH */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Durée de la Vidéo
              </span>
              <span className="text-[11px] text-slate-500">Durée en minutes de lecture</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minDurationMinutes}
                onChange={(e) => setDraft({ ...draft, minDurationMinutes: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0 min</option>
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1h</option>
              </select>
              <span className="text-slate-400 text-xs">-</span>
              <select
                value={draft.maxDurationMinutes}
                onChange={(e) => setDraft({ ...draft, maxDurationMinutes: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>3h+</option>
                <option value={5}>5 min</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1h</option>
                <option value={120}>2h</option>
              </select>
            </div>
          </div>

          {/* 6. CHANNEL UPLOAD COUNT */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Nombre de Vidéos Publiées
              </span>
              <span className="text-[11px] text-slate-500">Total vidéos en ligne sur la chaîne</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minUploadCount}
                onChange={(e) => setDraft({ ...draft, minUploadCount: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-400 text-xs">-</span>
              <select
                value={draft.maxUploadCount}
                onChange={(e) => setDraft({ ...draft, maxUploadCount: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>10K+</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1K</option>
              </select>
            </div>
          </div>

          {/* 7. CHANNEL AGE */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 md:col-span-2 shadow-sm">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Âge de la Chaîne
              </span>
              <span className="text-[11px] text-slate-500">Jours depuis la date de création</span>
            </div>

            <div className="flex items-center gap-2 pt-1 max-w-md">
              <select
                value={draft.minChannelAgeDays}
                onChange={(e) => setDraft({ ...draft, minChannelAgeDays: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0 jour</option>
                <option value={30}>30 jours</option>
                <option value={90}>90 jours</option>
                <option value={115}>115 jours</option>
                <option value={180}>180 jours</option>
                <option value={365}>1 an</option>
              </select>
              <span className="text-slate-400 text-xs">-</span>
              <select
                value={draft.maxChannelAgeDays}
                onChange={(e) => setDraft({ ...draft, maxChannelAgeDays: parseInt(e.target.value, 10) })}
                className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>15.1 ans+</option>
                <option value={90}>90 jours</option>
                <option value={115}>115 jours</option>
                <option value={180}>180 jours (6 mois)</option>
                <option value={365}>1 an</option>
                <option value={730}>2 ans</option>
                <option value={1825}>5 ans</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {countActive()} filtre{countActive() > 1 ? "s" : ""} actif{countActive() > 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Appliquer les filtres</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
