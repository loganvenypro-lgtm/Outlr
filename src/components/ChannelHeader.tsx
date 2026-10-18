"use client";

import { useState } from "react";
import { ChannelDetail } from "@/types/youtube";
import { formatCompactNumber, formatFullNumber, formatDate } from "@/lib/utils";
import { 
  Users, 
  Eye, 
  Video, 
  ExternalLink, 
  Calendar, 
  Globe, 
  CheckCircle2, 
  Sparkles,
  Share2,
  Check,
  Compass,
  Flame
} from "lucide-react";

interface ChannelHeaderProps {
  channel: ChannelDetail;
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  const [copied, setCopied] = useState(false);

  const youtubeUrl = channel.customUrl
    ? `https://www.youtube.com/${channel.customUrl.startsWith("@") ? channel.customUrl : "@" + channel.customUrl}`
    : `https://www.youtube.com/channel/${channel.id}`;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#0e1628] border border-[#1e2b46] rounded-2xl overflow-hidden shadow-xl">
      {/* Banner */}
      <div className="h-40 sm:h-52 w-full bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
        {channel.banner ? (
          <img
            src={channel.banner}
            alt={`${channel.title} Banner`}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1628] via-transparent to-transparent" />
      </div>

      {/* Profile info section */}
      <div className="px-6 pb-6 pt-0 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-5">
          <div className="flex items-end gap-4">
            <div className="relative">
              <img
                src={channel.avatar || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80"}
                alt={channel.title}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.title)}&background=2563eb&color=fff&size=200`;
                }}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-[#0e1628] bg-slate-800 object-cover shadow-2xl shadow-black/60"
              />
              <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-[#0e1628] text-white">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {channel.title}
                </h1>
                {channel.country && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#19243d] text-slate-300 border border-[#233355]">
                    {channel.country}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {channel.customUrl && (
                  <span className="text-blue-400 font-medium">
                    {channel.customUrl.startsWith("@") ? channel.customUrl : `@${channel.customUrl}`}
                  </span>
                )}
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-500">ID: {channel.id}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 flex-wrap">
            <a
              href={`/dashboard/similar-channels?url=${encodeURIComponent(channel.id)}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white font-medium text-xs transition-all"
              title="Trouver les chaînes concurrentes similaires"
            >
              <Compass className="w-4 h-4 text-blue-400" />
              <span>Chaînes Similaires</span>
            </a>

            <a
              href={`/niche-finder?q=${encodeURIComponent(channel.title)}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-white font-medium text-xs transition-all"
              title="Trouver les vidéos outliers dans la niche de ce créateur"
            >
              <Flame className="w-4 h-4 text-purple-400" />
              <span>Niche & Outliers</span>
            </a>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141e33] hover:bg-[#1c2944] border border-[#1e2b47] text-slate-300 hover:text-white font-medium text-xs transition-all"
              title="Copy shareable link"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copié !</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Partager</span>
                </>
              )}
            </button>

            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-all shadow-md shadow-red-600/20"
            >
              <span>YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Metadata info pills */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-[#18233a]">
          {channel.publishedAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Joined {formatDate(channel.publishedAt)}</span>
            </div>
          )}
          {channel.country && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>Location: {channel.country}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Official YouTube Verified Data</span>
          </div>
        </div>

        {/* Description snippet */}
        {channel.description && (
          <div className="mt-4 p-3.5 bg-[#0a101e] border border-[#162137] rounded-xl text-xs text-slate-300 leading-relaxed">
            <p className="line-clamp-3 whitespace-pre-line">{channel.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
