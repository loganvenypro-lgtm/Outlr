"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  FlaskConical,
  ImageIcon,
  MessageCircle,
  Sparkles,
  ThumbsUp,
  Type,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LABELS, LANGUAGE_LABELS } from "@/components/outliers/filter-options";
import { fetchJson } from "@/components/explorer/explorer-ui";
import { cn, formatCompactNumber } from "@/lib/utils";
import { RealtimeBars } from "./charts";

interface VideoDetail {
  video: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    fallbackThumbnail: string;
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
    language: string | null;
    tags: string[];
    views24h: number | null;
    lastStatsAt: string | null;
    channel: { id: string; name: string; handle: string | null; avatar: string | null; subscribers: number | null };
  };
  series: { at: string; gained: number; perHour: number; total: number }[];
  variants: {
    titles: { value: string; firstSeenAt: string; lastSeenAt: string }[];
    thumbnails: { setAt: string | null; firstSeenAt: string; lastSeenAt: string }[];
    thumbnailChangedAfterUpload: boolean;
  };
  similar: {
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    multiplier: number | null;
    publishedAt: string;
    isShort: boolean;
    duration: string | null;
    channelName: string;
    channelSubscribers: number | null;
  }[];
}

const fullDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function ago(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return "il y a moins d'1 h";
  if (hours < 24) return `il y a ${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return days < 30 ? `il y a ${days} j` : `il y a ${Math.round(days / 30)} mois`;
}

export function VideoDialog({ videoId, onOpenChange }: { videoId: string | null; onOpenChange: (open: boolean) => void }) {
  const [currentId, setCurrentId] = useState<string | null>(videoId);
  const [result, setResult] = useState<{ id: string; data?: VideoDetail; error?: string } | null>(null);

  // Opening another video from the parent resets the dialog to it.
  const [lastPropId, setLastPropId] = useState(videoId);
  if (videoId !== lastPropId) {
    setLastPropId(videoId);
    setCurrentId(videoId);
  }

  useEffect(() => {
    if (!currentId) return;
    let cancelled = false;
    fetchJson<VideoDetail>(`/api/videos/${currentId}`)
      .then((data) => !cancelled && setResult({ id: currentId, data }))
      .catch((err: Error) => !cancelled && setResult({ id: currentId, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  const loaded = result?.id === currentId ? result : null;
  const detail = loaded?.data;

  return (
    <Dialog open={videoId != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        {loaded?.error ? (
          <DialogHeader>
            <DialogTitle>Impossible de charger la vidéo</DialogTitle>
            <DialogDescription>{loaded.error}</DialogDescription>
          </DialogHeader>
        ) : !detail ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Chargement de la vidéo</DialogTitle>
            </DialogHeader>
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <VideoDetailBody detail={detail} onOpenSimilar={setCurrentId} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VideoDetailBody({ detail, onOpenSimilar }: { detail: VideoDetail; onOpenSimilar: (id: string) => void }) {
  const { video, series, variants, similar } = detail;
  const [thumb, setThumb] = useState(video.thumbnail);
  const language = video.language?.split("-")[0].toLowerCase();
  const engagement =
    video.views > 0 && video.likes != null ? ((video.likes + (video.comments ?? 0)) / video.views) * 100 : null;
  const usualViews = video.multiplier && video.multiplier > 0 ? video.views / video.multiplier : null;
  const hasAbSignal =
    variants.titles.length > 1 || variants.thumbnails.length > 1 || variants.thumbnailChangedAfterUpload;

  const bars = series.map((s) => ({ hour: s.at, views: s.perHour }));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <a
          href={`https://www.youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-video overflow-hidden rounded-xl bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="size-full object-cover" onError={() => setThumb(video.fallbackThumbnail)} />
          {video.duration && (
            <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
              {video.duration}
            </span>
          )}
        </a>

        <div className="flex min-w-0 flex-col gap-3">
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg leading-snug">{video.title}</DialogTitle>
            <DialogDescription render={<div />} className="flex items-center gap-2">
              <Avatar className="size-6">
                {video.channel.avatar && <AvatarImage src={video.channel.avatar} alt="" />}
                <AvatarFallback className="text-[10px]">{video.channel.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{video.channel.name}</span>
              {video.channel.subscribers != null && (
                <span>· {formatCompactNumber(video.channel.subscribers)} abonnés</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{video.isShort ? "Short" : "Vidéo longue"}</Badge>
            {video.categoryId != null && CATEGORY_LABELS[video.categoryId] && (
              <Badge variant="secondary">{CATEGORY_LABELS[video.categoryId]}</Badge>
            )}
            {language && <Badge variant="outline">{LANGUAGE_LABELS[language] ?? language.toUpperCase()}</Badge>}
            {video.score != null && <Badge>{Math.round(video.score)}/100</Badge>}
            {hasAbSignal && (
              <Badge className="gap-1 bg-violet-600 text-white">
                <FlaskConical className="size-3" />
                Test A/B détecté
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              Publiée le {fullDate(video.publishedAt)} ({ago(video.publishedAt)})
            </span>
            {video.lastStatsAt && (
              <span className="flex items-center gap-2">
                <Clock className="size-4" />
                Stats relevées {ago(video.lastStatsAt)}
              </span>
            )}
          </div>
          <div className="mt-auto flex gap-2">
            <Button
              nativeButton={false}
              render={<a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="size-4" />
              Voir sur YouTube
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Eye />} label="Vues" value={formatCompactNumber(video.views)} />
        <StatTile
          icon={<Zap />}
          label="Vues · 24 h"
          value={video.views24h != null ? `+${formatCompactNumber(video.views24h)}` : "—"}
          highlight
        />
        <StatTile
          icon={<Flame />}
          label="Multiplicateur"
          value={video.multiplier != null ? `${video.multiplier.toFixed(1)}x` : "—"}
          hint={usualViews != null ? `normale : ${formatCompactNumber(usualViews)}` : undefined}
        />
        <StatTile
          icon={<Sparkles />}
          label="Vues / heure"
          value={video.viewsPerHour != null ? formatCompactNumber(video.viewsPerHour) : "—"}
        />
        <StatTile icon={<ThumbsUp />} label="Likes" value={video.likes != null ? formatCompactNumber(video.likes) : "masqués"} />
        <StatTile
          icon={<MessageCircle />}
          label="Commentaires"
          value={video.comments != null ? formatCompactNumber(video.comments) : "désactivés"}
        />
        <StatTile icon={<Sparkles />} label="Engagement" value={engagement != null ? `${engagement.toFixed(1)} %` : "—"} />
        <StatTile icon={<CalendarDays />} label="Âge" value={ago(video.publishedAt).replace("il y a ", "")} />
      </div>

      <Tabs defaultValue="realtime">
        <TabsList className="w-full overflow-x-auto sm:w-fit">
          <TabsTrigger value="realtime">Temps réel</TabsTrigger>
          <TabsTrigger value="ab">
            Test A/B
            {hasAbSignal && <span className="size-1.5 rounded-full bg-violet-600" />}
          </TabsTrigger>
          <TabsTrigger value="similar">Vidéos similaires</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="pt-3">
          <Card className="gap-3 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Vues par heure</p>
                <p className="text-xs text-muted-foreground">Calculé entre chaque relevé du scanner</p>
              </div>
              {video.views24h != null && (
                <div className="text-right">
                  <p className="text-xl font-semibold tabular-nums">+{formatCompactNumber(video.views24h)}</p>
                  <p className="text-xs text-muted-foreground">sur 24 h</p>
                </div>
              )}
            </div>
            {bars.length >= 1 ? (
              <RealtimeBars data={bars} height={200} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Historique en cours de collecte : la courbe apparaît après le prochain relevé (vidéos récentes : toutes les
                heures).
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ab" className="flex flex-col gap-3 pt-3">
          <Card className="gap-3 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Type className="size-4 text-muted-foreground" />
              Titres observés
            </p>
            {variants.titles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas encore relevé par le scanner.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {variants.titles.map((t, i) => (
                  <li key={t.value} className="flex flex-col gap-0.5 rounded-lg border p-2.5">
                    <span className="text-sm font-medium">
                      {variants.titles.length > 1 && <span className="mr-1.5 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>}
                      {t.value}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Vu du {fullDate(t.firstSeenAt)} au {fullDate(t.lastSeenAt)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card className="gap-3 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="size-4 text-muted-foreground" />
              Miniatures
            </p>
            {variants.thumbnails.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Pas encore vérifiée (les vidéos récentes et pertinentes sont vérifiées toutes les 3 h).
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {variants.thumbnails.map((t, i) => (
                  <li key={t.firstSeenAt + i} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                    <span>
                      Miniature {String.fromCharCode(65 + i)}
                      {i === variants.thumbnails.length - 1 && <Badge variant="secondary" className="ml-2">Actuelle</Badge>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.setAt ? `Mise en ligne le ${fullDate(t.setAt)}` : `Vue le ${fullDate(t.firstSeenAt)}`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {variants.thumbnailChangedAfterUpload && (
              <p className="rounded-lg bg-violet-500/10 p-2.5 text-xs text-violet-700">
                La miniature actuelle a été posée plus de 2 h après la publication : elle a été changée (ou un test A/B
                YouTube a désigné un gagnant).
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              YouTube ne publie pas les résultats de « Tester et comparer ». Outlr détecte chaque changement de titre et de
              miniature et sa date ; les anciennes miniatures ne sont pas conservées.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="similar" className="pt-3">
          {similar.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune vidéo similaire dans la base.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {similar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpenSimilar(s.id)}
                  className="flex gap-3 rounded-lg border p-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.thumbnail} alt="" loading="lazy" className="size-full object-cover" />
                    {s.multiplier != null && s.multiplier >= 1 && (
                      <span
                        className={cn(
                          "absolute top-1 left-1 rounded px-1 text-[10px] font-semibold text-white",
                          s.multiplier >= 3 ? "bg-emerald-600" : "bg-black/70",
                        )}
                      >
                        {s.multiplier.toFixed(1)}x
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="line-clamp-2 text-sm font-medium">{s.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{s.channelName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatCompactNumber(s.views)} vues · {ago(s.publishedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="details" className="flex flex-col gap-3 pt-3">
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.tags.slice(0, 30).map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {video.description || "Pas de description."}
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border p-3", highlight && "border-emerald-500/30 bg-emerald-500/5")}>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className={cn("text-lg font-semibold tabular-nums", highlight && "text-emerald-700")}>{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
