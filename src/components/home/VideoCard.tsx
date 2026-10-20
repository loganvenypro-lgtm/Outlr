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
  
  // Badge color: emerald = "surperformance". Solid for big outliers, soft pill otherwise.
  const isHighOutlier = numMult >= 4.0;
  const badgeClasses = isHighOutlier
    ? "bg-emerald-600 text-white"
    : "bg-white/95 text-emerald-700 ring-1 ring-emerald-600/20 backdrop-blur";

  const approxBaseline = baselineViews || Math.round(viewCount / Math.max(numMult, 1));

  return (
    <Link
      href={`/watch?v=${id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      prefetch={false}
    >
      {/* 1. Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-medium text-slate-500">
            Aperçu indisponible
          </div>
        )}

        {/* Outlier badge — top left */}
        <div
          className={`absolute left-2.5 top-2.5 rounded-lg px-2 py-1 text-[11px] font-extrabold tabular-nums shadow-sm ${badgeClasses}`}
          title={`${mult}x la médiane de la chaîne`}
        >
          {mult}x
        </div>

        {/* Duration badge — bottom right */}
        {durationFormatted && (
          <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {durationFormatted}
          </div>
        )}
      </div>

      {/* 2. Metadata */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3
          className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-700"
          title={title}
        >
          {title}
        </h3>

        <p className="truncate text-[13px] font-medium text-slate-500">
          {displayHandle}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[12.5px]">
          <p className="truncate text-slate-500">
            <span className="font-semibold tabular-nums text-slate-800">
              {formatCompactNumber(viewCount)}
            </span>{" "}
            vues
            {approxBaseline > 0 && (
              <span className="text-slate-500">
                {" "}· moy. {formatCompactNumber(approxBaseline)}
              </span>
            )}
          </p>
          <span className="shrink-0 tabular-nums text-slate-500">
            {getRelativeTimeFrench(publishedAt)}
          </span>
        </div>

        {channelSubs !== undefined && channelSubs > 0 && (
          <p className="text-[12px] tabular-nums text-slate-500">
            {formatCompactNumber(channelSubs)} abonnés
          </p>
        )}
      </div>
    </Link>
  );
}