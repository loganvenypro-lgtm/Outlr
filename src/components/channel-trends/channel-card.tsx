"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Flame, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn, formatCompactNumber } from "@/lib/utils";
import { CATEGORY_LABELS, LANGUAGE_LABELS } from "@/components/outliers/filter-options";

export interface TrendChannel {
  id: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  subscribers: number | null;
  country: string | null;
  categoryId: number | null;
  language: string | null;
  isShortsChannel: boolean;
  views24h: number | null;
  viewsPrev24h: number | null;
  subs24h: number | null;
  views7d: number;
  uploads7d: number;
  outliers30d: number;
  bestMultiplier: number | null;
  videos: {
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    multiplier: number | null;
    publishedAt: string;
    isShort: boolean;
  }[];
}

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "aujourd'hui";
  if (days < 30) return `il y a ${days} j`;
  return `il y a ${Math.round(days / 30)} mois`;
}

function signed(n: number): string {
  return `${n >= 0 ? "+" : "−"}${formatCompactNumber(Math.abs(n))}`;
}

export function ChannelCard({ channel, rank }: { channel: TrendChannel; rank: number }) {
  const [tracking, setTracking] = useState<"idle" | "saving" | "saved">("idle");
  const language = channel.language ?? null;
  const hasDaily = channel.views24h != null;
  const dayChange =
    hasDaily && channel.viewsPrev24h != null && channel.viewsPrev24h > 0
      ? ((channel.views24h! - channel.viewsPrev24h) / channel.viewsPrev24h) * 100
      : null;

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
          },
        }),
      });
      setTracking(res.ok ? "saved" : "idle");
    } catch {
      setTracking("idle");
    }
  };

  return (
    <Card className="gap-4 p-4">
      <div className="flex items-start gap-3">
        <span className="pt-1 text-xl font-semibold text-muted-foreground tabular-nums">#{rank}</span>
        <Avatar className="size-10">
          {channel.avatar && <AvatarImage src={channel.avatar} alt="" />}
          <AvatarFallback>{channel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <a
            href={`https://www.youtube.com/channel/${channel.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 truncate font-medium hover:underline"
          >
            <span className="truncate">{channel.name}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{channel.subscribers != null ? `${formatCompactNumber(channel.subscribers)} abonnés` : "abonnés masqués"}</span>
            {language && <span>· {LANGUAGE_LABELS[language] ?? language.toUpperCase()}</span>}
            {channel.country && <span>· {channel.country}</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{channel.isShortsChannel ? "Shorts" : "Vidéos longues"}</Badge>
            {channel.categoryId != null && CATEGORY_LABELS[channel.categoryId] && (
              <Badge variant="secondary">{CATEGORY_LABELS[channel.categoryId]}</Badge>
            )}
          </div>
        </div>
      </div>

      {channel.videos.length > 0 && (
        <ScrollArea className="-mx-1 w-[calc(100%+0.5rem)]">
          <div className="flex gap-3 px-1 pb-3">
            {channel.videos.map((video) => (
              <a
                key={video.id}
                href={`https://www.youtube.com/watch?v=${video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-44 shrink-0 flex-col gap-1.5"
              >
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                  {video.multiplier != null && video.multiplier >= 1 && (
                    <span
                      className={cn(
                        "absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold",
                        video.multiplier >= 3 ? "bg-emerald-600 text-white" : "bg-black/70 text-white",
                      )}
                    >
                      <Flame className="size-2.5" />
                      {video.multiplier.toFixed(1)}x
                    </span>
                  )}
                </div>
                <span className="line-clamp-1 text-xs font-medium group-hover:underline">{video.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {formatCompactNumber(video.views)} vues · {ago(video.publishedAt)}
                </span>
              </a>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <div className="flex items-end justify-between gap-4 border-t pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-semibold text-emerald-600 tabular-nums">
            {hasDaily ? signed(channel.views24h!) : signed(channel.views7d)}
          </span>
          <span className="text-xs text-muted-foreground">
            {hasDaily ? "Vues · 24 h" : "Vues des vidéos · 7 j"}
          </span>
          {dayChange != null && (
            <Badge
              variant="secondary"
              className={cn(
                "w-fit gap-1",
                dayChange >= 0 ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700",
              )}
            >
              {dayChange >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {dayChange >= 0 ? "+" : ""}
              {dayChange.toFixed(0)} % vs veille
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <Metric value={String(channel.uploads7d)} label="Vidéos · 7 j" />
          <Metric value={String(channel.outliers30d)} label="Outliers · 30 j" />
          <Metric value={channel.subs24h != null ? signed(channel.subs24h) : "—"} label="Abonnés · 24 h" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={track} disabled={tracking !== "idle"}>
          {tracking === "saving" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : tracking === "saved" ? (
            <BookmarkCheck className="size-4" />
          ) : (
            <Bookmark className="size-4" />
          )}
          {tracking === "saved" ? "Suivie" : "Suivre"}
        </Button>
        <Button
          variant="ghost"
          nativeButton={false}
          render={<a href={`https://www.youtube.com/channel/${channel.id}`} target="_blank" rel="noopener noreferrer" />}
        >
          <ExternalLink className="size-4" />
          YouTube
        </Button>
      </div>
    </Card>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] whitespace-nowrap text-muted-foreground">{label}</span>
    </div>
  );
}
