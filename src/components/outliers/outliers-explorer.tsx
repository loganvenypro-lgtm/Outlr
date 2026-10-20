"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Database, Flame, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCompactNumber } from "@/lib/utils";
import { ALL_VIDEOS_DEFAULTS, DEFAULT_FILTERS, toApiParams, type FilterKey, type Filters } from "./filter-options";
import { OutlierCard, type OutlierVideo } from "./outlier-card";
import { OutlierFilters } from "./outlier-filters";

interface ApiResponse {
  items: OutlierVideo[];
  total: number;
  page: number;
  hasMore: boolean;
  languages: { code: string; count: number }[];
}

// Results are tagged with the query they answer, so "loading" is derived instead of set in effects.
type Result = ApiResponse & { key: string };

function readFilters(params: URLSearchParams): Filters {
  const view = params.get("view") === "all" ? "all" : "outliers";
  const filters: Filters = view === "all" ? { ...DEFAULT_FILTERS, ...ALL_VIDEOS_DEFAULTS, view } : { ...DEFAULT_FILTERS };
  for (const key of Object.keys(DEFAULT_FILTERS) as FilterKey[]) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

async function fetchOutliers(params: URLSearchParams): Promise<ApiResponse> {
  const res = await fetch(`/api/outliers?${params}`);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Erreur de chargement.");
  return res.json();
}

export function OutliersExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);
  const queryKey = toApiParams(filters, 0).toString();

  const [search, setSearch] = useState(filters.q);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const loading = result?.key !== queryKey && error?.key !== queryKey;

  // Only values that differ from the tab's defaults go in the URL, so links stay short and shareable.
  const updateFilters = useCallback(
    (next: Filters) => {
      const baseline: Filters =
        next.view === "all" ? { ...DEFAULT_FILTERS, ...ALL_VIDEOS_DEFAULTS, view: "all" } : DEFAULT_FILTERS;
      const params = new URLSearchParams();
      if (next.view === "all") params.set("view", "all");
      for (const key of Object.keys(DEFAULT_FILTERS) as FilterKey[]) {
        if (key !== "view" && next[key] !== baseline[key]) params.set(key, next[key]);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setFilter = (key: FilterKey, value: string) => updateFilters({ ...filters, [key]: value });

  const switchView = (view: string) => {
    setSearch("");
    updateFilters(view === "all" ? { ...DEFAULT_FILTERS, ...ALL_VIDEOS_DEFAULTS, view: "all" } : { ...DEFAULT_FILTERS });
  };

  const resetFilters = () => switchView(filters.view);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (search === filters.q) return;
    const timer = setTimeout(() => updateFilters({ ...filters, q: search.trim() }), 350);
    return () => clearTimeout(timer);
  }, [search, filters, updateFilters]);

  useEffect(() => {
    let cancelled = false;
    fetchOutliers(new URLSearchParams(queryKey))
      .then((data) => {
        if (!cancelled) setResult({ ...data, key: queryKey });
      })
      .catch((err) => {
        if (!cancelled) setError({ key: queryKey, message: err instanceof Error ? err.message : "Erreur de chargement." });
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, reloadToken]);

  const loadMore = async () => {
    if (!result) return;
    setLoadingMore(true);
    try {
      const data = await fetchOutliers(toApiParams(filters, result.page + 1));
      setResult((prev) => (prev && prev.key === queryKey ? { ...data, key: queryKey, items: [...prev.items, ...data.items] } : prev));
    } catch (err) {
      setError({ key: queryKey, message: err instanceof Error ? err.message : "Erreur de chargement." });
    } finally {
      setLoadingMore(false);
    }
  };

  const retry = () => {
    setError(null);
    setReloadToken((n) => n + 1);
  };

  const items = result?.key === queryKey ? result.items : [];
  const total = result?.key === queryKey ? result.total : 0;
  const isAllView = filters.view === "all";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-auto" />
        <h1 className="text-sm font-medium">{isAllView ? "Toutes les vidéos" : "Outliers"}</h1>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
          Données mises à jour toutes les 30 min
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isAllView ? "Toute la base de vidéos" : "Vidéos qui surperforment"}
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {isAllView
                ? "Toutes les vidéos collectées par le scanner, sans filtre de pertinence. Idéal pour explorer une niche en entier."
                : "Les vidéos qui font bien plus de vues que d'habitude sur leur chaîne. Filtre par format, taille de chaîne, niche ou langue pour trouver ta prochaine idée."}
            </p>
          </div>
          <Tabs value={filters.view} onValueChange={(v) => switchView(String(v))}>
            <TabsList>
              <TabsTrigger value="outliers">
                <Flame className="size-3.5" />
                Outliers
              </TabsTrigger>
              <TabsTrigger value="all">
                <Database className="size-3.5" />
                Toutes les vidéos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <OutlierFilters
          filters={filters}
          search={search}
          languages={result?.languages ?? []}
          onSearchChange={setSearch}
          onChange={setFilter}
          onReset={resetFilters}
        />

        <div className="text-sm text-muted-foreground">
          {loading ? (
            "Chargement…"
          ) : (
            <>
              <span className="font-medium text-foreground tabular-nums">{formatCompactNumber(total)}</span> vidéo
              {total > 1 ? "s" : ""} trouvée{total > 1 ? "s" : ""}
            </>
          )}
        </div>

        {error?.key === queryKey ? (
          <EmptyState title="Impossible de charger les vidéos" description={error.message}>
            <Button variant="outline" size="sm" onClick={retry}>
              Réessayer
            </Button>
          </EmptyState>
        ) : loading ? (
          <Grid>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xl border">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="flex flex-col gap-2 p-3.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </Grid>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune vidéo ne correspond"
            description="Élargis la période ou retire quelques filtres pour voir plus de résultats."
          >
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          </EmptyState>
        ) : (
          <>
            <Grid>
              {items.map((video) => (
                <OutlierCard key={video.id} video={video} />
              ))}
            </Grid>
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{children}</div>;
}

function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
