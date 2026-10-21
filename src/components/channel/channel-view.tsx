"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Eye,
  Flame,
  FlaskConical,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmptyState,
  ExplorerHeader,
  FilterSelect,
  SessionExpiredError,
  SessionExpiredState,
  fetchJson,
} from "@/components/explorer/explorer-ui";
import { cn, formatCompactNumber } from "@/lib/utils";
import { channelAge, DiscoveredBadge, subscribersPerDay } from "@/components/channel-trends/channel-card";
import { SimilarChannelsSheet } from "@/components/channel-trends/similar-channels-sheet";
import { RealtimeBars, VideoPerformanceChart } from "./charts";
import { VideoDialog } from "./video-dialog";
import { SaveToFolderMenu } from "@/components/folders/save-to-folder-menu";
import type { SavedItemInput } from "@/lib/saved-folders";
import { RevenueCard } from "@/components/monetization/revenue";
import type { AdRevenueEstimate } from "@/lib/revenueEstimator";

interface ChannelVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  views: number;
  likes: number | null;
  comments: number | null;
  duration: string | null;
  isShort: boolean;
  multiplier: number | null;
  viewsPerHour: number | null;
  score: number | null;
  categoryId: number | null;
  abTest: boolean;
}

interface ChannelData {
  channel: {
    id: string;
    name: string;
    handle: string | null;
    avatar: string | null;
    country: string | null;
    subscribers: number | null;
    totalViews: number | null;
    videoCount: number | null;
    trendScore: number | null;
    recentRatio: number | null;
    createdAt: string | null;
    discoveredAt: string | null;
    outlierRate: number | null;
    opportunityScore: number | null;
    tracked: boolean;
  };
  kpis: {
    subs24h: number | null;
    views24h: number | null;
    views7d: number;
    uploads30d: number;
    avgViews30d: number | null;
    outliers30d: number;
    engagement30d: number | null;
    medianLong: number | null;
    medianShort: number | null;
    views48h: number;
  };
  revenue: AdRevenueEstimate;
  hourly: { hour: string; views: number }[];
  videos: ChannelVideo[];
  updatedAt: string | null;
}

const REFRESH_MS = 2 * 60 * 1000;
const PAGE = 24;

const SORT_OPTIONS = [
  { value: "recent", label: "Plus récentes" },
  { value: "views", label: "Plus vues" },
  { value: "multiplier", label: "Meilleur multiplicateur" },
];

function ago(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return "il y a moins d'1 h";
  if (hours < 24) return `il y a ${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return days < 30 ? `il y a ${days} j` : days < 365 ? `il y a ${Math.round(days / 30)} mois` : `il y a ${Math.round(days / 365)} an(s)`;
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatCompactNumber(Math.abs(n))}`;

export function ChannelView({ channelId }: { channelId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<{ id: string; data?: ChannelData; error?: Error } | null>(null);
  const [tick, setTick] = useState(0);
  const [format, setFormat] = useState("all");
  const [sort, setSort] = useState("recent");
  const [visible, setVisible] = useState(PAGE);
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [tracking, setTracking] = useState<"idle" | "saving" | "saved">("idle");
  const [showSimilar, setShowSimilar] = useState(false);

  // Data comes from the scanner's database, so polling it is free: refresh every 2 minutes.
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchJson<ChannelData>(`/api/channels/${encodeURIComponent(channelId)}`)
      .then((data) => !cancelled && setResult({ id: channelId, data }))
      .catch((error: Error) => !cancelled && setResult((prev) => (prev?.data ? prev : { id: channelId, error })));
    return () => {
      cancelled = true;
    };
  }, [channelId, tick]);

  const data = result?.id === channelId ? result.data : undefined;

  const videos = useMemo(() => {
    const list = (data?.videos ?? []).filter((v) => format === "all" || (format === "short") === v.isShort);
    if (sort === "views") return [...list].sort((a, b) => b.views - a.views);
    if (sort === "multiplier") return [...list].sort((a, b) => (b.multiplier ?? 0) - (a.multiplier ?? 0));
    return list;
  }, [data, format, sort]);

  const chartVideos = useMemo(
    () => (data?.videos ?? []).filter((v) => (format === "all" ? !v.isShort : (format === "short") === v.isShort)).slice(0, 40),
    [data, format],
  );

  if (result?.error && !data) {
    return (
      <div className="flex min-h-full flex-col">
        <ExplorerHeader title="Analyse de chaîne" />
        <div className="p-6">
          {result.error instanceof SessionExpiredError ? (
            <SessionExpiredState />
          ) : (
            <EmptyState title="Impossible de charger la chaîne" description={result.error.message} />
          )}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-full flex-col">
        <ExplorerHeader title="Analyse de chaîne" />
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const { channel, kpis } = data;
  const tracked = channel.tracked || tracking === "saved";
  const perDay = subscribersPerDay(channel.subscribers, channel.createdAt);

  const track = async () => {
    setTracking("saving");
    try {
      const res = await fetch("/api/youtube/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "track_channel",
          channel: {
            channelId: channel.id,
            name: channel.name,
            handle: channel.handle,
            avatar: channel.avatar,
            subscribers: channel.subscribers ?? 0,
            totalViews: channel.totalViews ?? 0,
            videoCount: channel.videoCount ?? 0,
          },
        }),
      });
      setTracking(res.ok ? "saved" : "idle");
    } catch {
      setTracking("idle");
    }
  };

  const median = format === "short" ? kpis.medianShort : kpis.medianLong;

  return (
    <div className="flex min-h-full flex-col">
      <ExplorerHeader title={channel.name} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Retour
        </Button>

        {/* Channel header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <Avatar className="size-16">
            {channel.avatar && <AvatarImage src={channel.avatar} alt="" />}
            <AvatarFallback className="text-lg">{channel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="truncate text-2xl font-semibold tracking-tight">{channel.name}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {channel.handle && <span>{channel.handle}</span>}
              {channel.subscribers != null && <span>· {formatCompactNumber(channel.subscribers)} abonnés</span>}
              {channel.videoCount != null && <span>· {formatCompactNumber(channel.videoCount)} vidéos</span>}
              {channel.country && <span>· {channel.country}</span>}
              {channel.createdAt && <span>· {channelAge(channel.createdAt)}</span>}
              {perDay != null && <span>· +{formatCompactNumber(perDay)} abonnés/jour</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {channel.trendScore != null && (
                <Badge className={cn(channel.trendScore >= 75 ? "bg-emerald-600 text-white" : "")}>
                  <TrendingUp className="size-3" />
                  Tendance {Math.round(channel.trendScore)}/100
                </Badge>
              )}
              {channel.opportunityScore != null && (
                <Badge variant="secondary">Opportunité {Math.round(channel.opportunityScore)}/100</Badge>
              )}
              {channel.outlierRate != null && (
                <Badge variant="secondary">{Math.round(channel.outlierRate * 100)} % de hits</Badge>
              )}
              {channel.recentRatio != null && channel.recentRatio >= 1.5 && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">
                  <Flame className="size-3" />×{channel.recentRatio.toFixed(1)} sa normale
                </Badge>
              )}
              {data.updatedAt && (
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Mis à jour {ago(data.updatedAt)}
                </Badge>
              )}
              {channel.discoveredAt && <DiscoveredBadge at={channel.discoveredAt} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowSimilar(true)}>
              <Users className="size-4" />
              Chaînes similaires
            </Button>
            <Button variant={tracked ? "secondary" : "default"} onClick={track} disabled={tracked || tracking === "saving"}>
              {tracking === "saving" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : tracked ? (
                <BookmarkCheck className="size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}
              {tracked ? "Suivie" : "Suivre"}
            </Button>
            <SaveToFolderMenu
              item={{
                type: "channel",
                id: channel.id,
                snapshot: {
                  title: channel.name,
                  thumbnail: channel.avatar,
                  handle: channel.handle,
                  subscribers: channel.subscribers,
                },
              }}
            />
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`https://www.youtube.com/channel/${channel.id}`} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="size-4" />
              YouTube
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Abonnés"
            icon={<Users />}
            value={channel.subscribers != null ? formatCompactNumber(channel.subscribers) : "Masqués"}
            delta={kpis.subs24h}
            footer={kpis.subs24h != null ? "sur les dernières 24 h" : "Évolution 24 h dispo demain"}
          />
          <KpiCard
            label="Vues totales"
            icon={<Eye />}
            value={channel.totalViews != null ? formatCompactNumber(channel.totalViews) : "—"}
            delta={kpis.views24h}
            footer={kpis.views24h != null ? "sur les dernières 24 h" : "Évolution 24 h dispo demain"}
          />
          <KpiCard
            label="Vues · 48 h"
            icon={<Activity />}
            value={formatCompactNumber(kpis.views48h)}
            footer="gagnées par les vidéos suivies"
          />
          <KpiCard
            label="Vues des vidéos · 7 j"
            icon={<Video />}
            value={formatCompactNumber(kpis.views7d)}
            footer={`${kpis.uploads30d} vidéo${kpis.uploads30d > 1 ? "s" : ""} publiée${kpis.uploads30d > 1 ? "s" : ""} en 30 j`}
          />
          <KpiCard
            label="Normale par vidéo"
            icon={<Sparkles />}
            value={kpis.medianLong != null ? formatCompactNumber(kpis.medianLong) : "—"}
            footer={kpis.medianShort != null ? `Shorts : ${formatCompactNumber(kpis.medianShort)}` : "médiane des vidéos longues"}
          />
          <KpiCard
            label="Outliers · 30 j"
            icon={<Flame />}
            value={String(kpis.outliers30d)}
            footer={kpis.engagement30d != null ? `Engagement ${(kpis.engagement30d * 100).toFixed(1)} %` : "vidéos ≥ 3x la normale"}
          />
        </div>

        <RevenueCard revenue={data.revenue} />

        {/* Charts */}
        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle>Temps réel</CardTitle>
              <CardDescription>Vues gagnées par heure sur 48 h (vidéos suivies par le scanner)</CardDescription>
              <CardAction>
                <span className="text-xl font-semibold tabular-nums">{formatCompactNumber(kpis.views48h)}</span>
              </CardAction>
            </CardHeader>
            <CardContent>
              {kpis.views48h > 0 ? (
                <RealtimeBars data={data.hourly} height={220} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Les barres apparaissent après deux relevés des vidéos récentes (environ 1 h).
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance des vidéos</CardTitle>
              <CardDescription>
                Vues des {chartVideos.length} dernières {format === "short" ? "Shorts" : "vidéos longues"} · en vert : 3x la
                normale et plus. Clique sur une barre pour ouvrir la vidéo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartVideos.length > 0 ? (
                <VideoPerformanceChart videos={chartVideos} median={median} onSelect={setOpenVideo} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">Aucune vidéo pour ce format.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Videos */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Vidéos</h3>
              <span className="text-sm text-muted-foreground">{videos.length} dans la base</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs
                value={format}
                onValueChange={(v) => {
                  setFormat(String(v));
                  setVisible(PAGE);
                }}
              >
                <TabsList>
                  <TabsTrigger value="all">Toutes</TabsTrigger>
                  <TabsTrigger value="long">Longues</TabsTrigger>
                  <TabsTrigger value="short">Shorts</TabsTrigger>
                </TabsList>
              </Tabs>
              <FilterSelect value={sort} options={SORT_OPTIONS} onChange={setSort} className="w-auto" />
            </div>
          </div>

          {videos.length === 0 ? (
            <EmptyState title="Aucune vidéo" description="Le scanner n'a pas encore collecté de vidéo pour ce format." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {videos.slice(0, visible).map((video) => (
                  <ChannelVideoCard key={video.id} video={video} channel={channel} onOpen={() => setOpenVideo(video.id)} />
                ))}
              </div>
              {visible < videos.length && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setVisible((n) => n + PAGE)}>
                    Afficher plus
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <VideoDialog videoId={openVideo} onOpenChange={(open) => !open && setOpenVideo(null)} />
      <SimilarChannelsSheet
        channel={showSimilar ? { id: channel.id, name: channel.name } : null}
        onOpenChange={(open) => setShowSimilar(open)}
      />
    </div>
  );
}

function KpiCard({
  label,
  icon,
  value,
  delta,
  footer,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  delta?: number | null;
  footer: string;
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 [&_svg]:size-3.5">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        {delta != null && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn(delta >= 0 ? "border-emerald-500/30 text-emerald-700" : "border-rose-500/30 text-rose-700")}
            >
              {signed(delta)}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="text-xs text-muted-foreground">{footer}</CardFooter>
    </Card>
  );
}

function videoItem(video: ChannelVideo, channel: ChannelData["channel"]): SavedItemInput {
  return {
    type: "video",
    id: video.id,
    snapshot: {
      title: video.title,
      thumbnail: video.thumbnail,
      channelId: channel.id,
      channelName: channel.name,
      views: video.views,
      multiplier: video.multiplier,
      publishedAt: video.publishedAt,
      isShort: video.isShort,
    },
  };
}

function ChannelVideoCard({ video, channel, onOpen }: { video: ChannelVideo; channel: ChannelData["channel"]; onOpen: () => void }) {
  return (
    <Card className="group cursor-pointer gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md" onClick={onOpen}>
      <div className="relative aspect-video overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {video.multiplier != null && video.multiplier >= 1 && (
          <span
            className={cn(
              "absolute top-2 left-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold shadow-sm",
              video.multiplier >= 3 ? "bg-emerald-600 text-white" : "bg-white/90 text-slate-900",
            )}
          >
            <Flame className="size-3" />
            {video.multiplier.toFixed(1)}x
          </span>
        )}
        {video.abTest && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-violet-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
            <FlaskConical className="size-3" />
            A/B
          </span>
        )}
        {video.duration && (
          <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white">
            {video.duration}
          </span>
        )}
        {/* Stop clicks (also those inside the portaled menu) from opening the video dialog. */}
        <div
          className="absolute bottom-2 left-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-data-[popup-open]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <SaveToFolderMenu variant="overlay" item={videoItem(video, channel)} />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm leading-snug font-medium">{video.title}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatCompactNumber(video.views)} vues · {ago(video.publishedAt)}
          </span>
          <Badge variant="outline" className="font-normal">
            {video.isShort ? "Short" : "Longue"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
