"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogIn, Search, SearchX, X } from "lucide-react";
import { navTrail, type Crumb } from "@/components/nav-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn, formatCompactNumber } from "@/lib/utils";

export interface Option {
  value: string;
  label: string;
}

/** Thrown by explorer fetches when the session cookie is missing or expired. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Session expirée");
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 401) throw new SessionExpiredError();
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Erreur de chargement.");
  return res.json();
}

/**
 * The bar on top of every dashboard page. Pages listed in the sidebar show their place in it
 * ("Tendances › Vidéos virales"); the others pass their own breadcrumbs.
 */
export function ExplorerHeader({
  title,
  icon,
  breadcrumbs,
  search = false,
}: {
  title: string;
  icon?: React.ReactNode;
  breadcrumbs?: Crumb[];
  search?: boolean;
}) {
  const pathname = usePathname();
  const trail = navTrail(pathname);
  const crumbs = breadcrumbs ?? [...(trail?.crumbs.slice(0, -1) ?? []), { label: title }];
  const TrailIcon = trail?.icon;
  const pageIcon = icon ?? (TrailIcon && <TrailIcon />);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1.5 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-auto" />
      <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-1.5 text-sm">
        {pageIcon && (
          <span className="flex shrink-0 [&_svg]:size-4 [&_svg]:text-muted-foreground">{pageIcon}</span>
        )}
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={`${i}-${crumb.label}`} className={cn("flex items-center gap-1.5", last ? "min-w-0" : "shrink-0 max-sm:hidden")}>
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />}
              {last ? (
                <h1 className="truncate font-semibold text-foreground">{crumb.label}</h1>
              ) : crumb.href ? (
                <Link href={crumb.href} className="text-muted-foreground transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-muted-foreground">{crumb.label}</span>
              )}
            </span>
          );
        })}
      </nav>
      {search && <QuickSearch />}
    </header>
  );
}

function QuickSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      className="relative ml-auto hidden w-72 lg:block"
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) router.push(`/niche-finder?q=${encodeURIComponent(query.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une chaîne, une niche…"
        aria-label="Recherche rapide"
        className="h-8 border-transparent bg-muted pl-8 shadow-none focus-visible:bg-background"
      />
    </form>
  );
}

export function FilterSelect({
  value,
  options,
  onChange,
  className,
  prefix,
  icon,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  prefix?: string;
  icon?: React.ReactNode;
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, prefix ? `${prefix} ${o.label}` : o.label]));
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v as string)}>
      <SelectTrigger className={className ?? "w-full sm:w-auto"}>
        {icon}
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface Topic {
  label: string;
  active: boolean;
  onPick: () => void;
}

export function TopicChips({ topics }: { topics: Topic[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Essayer</span>
      {topics.map((topic) => (
        <Button
          key={topic.label}
          variant={topic.active ? "default" : "secondary"}
          size="sm"
          className="rounded-full"
          onClick={topic.onPick}
        >
          {topic.label}
        </Button>
      ))}
    </div>
  );
}

export interface ActiveChip {
  key: string;
  label: string;
}

export function ActiveFilters({
  chips,
  onRemove,
  onClear,
}: {
  chips: ActiveChip[];
  onRemove: (key: string) => void;
  onClear: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="secondary" className="h-7 gap-1 rounded-md pr-1 pl-2.5 text-xs font-normal">
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label={`Retirer le filtre ${chip.label}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button variant="link" size="sm" className="h-7 px-1 text-muted-foreground" onClick={onClear}>
        Tout effacer
      </Button>
    </div>
  );
}

function updatedAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `il y a ${hours} h` : `il y a ${Math.round(hours / 24)} j`;
}

export function ResultsBar({
  loading,
  total,
  noun,
  updatedAt,
  sort,
}: {
  loading: boolean;
  total: number;
  noun: [string, string];
  updatedAt: string | null;
  sort: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium">
          {loading ? "Chargement…" : `${formatCompactNumber(total)} ${total > 1 ? noun[1] : noun[0]}`}
        </span>
        {updatedAt && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Mis à jour {updatedAgo(updatedAt)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Trier par</span>
        {sort}
      </div>
    </div>
  );
}

export function EmptyState({
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

export function SessionExpiredState() {
  return (
    <EmptyState title="Ta session a expiré" description="Reconnecte-toi pour voir les données à jour.">
      <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
        <LogIn className="size-4" />
        Se reconnecter
      </Button>
    </EmptyState>
  );
}
