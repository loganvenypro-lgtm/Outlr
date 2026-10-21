"use client";

import { useState } from "react";
import { ChannelDetail, RecentVideo } from "@/types/youtube";
import { 
  estimateChannelRevenue, 
  NICHE_RPM_BENCHMARKS, 
  ChannelRevenueEstimation 
} from "@/lib/revenueEstimator";
import { formatCompactNumber, formatFullNumber } from "@/lib/utils";
import { 
  DollarSign, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  ChevronDown,
  Layers,
  Calendar,
  Zap,
  Info
} from "lucide-react";

interface ChannelMonetizationEstimatorProps {
  channel: ChannelDetail;
  videos?: RecentVideo[];
}

export function ChannelMonetizationEstimator({ channel, videos = [] }: ChannelMonetizationEstimatorProps) {
  // Compute initial estimation
  const defaultEstimation = estimateChannelRevenue(channel, videos);
  
  // Custom RPM override state
  const [selectedNiche, setSelectedNiche] = useState<string>(defaultEstimation.detectedNicheKey);
  const [customRpm, setCustomRpm] = useState<number>(defaultEstimation.estimatedRpm.avg);
  const [customMonthlyViews, setCustomMonthlyViews] = useState<number>(defaultEstimation.monthlyViews);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Recalculate based on selected niche or custom values
  const currentBenchmark = NICHE_RPM_BENCHMARKS[selectedNiche] || NICHE_RPM_BENCHMARKS["general"];
  const rpm = customRpm;
  const views = customMonthlyViews;

  const monthlyMin = Math.round((views / 1000) * currentBenchmark.minRpm);
  const monthlyAvg = Math.round((views / 1000) * rpm);
  const monthlyMax = Math.round((views / 1000) * currentBenchmark.maxRpm);

  const annualAvg = monthlyAvg * 12;

  const handleNicheChange = (nicheKey: string) => {
    setSelectedNiche(nicheKey);
    const bench = NICHE_RPM_BENCHMARKS[nicheKey] || NICHE_RPM_BENCHMARKS["general"];
    setCustomRpm(bench.avgRpm);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">
                Estimation des Revenus & Monétisation Adsense
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                defaultEstimation.isMonetizedLikely 
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" 
                  : "bg-amber-500/15 border-amber-500/30 text-amber-400"
              }`}>
                {defaultEstimation.isMonetizedLikely ? "Monétisée (YPP Éligible)" : "Vérification Requise"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculé à partir du volume de vues mensuel et du benchmark RPM réel de la niche.
            </p>
          </div>
        </div>

        {/* Niche Selector Tag */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Niche détectée :</span>
          <select
            value={selectedNiche}
            onChange={(e) => handleNicheChange(e.target.value)}
            className="bg-white border border-slate-200 text-emerald-400 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            {Object.entries(NICHE_RPM_BENCHMARKS).map(([key, item]) => (
              <option key={key} value={key} className="bg-white text-slate-900">
                {item.niche} (~${item.avgRpm} RPM)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Revenue Cards (Monthly & Yearly Range) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estimated Monthly Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Revenus Estimés / Mois
            </span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            ${formatCompactNumber(monthlyAvg)}
            <span className="text-xs font-normal text-slate-500 ml-1">/mois</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-200">
            <span>Fourchette :</span>
            <span className="text-slate-700 font-semibold">
              ${formatCompactNumber(monthlyMin)} - ${formatCompactNumber(monthlyMax)}
            </span>
          </div>
        </div>

        {/* Card 2: Estimated Annual Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Revenus Estimés / An
            </span>
            <div className="p-1 rounded bg-blue-500/10 text-blue-400 text-xs">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${formatCompactNumber(annualAvg)}
            <span className="text-xs font-normal text-slate-500 ml-1">/an</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-200">
            <span>Projection 12 mois :</span>
            <span className="text-blue-400 font-semibold">
              ${formatCompactNumber(monthlyMin * 12)} - ${formatCompactNumber(monthlyMax * 12)}
            </span>
          </div>
        </div>

        {/* Card 3: Estimated RPM */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              RPM Estimé (Par 1k Vues)
            </span>
            <div className="p-1 rounded bg-purple-500/10 text-purple-400 text-xs">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono tracking-tight">
            ${rpm.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-200">
            <span>Plage marché :</span>
            <span className="text-slate-700">
              ${currentBenchmark.minRpm.toFixed(1)} - ${currentBenchmark.maxRpm.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Card 4: Estimated Monthly Views */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Vues Mensuelles Estimées
            </span>
            <div className="p-1 rounded bg-sky-500/10 text-sky-400 text-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-300 tracking-tight">
            {formatCompactNumber(views)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-200">
            <span>Vues / jour moy. :</span>
            <span className="text-slate-700 font-semibold">
              +{formatCompactNumber(Math.round(views / 30))}/j
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Sliders (Collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Simulateur & Paramètres Personnalisés de Revenus</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-200 text-xs">
            {/* Slider 1: RPM */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Ajuster le RPM (€ / $ par 1000 vues) :</span>
                <span className="text-emerald-400 font-mono font-bold">${rpm.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="35"
                step="0.5"
                value={rpm}
                onChange={(e) => setCustomRpm(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>$0.50 (Gaming Shorts)</span>
                <span>$14.50 (Finance/Tech)</span>
                <span>$35.00+ (High B2B)</span>
              </div>
            </div>

            {/* Slider 2: Monthly Views */}
            <div className="space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Ajuster le volume de vues mensuel :</span>
                <span className="text-sky-400 font-mono font-bold">{formatCompactNumber(views)} vues</span>
              </div>
              <input
                type="range"
                min="10000"
                max={Math.max(5000000, views * 2)}
                step="10000"
                value={views}
                onChange={(e) => setCustomMonthlyViews(parseInt(e.target.value, 10))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>10k vues/mois</span>
                <span>{formatCompactNumber(defaultEstimation.monthlyViews)} (Actuel)</span>
                <span>{formatCompactNumber(Math.max(5000000, views * 2))}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assumptions & Methodology Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            {currentBenchmark.description} Modèle prédictif basé sur l'Adsense Program standard.
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setCustomRpm(defaultEstimation.estimatedRpm.avg);
            setCustomMonthlyViews(defaultEstimation.monthlyViews);
            setSelectedNiche(defaultEstimation.detectedNicheKey);
          }}
          className="text-slate-500 hover:text-slate-900 underline cursor-pointer text-[11px] shrink-0"
        >
          Réinitialiser aux valeurs détectées
        </button>
      </div>
    </div>
  );
}
