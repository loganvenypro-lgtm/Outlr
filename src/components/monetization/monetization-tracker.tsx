"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  BookmarkCheck,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Eye,
  Globe,
  LayoutGrid,
  Loader2,
  Search,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ActiveFilters,
  EmptyState,
  ExplorerHeader,
  FilterSelect,
  ResultsBar,
  SessionExpiredError,
  SessionExpiredState,
  TopicChips,
  fetchJson,
  type ActiveChip,
  type Option,
} from "@/components/explorer/explorer-ui";
import { CATEGORY_LABELS, CATEGORY_OPTIONS, LANGUAGE_LABELS, SUBS_OPTIONS } from "@/components/outliers/filter-options";
import { DiscoveredBadge, ago } from "@/components/channel-trends/channel-card";
import { SimilarChannelsSheet } from "@/components/channel-trends/similar-channels-sheet";
import { cn, formatCompactNumber } from "@/lib/utils";

type Key = "q" | "change" | "period" | "category" | "language" | "subs" | "sort";
type Filters = Record<Key, string>;

const DEFAULTS: Filters = {
  q: "",
  change: "all",
  period: "all",
  category: "all",
  language: "all",
  subs: "all",
  sort: "lastChange",
};

const CHANGE_OPTIONS = [
  { value: "all", label: "Tous les changements" },
  { value: "demonetized", label: "Démonétisées" },
  { value: "monetized", label: "Monétisées" },
];

const PERIOD_OPTIONS = [
  { value: "24h", label: "24 h" },
  { value: "7d", label: "7 j" },
  { value: "30d", label: "30 j" },
  { value: "90d", label: "90 j" },
  { value: "all", label: "Tout" },
];

const SORT_OPTIONS: Option[] = [
  { value: "lastChange", label: "Dernier changement" },
  { value: "subscribers", label: "Abonnés" },
  { value: "avgViews", label: "Vues moyennes" },
  { value: "views48h", label: "Vues · 48 h" },
];

const TOPICS: { label: string; filters: Partial<Filters> }[] = [
  { label: "Démonétisées cette semaine", filters: { change: "demonetized", period: "7d" } },
  { label: "Monétisées cette semaine", filters: { change: "monetized", period: "7d" } },
  { label: "Gaming", filters: { category: "20" } },
  { label: "Éducation", filters: { category: "27" } },
  { label: "Divertissement", filters: { category: "24" } },
  { label: "Petites chaînes", filters: { subs: "micro" } },
];

interface TrackerChannel {
  id: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  subscribers: number | null;
  videoCount: number | null;
  country: string | null;
  categoryId: number | null;
  language: string | null;
  createdAt: string | null;
  discoveredAt: string | null;
  avgViews: number | null;
  views48h: number | null;
  monetizedNow: boolean | null;
  change: { monetized: boolean; from: string | null; to: string };
  videos: {
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    multiplier: number | null;
    duration: string | null;
    publishedAt: string;
  }[];
}

interface ApiResponse {
  items: TrackerChannel[];
  total: number;
  page: number;
  hasMore: boolean;
  languages: { code: string; count: number }[];
  status: { checked: number; monetized: number; notMonetized: number; lastCheckedAt: string | null };
}

function toApiParams(filters: Filters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  params.set("change", filters.change);
  params.set("period", filters.period);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.language !== "all") params.set("language", filters.language);
  const subs = SUBS_OPTIONS.find((o) => o.value === filters.subs);
  if (subs?.min != null) params.set("minSubs", String(subs.min));
  if (subs?.max != null) params.set("maxSubs", String(subs.max));
  params.set("sort", filters.sort);
  params.set("page", String(page));
  return params;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** "1 an", "8 mois", "12 j" */
function age(iso: string): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days < 30) return `${days} j`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  const years = Math.round(days / 365);
  return `${years} an${years > 1 ? "s" : ""}`;
}

export function MonetizationTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const next = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS) as Key[]) next[key] = searchParams.get(key) || DEFAULTS[key];
    return next;
  }, [searchParams]);
  const queryKey = toApiParams(filters, 0).toString();

  const [search, setSearch] = useState(filters.q);
  const [result, setResult] = useState<(ApiResponse & { key: string }) | null>(null);
  const [error, setError] = useState<{ key: string; error: Error } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [similarOf, setSimilarOf] = useState<{ id: string; name: string } | null>(null);
  const loading = result?.key !== queryKey && error?.key !== queryKey;

  const update = useCallback(
    (next: Filters) => {
      const params = new URLSearchParams();
      for (const key of Object.keys(DEFAULTS) as Key[]) if (next[key] !== DEFAULTS[key]) params.set(key, next[key]);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );
  const set = (key: Key, value: string) => update({ ...filters, [key]: value });
  const reset = () => {
    setSearch("");
    update({ ...DEFAULTS, sort: filters.sort });
  };

  useEffect(() => {
    if (search === filters.q) return;
    const timer = setTimeout(() => update({ ...filters, q: search.trim() }), 350);
    return () => clearTimeout(timer);
  }, [search, filters, update]);

  useEffect(() => {
    let cancelled = false;
    fetchJson<ApiResponse>(`/api/monetization-tracker?${queryKey}`)
      .then((data) => !cancelled && setResult({ ...data, key: queryKey }))
      .catch((err: Error) => !cancelled && setError({ key: queryKey, error: err }));
    return () => {
      cancelled = true;
    };
  }, [queryKey, reloadToken]);

  const loadMore = async () => {
    if (!result) return;
    setLoadingMore(true);
    try {
      const data = await fetchJson<ApiResponse>(`/api/monetization-tracker?${toApiParams(filters, result.page + 1)}`);
      setResult((prev) => (prev && prev.key === queryKey ? { ...data, key: queryKey, items: [...prev.items, ...data.items] } : prev));
    } catch (err) {
      setError({ key: queryKey, error: err as Error });
    } finally {
      setLoadingMore(false);
    }
  };

  const languageOptions: Option[] = [
    { value: "all", label: "Toutes langues" },
    ...(result?.languages ?? []).map((l) => ({ value: l.code, label: LANGUAGE_LABELS[l.code] ?? l.code.toUpperCase() })),
  ];
  if (filters.language !== "all" && !languageOptions.some((o) => o.value === filters.language)) {
    languageOptions.push({ value: filters.language, label: LANGUAGE_LABELS[filters.language] ?? filters.language });
  }

  const chips: ActiveChip[] = [];
  const labelOf = (options: Option[], value: string) => options.find((o) => o.value === value)?.label ?? value;
  if (filters.q) chips.push({ key: "q", label: `« ${filters.q} »` });
  if (filters.change !== "all") chips.push({ key: "change", label: labelOf(CHANGE_OPTIONS, filters.change) });
  if (filters.period !== "all") chips.push({ key: "period", label: `Depuis ${labelOf(PERIOD_OPTIONS, filters.period)}` });
  if (filters.category !== "all") chips.push({ key: "category", label: labelOf(CATEGORY_OPTIONS, filters.category) });
  if (filters.language !== "all") chips.push({ key: "language", label: labelOf(languageOptions, filters.language) });
  if (filters.subs !== "all") chips.push({ key: "subs", label: labelOf(SUBS_OPTIONS, filters.subs) });

  const items = result?.key === queryKey ? result.items : [];
  const status = result?.status;
  const hasFilters = chips.length > 0;

  return (
    <div className="flex min-h-full flex-col">
      <ExplorerHeader title="Monetization Tracker" icon={<CircleDollarSign className="size-4 text-muted-foreground" />} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Monetization Tracker</h2>
          <p className="text-sm text-muted-foreground">Les chaînes longues qui viennent de perdre ou d&apos;obtenir les pubs.</p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une chaîne ou un @handle"
            className="h-10 pl-9"
          />
        </div>

        <TopicChips
          topics={TOPICS.map((topic) => ({
            label: topic.label,
            active: Object.entries(topic.filters).every(([k, v]) => filters[k as Key] === v),
            onPick: () => update({ ...DEFAULTS, sort: filters.sort, ...topic.filters }),
          }))}
        />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Filtrer par</span>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[filters.change]}
              onValueChange={(v: string[]) => v[0] && set("change", v[0])}
              className="col-span-2"
            >
              {CHANGE_OPTIONS.map((o) => (
                <ToggleGroupItem
                  key={o.value}
                  value={o.value}
                  className="px-3 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
                >
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[filters.period]}
              onValueChange={(v: string[]) => v[0] && set("period", v[0])}
              className="col-span-2"
            >
              {PERIOD_OPTIONS.map((o) => (
                <ToggleGroupItem
                  key={o.value}
                  value={o.value}
                  className="px-3 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
                >
                  {o.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FilterSelect
              value={filters.category}
              options={CATEGORY_OPTIONS}
              onChange={(v) => set("category", v)}
              icon={<LayoutGrid className="size-3.5 text-muted-foreground" />}
            />
            <FilterSelect
              value={filters.language}
              options={languageOptions}
              onChange={(v) => set("language", v)}
              icon={<Globe className="size-3.5 text-muted-foreground" />}
            />
            <FilterSelect
              value={filters.subs}
              options={SUBS_OPTIONS}
              onChange={(v) => set("subs", v)}
              icon={<Users className="size-3.5 text-muted-foreground" />}
            />
          </div>
        </div>

        <ActiveFilters
          chips={chips}
          onRemove={(key) => {
            if (key === "q") setSearch("");
            set(key as Key, DEFAULTS[key as Key]);
          }}
          onClear={reset}
        />

        <ResultsBar
          loading={loading}
          total={result?.key === queryKey ? result.total : 0}
          noun={["chaîne trouvée", "chaînes trouvées"]}
          updatedAt={status?.lastCheckedAt ?? null}
          sort={<FilterSelect value={filters.sort} options={SORT_OPTIONS} onChange={(v) => set("sort", v)} className="w-auto" />}
        />

        {error?.key === queryKey ? (
          error.error instanceof SessionExpiredError ? (
            <SessionExpiredState />
          ) : (
            <EmptyState title="Impossible de charger le tracker" description={error.error.message}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setReloadToken((n) => n + 1);
                }}
              >
                Réessayer
              </Button>
            </EmptyState>
          )
        ) : loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[260px] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          hasFilters ? (
            <EmptyState title="Aucune chaîne ne correspond" description="Retire quelques filtres pour voir plus de chaînes.">
              <Button variant="outline" size="sm" onClick={reset}>
                Réinitialiser les filtres
              </Button>
            </EmptyState>
          ) : (
            <EmptyState
              title="Pas encore de changement détecté"
              description={
                status && status.checked > 0
                  ? `${formatCompactNumber(status.checked)} chaînes vérifiées (${formatCompactNumber(status.monetized)} monétisées, ${formatCompactNumber(status.notMonetized)} sans pub). Un changement apparaît ici quand une chaîne gagne ou perd les pubs entre deux vérifications (toutes les 24 h).`
                  : "Le scanner commence à vérifier les chaînes. Les premiers changements apparaîtront après leur deuxième vérification (24 h plus tard)."
              }
            />
          )
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {items.map((channel) => (
                <TrackerCard
                  key={channel.id}
                  channel={channel}
                  onSimilar={() => setSimilarOf({ id: channel.id, name: channel.name })}
                />
              ))}
            </div>
            {result?.hasMore && (
              <div className="flex justify-center pb-4">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore && <Loader2 className="size-4 animate-spin" />}
                  Afficher plus
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <SimilarChannelsSheet channel={similarOf} onOpenChange={(open) => !open && setSimilarOf(null)} />
    </div>
  );
}

function TrackerCard({ channel, onSimilar }: { channel: TrackerChannel; onSimilar: () => void }) {
  const [tracking, setTracking] = useState<"idle" | "saving" | "saved">("idle");
  const { change } = channel;
  const language = channel.language;

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
    <Card className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:p-5">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-start gap-3">
          <Avatar className="size-10">
            {channel.avatar && <AvatarImage src={channel.avatar} alt="" />}
            <AvatarFallback>{channel.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/channel/${channel.id}`} className="truncate font-medium hover:underline">
                {channel.name}
              </Link>
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1.5 font-normal",
                  change.monetized ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700",
                )}
                title={channel.monetizedNow != null && channel.monetizedNow !== change.monetized ? "Le statut a encore changé depuis" : undefined}
              >
                <span className={cn("size-1.5 rounded-full", change.monetized ? "bg-emerald-500" : "bg-rose-500")} />
                <span className="font-medium">{change.monetized ? "Monétisée" : "Démonétisée"}</span>
                <span className="text-muted-foreground">
                  {change.from ? `entre le ${shortDate(change.from)} et le ${shortDate(change.to)}` : `le ${shortDate(change.to)}`}
                </span>
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {channel.handle && <span>{channel.handle}</span>}
              <span>
                · {channel.subscribers != null ? `${formatCompactNumber(channel.subscribers)} abonnés` : "abonnés masqués"}
              </span>
              {language && <span>· {LANGUAGE_LABELS[language] ?? language.toUpperCase()}</span>}
              {channel.country && <span>· {channel.country}</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {channel.categoryId != null && CATEGORY_LABELS[channel.categoryId] && (
                <Badge variant="secondary">{CATEGORY_LABELS[channel.categoryId]}</Badge>
              )}
              {channel.discoveredAt && <DiscoveredBadge at={channel.discoveredAt} />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat icon={<Eye className="size-3.5" />} value={channel.avgViews != null ? formatCompactNumber(channel.avgViews) : "—"} label="Vues moyennes" />
          <Stat
            icon={<TrendingUp className="size-3.5" />}
            value={channel.views48h != null ? `+${formatCompactNumber(Math.max(0, channel.views48h))}` : "—"}
            label="Vues · 48 h"
            positive={channel.views48h != null && channel.views48h > 0}
          />
          <Stat icon={<Video className="size-3.5" />} value={channel.videoCount != null ? formatCompactNumber(channel.videoCount) : "—"} label="Vidéos" />
          <Stat icon={<Clock className="size-3.5" />} value={channel.createdAt ? age(channel.createdAt) : "—"} label="Âge de la chaîne" />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="outline" onClick={track} disabled={tracking !== "idle"}>
            {tracking === "saving" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : tracking === "saved" ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <Bookmark className="size-4" />
            )}
            {tracking === "saved" ? "Suivie" : "Suivre"}
          </Button>
          <Button variant="outline" onClick={onSimilar}>
            <Users className="size-4" />
            Similaires
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={`/channel/${channel.id}`} />}>
            <BarChart3 className="size-4" />
            Analyser
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
      </div>

      <div className="flex min-w-0 flex-col gap-2 lg:border-l lg:pl-5">
        <span className="text-sm font-medium">Vidéos récentes</span>
        {channel.videos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vidéo longue enregistrée.</p>
        ) : (
          <ScrollArea className="-mx-1 w-[calc(100%+0.5rem)]">
            <div className="flex gap-3 px-1 pb-3">
              {channel.videos.map((video) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-52 shrink-0 flex-col gap-1.5"
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
                          "absolute bottom-1.5 left-1.5 rounded px-1 py-0.5 text-[10px] font-semibold",
                          video.multiplier >= 3 ? "bg-emerald-600 text-white" : "bg-black/70 text-white",
                        )}
                      >
                        {video.multiplier.toFixed(1)}x
                      </span>
                    )}
                    {video.duration && (
                      <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1 py-0.5 text-[10px] font-medium text-white tabular-nums">
                        {video.duration}
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
      </div>
    </Card>
  );
}

function Stat({
  icon,
  value,
  label,
  positive = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn("flex items-center gap-1.5 text-base font-semibold tabular-nums", positive && "text-emerald-600")}>
        <span className="text-muted-foreground">{icon}</span>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
