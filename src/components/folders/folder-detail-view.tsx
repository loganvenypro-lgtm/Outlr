"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Eye, Flame, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, ExplorerHeader } from "@/components/explorer/explorer-ui";
import { cn, formatCompactNumber } from "@/lib/utils";
import { FOLDERS_CHANGED_EVENT, type SavedItem } from "@/lib/saved-folders";
import { FolderActionsMenu } from "./folder-actions-menu";
import { removeFromFolder } from "./folders-client";

interface FolderData {
  folder: { id: string; name: string; createdAt: string; updatedAt: string };
  items: SavedItem[];
}

/** /folders/[folderId]: the videos and channels saved in one folder. */
export function FolderDetailView({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<FolderData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "video" | "channel">("all");

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/folders/${encodeURIComponent(folderId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Impossible de charger le dossier.");
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger le dossier.");
      }
    };
    load();
    window.addEventListener(FOLDERS_CHANGED_EVENT, load);
    return () => window.removeEventListener(FOLDERS_CHANGED_EVENT, load);
  }, [folderId]);

  const remove = async (item: SavedItem) => {
    setData((prev) => prev && { ...prev, items: prev.items.filter((i) => !(i.type === item.type && i.id === item.id)) });
    try {
      await removeFromFolder(folderId, item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer cet élément.");
    }
  };

  const items = data?.items.filter((i) => filter === "all" || i.type === filter) ?? [];
  const videoCount = data?.items.filter((i) => i.type === "video").length ?? 0;
  const channelCount = (data?.items.length ?? 0) - videoCount;

  return (
    <div className="flex min-h-full flex-col">
      <ExplorerHeader title={data?.folder.name ?? "Dossier"} icon={<Bookmark className="size-4 text-muted-foreground" />} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          nativeButton={false}
          render={<Link href="/folders" />}
        >
          <ArrowLeft className="size-4" />
          Mes dossiers
        </Button>

        {error && !data && <EmptyState title="Impossible de charger le dossier" description={error} />}

        {!data && !error && (
          <>
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-60" />
              ))}
            </div>
          </>
        )}

        {data && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-2xl font-semibold tracking-tight">{data.folder.name}</h2>
                <FolderActionsMenu folder={data.folder} onDeleted={() => router.push("/folders")} />
              </div>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList>
                  <TabsTrigger value="all">Tout ({data.items.length})</TabsTrigger>
                  <TabsTrigger value="video">Vidéos ({videoCount})</TabsTrigger>
                  <TabsTrigger value="channel">Chaînes ({channelCount})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {items.length === 0 ? (
              <EmptyState
                title={data.items.length === 0 ? "Ce dossier est vide" : "Rien dans cette catégorie"}
                description="Utilise le bouton « Enregistrer » sur une carte vidéo ou une page chaîne pour l'ajouter ici."
              >
                <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
                  Explorer les vidéos virales
                </Button>
              </EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) =>
                  item.type === "video" ? (
                    <SavedVideoCard key={`v-${item.id}`} item={item} onRemove={() => remove(item)} />
                  ) : (
                    <SavedChannelCard key={`c-${item.id}`} item={item} onRemove={() => remove(item)} />
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RemoveButton({ onRemove, label }: { onRemove: () => void; label: string }) {
  return (
    <Button
      variant="secondary"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onRemove}
      className="absolute top-2 right-2 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    >
      <X />
    </Button>
  );
}

function SavedVideoCard({ item, onRemove }: { item: SavedItem; onRemove: () => void }) {
  const s = item.snapshot;
  const url = `https://www.youtube.com/watch?v=${item.id}`;
  return (
    <Card className="group relative gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md">
      <a href={url} target="_blank" rel="noopener noreferrer" className="relative block aspect-video overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {s.multiplier != null && s.multiplier >= 1 && (
          <span
            className={cn(
              "absolute top-2 left-2 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold shadow-sm",
              s.multiplier >= 3 ? "bg-emerald-600 text-white" : "bg-white/90 text-slate-900",
            )}
          >
            <Flame className="size-3" />
            {s.multiplier.toFixed(1)}x
          </span>
        )}
      </a>
      <RemoveButton onRemove={onRemove} label="Retirer du dossier" />
      <div className="flex flex-col gap-2 p-3.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm leading-snug font-medium hover:underline"
          title={s.title}
        >
          {s.title}
        </a>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {s.channelId ? (
            <Link href={`/channel/${s.channelId}`} className="truncate hover:text-foreground hover:underline">
              {s.channelName ?? "Chaîne"}
            </Link>
          ) : (
            <span className="truncate">{s.channelName}</span>
          )}
          <span className="flex shrink-0 items-center gap-2">
            {s.views != null && (
              <span className="flex items-center gap-1 tabular-nums">
                <Eye className="size-3" />
                {formatCompactNumber(s.views)}
              </span>
            )}
            {s.isShort != null && (
              <Badge variant="outline" className="font-normal">
                {s.isShort ? "Short" : "Longue"}
              </Badge>
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}

function SavedChannelCard({ item, onRemove }: { item: SavedItem; onRemove: () => void }) {
  const s = item.snapshot;
  return (
    <Card className="group relative gap-0 p-0 transition-shadow hover:shadow-md">
      <Link href={`/channel/${item.id}`} className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <Avatar className="size-16">
          {s.thumbnail && <AvatarImage src={s.thumbnail} alt="" />}
          <AvatarFallback className="text-lg">{s.title.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate font-medium">{s.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[s.handle, s.subscribers != null ? `${formatCompactNumber(s.subscribers)} abonnés` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Badge variant="secondary">Chaîne</Badge>
      </Link>
      <RemoveButton onRemove={onRemove} label="Retirer du dossier" />
    </Card>
  );
}
