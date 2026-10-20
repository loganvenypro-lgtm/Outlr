"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Globe, LayoutGrid, Loader2, Search, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
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
import { CATEGORY_OPTIONS, FORMAT_OPTIONS, LANGUAGE_LABELS, SUBS_OPTIONS } from "@/components/outliers/filter-options";
import { ChannelCard, type TrendChannel } from "./channel-card";

type Key = "q" | "format" | "category" | "language" | "subs" | "withOutliers" | "sort";
type Filters = Record<Key, string>;

const DEFAULTS: Filters = {
  q: "",
  format: "all",
  category: "all",
  language: "all",
  subs: "all",
  withOutliers: "false",
  sort: "trend",
};

const SORT_OPTIONS: Option[] = [
  { value: "trend", label: "Score de tendance" },
  { value: "momentum", label: "Vues (24 h)" },
  { value: "views7d", label: "Vues des vidéos (7 j)" },
  { value: "outliers", label: "Nombre d'outliers" },
  { value: "multiplier", label: "Meilleur multiplicateur" },
  { value: "subs24h", label: "Abonnés gagnés (24 h)" },
  { value: "subscribers", label: "Abonnés" },
];

// Quick topics: each one is just a preset of filters.
const TOPICS: { label: string; filters: Partial<Filters> }[] = [
  { label: "Gaming", filters: { category: "20" } },
  { label: "Éducation", filters: { category: "27" } },
  { label: "Science & Tech", filters: { category: "28" } },
  { label: "Divertissement", filters: { category: "24" } },
  { label: "Humour", filters: { category: "23" } },
  { label: "Sport", filters: { category: "17" } },
  { label: "Chaînes émergentes", filters: { subs: "small", withOutliers: "true" } },
];

interface ApiResponse {
  items: TrendChannel[];
  total: number;
  page: number;
  hasMore: boolean;
  languages: { code: string; count: number }[];
  updatedAt: string | null;
}

function toApiParams(filters: Filters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  params.set("format", filters.format);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.language !== "all") params.set("language", filters.language);
  const subs = SUBS_OPTIONS.find((o) => o.value === filters.subs);
  if (subs?.min != null) params.set("minSubs", String(subs.min));
  if (subs?.max != null) params.set("maxSubs", String(subs.max));
  if (filters.withOutliers === "true") params.set("withOutliers", "true");
  params.set("sort", filters.sort);
  params.set("page", String(page));
  return params;
}

export function ChannelTrendsExplorer() {
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
    fetchJson<ApiResponse>(`/api/channel-trends?${queryKey}`)
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
      const data = await fetchJson<ApiResponse>(`/api/channel-trends?${toApiParams(filters, result.page + 1)}`);
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
  if (filters.format !== "all") chips.push({ key: "format", label: labelOf(FORMAT_OPTIONS, filters.format) });
  if (filters.category !== "all") chips.push({ key: "category", label: labelOf(CATEGORY_OPTIONS, filters.category) });
  if (filters.language !== "all") chips.push({ key: "language", label: labelOf(languageOptions, filters.language) });
  if (filters.subs !== "all") chips.push({ key: "subs", label: labelOf(SUBS_OPTIONS, filters.subs) });
  if (filters.withOutliers === "true") chips.push({ key: "withOutliers", label: "Avec outliers récents" });

  const items = result?.key === queryKey ? result.items : [];

  return (
    <div className="flex min-h-full flex-col">
      <ExplorerHeader title="Channel Trends" icon={<TrendingUp className="size-4 text-muted-foreground" />} />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-5 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Channel Trends</h2>
          <p className="text-sm text-muted-foreground">Les chaînes qui prennent de l&apos;élan en ce moment.</p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une chaîne ou un @handle…"
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
              value={[filters.format]}
              onValueChange={(v: string[]) => v[0] && set("format", v[0])}
              className="col-span-2"
            >
              {FORMAT_OPTIONS.map((o) => (
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
            <Toggle
              variant="outline"
              pressed={filters.withOutliers === "true"}
              onPressedChange={(pressed: boolean) => set("withOutliers", pressed ? "true" : "false")}
              className="px-2.5 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
            >
              Avec outliers récents
            </Toggle>
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
          updatedAt={result?.updatedAt ?? null}
          sort={
            <FilterSelect value={filters.sort} options={SORT_OPTIONS} onChange={(v) => set("sort", v)} className="w-auto" />
          }
        />

        {error?.key === queryKey ? (
          error.error instanceof SessionExpiredError ? (
            <SessionExpiredState />
          ) : (
            <EmptyState title="Impossible de charger les chaînes" description={error.error.message}>
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Aucune chaîne ne correspond" description="Retire quelques filtres pour voir plus de chaînes.">
            <Button variant="outline" size="sm" onClick={reset}>
              Réinitialiser les filtres
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {items.map((channel, i) => (
                <ChannelCard key={channel.id} channel={channel} rank={i + 1} />
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
    </div>
  );
}
