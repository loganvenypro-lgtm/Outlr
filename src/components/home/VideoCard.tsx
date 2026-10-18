"use client";

import Link from "next/link";
import { formatCompactNumber } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelHandle?: string;
  channelSubs?: number;
  viewCount: number;
  baselineViews?: number;
  publishedAt?: string;
  durationFormatted?: string;
  outlierMultiplier?: number;
  isShort?: boolean;
}

function getRelativeTimeFrench(dateString?: string): string {
  if (!dateString) return "récemment";
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffDays = Math.round((now - past) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} j`;
  if (diffDays < 30) return `il y a ${Math.round(diffDays / 7)} sem`;
  if (diffDays < 365) return `il y a ${Math.round(diffDays / 30)} m`;
  if (diffDays < 730) return "l'an dernier";
  return `il y a ${Math.round(diffDays / 365)} a`;
}

export function VideoCard({
  id,
  title,
  thumbnail,
  channelTitle,
  channelHandle,
  channelSubs,
  viewCount,
  baselineViews,
  publishedAt,
  durationFormatted,
  outlierMultiplier,
}: VideoCardProps) {
  // Format handle like @channel.mp4
  const displayHandle =
    channelHandle ||
    `@${channelTitle.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "createur"}`;

  // Outlier multiplier badge styling
  const mult = outlierMultiplier ? outlierMultiplier.toFixed(1) : "1.5";
  const numMult = parseFloat(mult);
  
  // Badge color: purple/indigo for high outliers (4x+), blue/navy for standard outliers (1.3x - 3.9x)
  const isHighOutlier = numMult >= 4.0;
  const badgeClasses = isHighOutlier
    ? "bg-[#6d28d9] text-white"
    : "bg-[#1e293b] text-white";

  const approxBaseline = baselineViews || Math.round(viewCount / Math.max(numMult, 1));

  return (
    <Link
      href={`/watch?v=${id}`}
      className="group flex flex-col focus:outline-none"
      prefetch={false}
    >
      {/* 1. Thumbnail container with dark overlay duration tag */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-sm border border-slate-200/60">
        <img
          src={thumbnail}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Duration badge */}
        {durationFormatted && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 text-[11px] font-bold text-white tracking-tight">
            {durationFormatted}
          </div>
        )}
      </div>

      {/* 2. Metadata details */}
      <div className="pt-2.5 pb-1 flex flex-col gap-1">
        {/* Title row with inline multiplier pill */}
        <div className="flex items-start gap-2">
          <span
            className={`inline-flex shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-extrabold leading-none ${badgeClasses}`}
          >
            {mult}x
          </span>
          <h3
            className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors"
            title={title}
          >
            {title}
          </h3>
        </div>

        {/* Channel info & Sub count */}
        <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 truncate">
          <span className="text-slate-600 font-semibold truncate hover:underline">
            {displayHandle}
          </span>
          {channelSubs !== undefined && channelSubs > 0 && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">
                {formatCompactNumber(channelSubs)} abonnés
              </span>
            </>
          )}
        </div>

        {/* Views vs Channel Average & Relative Date */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-0.5">
          <div className="truncate">
            <span className="text-slate-700 font-semibold">
              {formatCompactNumber(viewCount)} vues
            </span>
            {approxBaseline > 0 && (
              <span className="text-slate-400 ml-1">
                contre {formatCompactNumber(approxBaseline)} moy.
              </span>
            )}
          </div>
          <span className="shrink-0 text-slate-400 text-[10px]">
            {getRelativeTimeFrench(publishedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}