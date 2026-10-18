"use client";

import { useEffect, useState } from "react";
import { VideoCard } from "./VideoCard";
import { SlidersHorizontal, Loader2, Sparkles } from "lucide-react";
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
      <section className="py-8 px-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-64 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-video w-full rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 px-6 max-w-[1400px] mx-auto">
      {/* Section Header with exact style from user image */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Vidéos atypiques aléatoires
          </h2>
        </div>

        <Link
          href="/niche-finder"
          className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtres</span>
        </Link>
      </div>

      {/* Videos Grid with 5 columns on desktop like the reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-400 text-sm">
              Aucune vidéo trouvée pour le moment.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}