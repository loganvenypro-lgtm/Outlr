"use client";

import { useState } from "react";
import { MonitoredTrackedVideo, HistoricalVideoVersion } from "@/types/thumbnailIntelligence";
import { formatCompactNumber, formatDate } from "@/lib/utils";
import { 
  X, 
  ExternalLink, 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  History, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Split, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock
} from "lucide-react";

interface ThumbnailCompareModalProps {
  video: MonitoredTrackedVideo;
  onClose: () => void;
}

export function ThumbnailCompareModal({ video, onClose }: ThumbnailCompareModalProps) {
  const versions = video.versions;
  const [leftVersionIndex, setLeftVersionIndex] = useState<number>(0);
  const [rightVersionIndex, setRightVersionIndex] = useState<number>(Math.max(versions.length - 1, 0));

  const leftVersion = versions[leftVersionIndex] || versions[0];
  const rightVersion = versions[rightVersionIndex] || versions[versions.length - 1];

  const getClassBadge = (classification: string) => {
    switch (classification) {
      case "confirmed_ab_test":
        return { label: "Test A/B Confirmé", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
      case "probable_ab_test":
        return { label: "Test A/B Probable", bg: "bg-blue-500/20 text-blue-400 border-blue-500/30" };
      case "observed_change":
        return { label: "Changement Observé", bg: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      default:
        return { label: "Données Insuffisantes", bg: "bg-slate-700/50 text-slate-300 border-slate-600/30" };
    }
  };

  const badge = getClassBadge(video.abTestClassification);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1120] border border-[#1b263e] rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#162238] flex items-center justify-between gap-3 bg-[#0d1424]">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badge.bg}`}>
                {badge.label}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Indice de confiance : {video.abTestConfidenceScore}%
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-2xl">
              {video.currentTitle}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{video.channelTitle}</span>
              <span>•</span>
              <span>Publié le {formatDate(video.publishedAt)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-[#141e33] hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
              title="Ouvrir sur YouTube"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#141e33] hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Side-by-Side Comparison Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Split className="w-4 h-4 text-blue-400" />
                <span>Comparateur Côte-à-Côte des Versions</span>
              </span>
              <span className="text-xs text-slate-400">
                {versions.length} version{versions.length > 1 ? "s" : ""} observée{versions.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Version */}
              <div className="bg-[#080d1a] border border-[#162238] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Comparer avec :</span>
                  <select
                    value={leftVersionIndex}
                    onChange={(e) => setLeftVersionIndex(parseInt(e.target.value, 10))}
                    className="bg-[#11192e] border border-[#1b263e] text-xs font-bold text-white rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    {versions.map((ver, idx) => (
                      <option key={ver.id} value={idx}>
                        Version {ver.versionNumber} ({ver.versionNumber === 1 ? "Initiale" : "Modifiée"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                  <img
                    src={leftVersion.thumbnailUrl}
                    alt={leftVersion.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-black/80 backdrop-blur-xs text-[10px] font-bold text-white">
                    Version #{leftVersion.versionNumber}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                    Titre sous cette version :
                  </span>
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2">
                    {leftVersion.title}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#141f33] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Première observation</span>
                    <span className="text-slate-300 font-mono text-[11px]">{formatDate(leftVersion.firstObservedAt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Vues au snapshot</span>
                    <span className="text-white font-bold">{formatCompactNumber(leftVersion.metricsSnapshot.viewCount)}</span>
                  </div>
                </div>
              </div>

              {/* Right Version */}
              <div className="bg-[#080d1a] border border-[#162238] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Comparer avec :</span>
                  <select
                    value={rightVersionIndex}
                    onChange={(e) => setRightVersionIndex(parseInt(e.target.value, 10))}
                    className="bg-[#11192e] border border-[#1b263e] text-xs font-bold text-white rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    {versions.map((ver, idx) => (
                      <option key={ver.id} value={idx}>
                        Version {ver.versionNumber} ({ver.versionNumber === versions.length ? "Actuelle" : "Historique"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                  <img
                    src={rightVersion.thumbnailUrl}
                    alt={rightVersion.title}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-blue-600 text-white text-[10px] font-bold">
                    Version #{rightVersion.versionNumber} {rightVersionIndex === versions.length - 1 ? "(Actuelle)" : ""}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                    Titre sous cette version :
                  </span>
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2">
                    {rightVersion.title}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#141f33] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Dernière observation</span>
                    <span className="text-slate-300 font-mono text-[11px]">{formatDate(rightVersion.lastObservedAt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Vues au snapshot</span>
                    <span className="text-white font-bold">{formatCompactNumber(rightVersion.metricsSnapshot.viewCount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Before & After Analysis */}
          {video.performanceAnalysis && (
            <div className="bg-gradient-to-r from-[#0d1627] to-[#0a1120] border border-[#1c2a47] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Impact de Vélocité Avant / Après Changement</span>
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  video.performanceAnalysis.velocityDeltaPercent > 0
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}>
                  {video.performanceAnalysis.velocityDeltaPercent > 0 ? "+" : ""}
                  {video.performanceAnalysis.velocityDeltaPercent}% Vélocité
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-[#080d1a] border border-[#152136] rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block">Période Avant Changement</span>
                  <p className="text-base font-extrabold text-white mt-1">
                    {video.performanceAnalysis.preChangeViewsPerHour} <span className="text-xs font-normal text-slate-400">vues/h</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    +{formatCompactNumber(video.performanceAnalysis.preChangeViewsGained)} vues sur {video.performanceAnalysis.preChangeWindowHours}h
                  </span>
                </div>

                <div className="bg-[#080d1a] border border-[#152136] rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block">Période Après Changement</span>
                  <p className="text-base font-extrabold text-emerald-400 mt-1">
                    {video.performanceAnalysis.postChangeViewsPerHour} <span className="text-xs font-normal text-slate-400">vues/h</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    +{formatCompactNumber(video.performanceAnalysis.postChangeViewsGained)} vues sur {video.performanceAnalysis.postChangeWindowHours}h
                  </span>
                </div>

                <div className="bg-[#080d1a] border border-[#152136] rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block">Verdict de Performance</span>
                  <p className="text-sm font-bold text-white mt-1">
                    {video.performanceAnalysis.summaryVerdict === "significant_acceleration" && "Accélération nette 🚀"}
                    {video.performanceAnalysis.summaryVerdict === "slight_improvement" && "Légère progression 📈"}
                    {video.performanceAnalysis.summaryVerdict === "neutral" && "Rythme stable ⚖️"}
                    {video.performanceAnalysis.summaryVerdict === "deceleration" && "Ralentissement observé 📉"}
                  </p>
                  <span className="text-[10px] text-slate-500">Basé sur les snapshots d'observation</span>
                </div>
              </div>
            </div>
          )}

          {/* Evidence & Methodology Transparency */}
          <div className="bg-[#080e1b] border border-[#18233a] rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Preuves d'analyse & Limites Techniques</span>
            </span>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
              {video.abTestEvidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
              {video.uncertaintyReasons.map((unc, i) => (
                <li key={i} className="text-slate-500 italic">{unc}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
