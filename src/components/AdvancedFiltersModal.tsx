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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#10141c] border border-[#1f283a] rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#182130] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Advanced filters
              </h2>
              <p className="text-xs text-slate-400">
                Everything that does not need to sit in the filter bar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#151c28] hover:bg-[#1e293b] text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-[#222e42]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Grid */}
        <div className="p-5 overflow-y-auto space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. VIDEO VIEWS */}
          <div className="bg-[#0b0e14] border border-[#17202e] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Video Views
                </span>
                <span className="text-[11px] text-slate-400">Views on the video itself</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minViews}
                onChange={(e) => setDraft({ ...draft, minViews: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0 views</option>
                <option value={5000}>5K</option>
                <option value={10000}>10K</option>
                <option value={50000}>50K</option>
                <option value={100000}>100K</option>
                <option value={500000}>500K</option>
                <option value={1000000}>1M</option>
              </select>
              <span className="text-slate-500 text-xs">-</span>
              <select
                value={draft.maxViews}
                onChange={(e) => setDraft({ ...draft, maxViews: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
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
          <div className="bg-[#0b0e14] border border-[#17202e] rounded-xl p-3.5 space-y-2">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Uploaded Within
              </span>
              <span className="text-[11px] text-slate-400">How long ago the video went up</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-400 text-xs rounded-lg px-2.5 py-1.5 font-medium">
                Today
              </div>
              <span className="text-slate-500 text-xs">-</span>
              <select
                value={draft.period}
                onChange={(e) => setDraft({ ...draft, period: e.target.value as any })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="today">Today</option>
                <option value="7d">7 days</option>
                <option value="21d">3 weeks</option>
                <option value="30d">1 month</option>
                <option value="90d">3 months</option>
                <option value="1y">1 year</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          {/* 3. CHANNEL SUBSCRIBERS */}
          <div className="bg-[#0b0e14] border border-[#17202e] rounded-xl p-3.5 space-y-2">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Channel Subscribers
              </span>
              <span className="text-[11px] text-slate-400">Size of the channel that posted it</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minSubs}
                onChange={(e) => setDraft({ ...draft, minSubs: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0</option>
                <option value={1000}>1K</option>
                <option value={5000}>5K</option>
                <option value={10000}>10K</option>
                <option value={50000}>50K</option>
                <option value={100000}>100K</option>
              </select>
              <span className="text-slate-500 text-xs">-</span>
              <select
                value={draft.maxSubs}
                onChange={(e) => setDraft({ ...draft, maxSubs: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
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
          <div className="bg-[#0b0e14] border border-[#17202e] rounded-xl p-3.5 space-y-2">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Outlier Score
              </span>
              <span className="text-[11px] text-slate-400">
                Views against channel's usual video. 10x means ten times
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minOutlier}
                onChange={(e) => setDraft({ ...draft, minOutlier: parseFloat(e.target.value) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0x</option>
                <option value={1.5}>1.5x</option>
                <option value={2.0}>2.0x</option>
                <option value={3.0}>3.0x</option>
                <option value={5.0}>5.0x</option>
                <option value={10.0}>10.0x</option>
              </select>
              <span className="text-slate-500 text-xs">-</span>
              <select
                value={draft.maxOutlier}
                onChange={(e) => setDraft({ ...draft, maxOutlier: parseFloat(e.target.value) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
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
          <div className="bg-[#0b0e14] border border-[#17202e] rounded-xl p-3.5 space-y-2">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Video Length
              </span>
              <span className="text-[11px] text-slate-400">Running time of the video</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minDurationMinutes}
                onChange={(e) => setDraft({ ...draft, minDurationMinutes: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0 min</option>
                <option value={1}>1 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1h</option>
              </select>
              <span className="text-slate-500 text-xs">-</span>
              <select
                value={draft.maxDurationMinutes}
                onChange={(e) => setDraft({ ...draft, maxDurationMinutes: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
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
          <div className="bg-[#0b0e14] border border-[#17202e] rounded-xl p-3.5 space-y-2">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Channel Upload Count
              </span>
              <span className="text-[11px] text-slate-400">How many videos the channel has posted</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <select
                value={draft.minUploadCount}
                onChange={(e) => setDraft({ ...draft, minUploadCount: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500 text-xs">-</span>
              <select
                value={draft.maxUploadCount}
                onChange={(e) => setDraft({ ...draft, maxUploadCount: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
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
          <div className="bg-[#0b0e14] border border-[#17202e] rounded-xl p-3.5 space-y-2 md:col-span-2">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Channel Age
              </span>
              <span className="text-[11px] text-slate-400">Days since the channel started</span>
            </div>

            <div className="flex items-center gap-2 pt-1 max-w-md">
              <select
                value={draft.minChannelAgeDays}
                onChange={(e) => setDraft({ ...draft, minChannelAgeDays: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>0 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={115}>115 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
              <span className="text-slate-500 text-xs">-</span>
              <select
                value={draft.maxChannelAgeDays}
                onChange={(e) => setDraft({ ...draft, maxChannelAgeDays: parseInt(e.target.value, 10) })}
                className="flex-1 bg-[#121824] border border-[#1e283a] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={0}>15.1y+</option>
                <option value={90}>90 days</option>
                <option value={115}>115 days</option>
                <option value={180}>180 days (6 months)</option>
                <option value={365}>1 year</option>
                <option value={730}>2 years</option>
                <option value={1825}>5 years</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#182130] bg-[#0c1017] flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {countActive()} filters applied
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Reset all
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/40 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply filters</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
