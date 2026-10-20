"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "./VideoCard";
import { SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";

interface VideoItem {
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
}

export function VideosGrid() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/youtube/viral-videos?limit=24&sortBy=outlier")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          const items: VideoItem[] = (data.videos || data.items || []).map((v: any) => ({
            id: v.id || v.videoId,
            title: v.title,
            thumbnail: v.thumbnail || v.thumbnails?.default?.url,
            channelTitle: v.channelTitle || "Chaîne YouTube",
            channelHandle: v.channelHandle,
            channelSubs: v.channelSubs ?? v.subscriberCount ?? v.channelSubscribers,
            viewCount: v.viewCount ?? v.views ?? 0,
            baselineViews: v.baselineViews,
            publishedAt: v.publishedAt,
            durationFormatted: v.durationFormatted,
            outlierMultiplier: v.outlierMultiplier || 1.4,
          }));
          setVideos(items);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-[1440px] px-6 pb-16 md:px-10" aria-busy="true">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-7 w-64 animate-pulse rounded-lg bg-slate-200/70" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-200/50" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200/70" />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
              <div className="aspect-video w-full animate-pulse bg-slate-100" />
              <div className="space-y-2.5 p-4">
                <div className="h-4 w-full animate-pulse rounded bg-slate-200/70" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/50" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200/50" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-6 pb-16 md:px-10">
      {/* Section header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
            Sélection du moment
          </p>
          <h2 className="text-balance text-2xl font-bold tracking-tight text-slate-900 md:text-[1.7rem]">
            Vidéos atypiques aléatoires
          </h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
            {videos.length > 0
              ? `${videos.length} vidéos qui surperforment la médiane de leur chaîne.`
              : "Les vidéos qui surperforment la médiane de leur chaîne."}
          </p>
        </div>

        <Link
          href="/niche-finder"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtres</span>
        </Link>
      </div>

      {/* Videos grid — 4 cols max for breathing room */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            id={video.id}
            title={video.title}
            thumbnail={video.thumbnail}
            channelTitle={video.channelTitle}
            channelHandle={video.channelHandle}
            channelSubs={video.channelSubs}
            viewCount={video.viewCount}
            baselineViews={video.baselineViews}
            publishedAt={video.publishedAt}
            durationFormatted={video.durationFormatted}
            outlierMultiplier={video.outlierMultiplier}
          />
        ))}

        {videos.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Sparkles className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-[15px] font-semibold text-slate-700">
              Aucune vidéo pour le moment
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-slate-500">
              Lancez un scan depuis le Niche Finder pour alimenter cette sélection.
            </p>
            <Link
              href="/niche-finder"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Ouvrir le Niche Finder
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}