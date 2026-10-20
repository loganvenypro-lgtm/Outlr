"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Compass, Flame, House, Sparkles, TrendingUp, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  ExplorerHeader,
  SessionExpiredError,
  SessionExpiredState,
  fetchJson,
} from "@/components/explorer/explorer-ui";
import { OutlierCard, type OutlierVideo } from "@/components/outliers/outlier-card";
import { cn, formatCompactNumber } from "@/lib/utils";

interface HomeData {
  userName: string;
  myChannelId: string | null;
  myChannel: {
    id: string;
    name: string;
    handle: string | null;
    avatar: string | null;
    subscribers: number | null;
    totalViews: number | null;
    trendScore: number | null;
    recentRatio: number | null;
    outlierRate: number | null;
    uploads30d: number;
    subs24h: number | null;
    views24h: number | null;
    latestVideo: OutlierVideo | null;
    bestRecentVideo: OutlierVideo | null;
  } | null;
  niche: { keywords: string[]; category: number | null; language: string | null };
  forYou: OutlierVideo[];
  competitors: {
    id: string;
    name: string;
    handle: string | null;
    avatar: string | null;
    subscribers: number | null;
    trendScore: number | null;
    recentRatio: number | null;
    bestVideo: { id: string; title: string; views: number; multiplier: number | null; publishedAt: string } | null;
  }[];
  competitorHits: OutlierVideo[];
  updatedAt: string | null;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Bonne nuit";
  if (hour < 18) return "Bonjour";
  return "Bonsoir";
}

function ago(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${Math.round(hours)} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${formatCompactNumber(Math.abs(n))}`;

export function HomeView() {
  const [result, setResult] = useState<{ data?: HomeData; error?: Error } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<HomeData>("/api/home")
      .then((data) => !cancelled && setResult({ data }))
      .catch((error: Error) => !cancelled && setResult({ error }));
    return () => {
      cancelled = true;
    };
  }, []);

  const data = result?.data;

  return (
    <div className="flex min-h-full flex-col">
      <ExplorerHeader title="Accueil" icon={<House className="size-4 text-muted-foreground" />} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 py-6 md:px-6">
        {result?.error ? (
          result.error instanceof SessionExpiredError ? (
            <SessionExpiredState />
          ) : (
            <EmptyState title="Impossible de charger l'accueil" description={result.error.message} />
          )
        ) : !data ? (
          <HomeSkeleton />
        ) : (
          <>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {greeting()} {data.userName.split(" ")[0]}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {data.myChannel
                    ? "Voici ce qui marche dans ta niche en ce moment."
                    : "Voici les vidéos qui explosent en ce moment."}
                </p>
              </div>
              {data.updatedAt && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Données mises à jour {ago(data.updatedAt)}
                </span>
              )}
            </div>

            {data.myChannel ? <MyChannelCard channel={data.myChannel} /> : <ConnectChannelCard />}

            <section className="flex flex-col gap-4">
              <SectionTitle
                icon={<Sparkles />}
                title={data.myChannel ? "Vidéos qui explosent dans ta niche" : "Vidéos qui explosent cette semaine"}
                description="Les vidéos les plus pertinentes des 7 derniers jours"
                href={data.niche.keywords[0] ? `/dashboard?q=${encodeURIComponent(data.niche.keywords[0])}` : "/dashboard"}
              />
              {data.niche.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.niche.keywords.slice(0, 8).map((k) => (
                    <Badge key={k} variant="secondary" className="font-normal" render={<Link href={`/dashboard?q=${encodeURIComponent(k)}`} />}>
                      {k}
                    </Badge>
                  ))}
                </div>
              )}
              {data.forYou.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {data.forYou.map((video) => (
                    <OutlierCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Pas encore de vidéo pour ta niche"
                  description="Le scanner découvre de nouvelles chaînes toutes les 6 h : reviens un peu plus tard."
                />
              )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_1.6fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    Tes concurrents
                  </CardTitle>
                  <CardDescription>Classés par score de tendance</CardDescription>
                  <CardAction>
                    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/tracking" />}>
                      Gérer
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {data.competitors.length === 0 ? (
                    <div className="flex flex-col items-start gap-3 py-4 text-sm text-muted-foreground">
                      Tu ne suis encore aucune chaîne.
                      <Button size="sm" nativeButton={false} render={<Link href="/channel-finder" />}>
                        <Compass className="size-4" />
                        Trouver des chaînes à suivre
                      </Button>
                    </div>
                  ) : (
                    data.competitors.map((c) => (
                      <Link
                        key={c.id}
                        href={`/channel/${c.id}`}
                        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                      >
                        <Avatar className="size-9">
                          {c.avatar && <AvatarImage src={c.avatar} alt="" />}
                          <AvatarFallback>{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">{c.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {c.bestVideo
                              ? `${c.bestVideo.multiplier != null ? `${c.bestVideo.multiplier.toFixed(1)}x · ` : ""}${c.bestVideo.title}`
                              : `${c.subscribers != null ? formatCompactNumber(c.subscribers) : "—"} abonnés`}
                          </span>
                        </div>
                        {c.trendScore != null && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 tabular-nums",
                              c.trendScore >= 75 && "border-emerald-500/40 text-emerald-700",
                            )}
                          >
                            {Math.round(c.trendScore)}
                          </Badge>
                        )}
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-4">
                <SectionTitle
                  icon={<Flame />}
                  title="Leurs vidéos qui cartonnent"
                  description="Les vidéos de tes concurrents à 2x leur normale ou plus (14 derniers jours)"
                />
                {data.competitorHits.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {data.competitorHits.map((video) => (
                      <OutlierCard key={video.id} video={video} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Rien de spécial chez tes concurrents"
                    description="Aucune de leurs vidéos récentes ne dépasse 2x leur normale pour l'instant."
                  />
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold [&_svg]:size-4 [&_svg]:text-muted-foreground">
          {icon}
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {href && (
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={href} />}>
          Voir tout
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

function MyChannelCard({ channel }: { channel: NonNullable<HomeData["myChannel"]> }) {
  const metrics = [
    {
      label: "Abonnés",
      value: channel.subscribers != null ? formatCompactNumber(channel.subscribers) : "—",
      delta: channel.subs24h,
    },
    { label: "Vues · 24 h", value: channel.views24h != null ? signed(channel.views24h) : "—" },
    { label: "Vidéos · 30 j", value: String(channel.uploads30d) },
    {
      label: "Taux de hits",
      value: channel.outlierRate != null ? `${Math.round(channel.outlierRate * 100)} %` : "—",
    },
    { label: "Tendance", value: channel.trendScore != null ? `${Math.round(channel.trendScore)}/100` : "—" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            {channel.avatar && <AvatarImage src={channel.avatar} alt="" />}
            <AvatarFallback>{channel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardDescription>Ma chaîne</CardDescription>
            <CardTitle className="truncate text-lg">{channel.name}</CardTitle>
          </div>
        </div>
        <CardAction>
          <Button nativeButton={false} render={<Link href={`/channel/${channel.id}`} />}>
            <BarChart3 className="size-4" />
            Analyser
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span className="flex items-baseline gap-1.5 text-xl font-semibold tabular-nums">
                {m.value}
                {m.delta != null && (
                  <span className={cn("text-xs font-medium", m.delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {signed(m.delta)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
        {(channel.latestVideo || channel.bestRecentVideo) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {channel.latestVideo && <MiniVideo label="Dernière vidéo" video={channel.latestVideo} />}
            {channel.bestRecentVideo && channel.bestRecentVideo.id !== channel.latestVideo?.id && (
              <MiniVideo label="Meilleure vidéo · 30 j" video={channel.bestRecentVideo} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniVideo({ label, video }: { label: string; video: OutlierVideo }) {
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-lg border p-2 transition-colors hover:bg-muted"
    >
      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.thumbnail} alt="" className="size-full object-cover" />
        {video.multiplier != null && video.multiplier >= 1 && (
          <span
            className={cn(
              "absolute top-1 left-1 rounded px-1 text-[10px] font-semibold text-white",
              video.multiplier >= 3 ? "bg-emerald-600" : "bg-black/70",
            )}
          >
            {video.multiplier.toFixed(1)}x
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="line-clamp-2 text-sm font-medium">{video.title}</span>
        <span className="text-xs text-muted-foreground">
          {formatCompactNumber(video.views)} vues · {ago(video.publishedAt)}
        </span>
      </div>
    </a>
  );
}

function ConnectChannelCard() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" />
          Connecte ta chaîne
        </CardTitle>
        <CardDescription>
          Ajoute ta chaîne YouTube pour voir tes stats ici et recevoir des idées de vidéos adaptées à ta niche.
        </CardDescription>
        <CardAction>
          <Button nativeButton={false} render={<Link href="/onboarding" />}>
            Connecter
            <ArrowRight className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}
