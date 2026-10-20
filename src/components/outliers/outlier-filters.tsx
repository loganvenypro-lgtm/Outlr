"use client";

import { RotateCcw, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ALL_VIDEOS_DEFAULTS,
  CATEGORY_OPTIONS,
  DEFAULT_FILTERS,
  FORMAT_OPTIONS,
  LANGUAGE_LABELS,
  MULTIPLIER_OPTIONS,
  PERIOD_OPTIONS,
  SORT_OPTIONS,
  SUBS_OPTIONS,
  VIEWS_OPTIONS,
  type FilterKey,
  type Filters,
} from "./filter-options";

interface Option {
  value: string;
  label: string;
}

function FilterSelect({
  value,
  options,
  onChange,
  className,
  prefix,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  prefix?: string;
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, prefix ? `${prefix} ${o.label}` : o.label]));
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v as string)}>
      <SelectTrigger className={className ?? "w-full sm:w-auto"}>
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

export function OutlierFilters({
  filters,
  search,
  languages,
  onSearchChange,
  onChange,
  onReset,
}: {
  filters: Filters;
  search: string;
  languages: { code: string; count: number }[];
  onSearchChange: (value: string) => void;
  onChange: (key: FilterKey, value: string) => void;
  onReset: () => void;
}) {
  const isAllView = filters.view === "all";
  const baseline: Filters = isAllView ? { ...DEFAULT_FILTERS, ...ALL_VIDEOS_DEFAULTS, view: "all" } : DEFAULT_FILTERS;
  const activeCount = (Object.keys(DEFAULT_FILTERS) as FilterKey[]).filter(
    (key) => key !== "sort" && key !== "view" && filters[key] !== baseline[key],
  ).length;

  const languageOptions: Option[] = [
    { value: "all", label: "Toutes langues" },
    ...languages.map((l) => ({ value: l.code, label: LANGUAGE_LABELS[l.code] ?? l.code.toUpperCase() })),
  ];
  if (filters.language !== "all" && !languageOptions.some((o) => o.value === filters.language)) {
    languageOptions.push({ value: filters.language, label: LANGUAGE_LABELS[filters.language] ?? filters.language });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher un titre ou une chaîne…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[filters.format]}
            onValueChange={(v: string[]) => v[0] && onChange("format", v[0])}
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
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(v) => onChange("sort", v)}
            prefix="Trier :"
            className="w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <FilterSelect value={filters.period} options={PERIOD_OPTIONS} onChange={(v) => onChange("period", v)} />
        <FilterSelect value={filters.subs} options={SUBS_OPTIONS} onChange={(v) => onChange("subs", v)} />
        <FilterSelect value={filters.minViews} options={VIEWS_OPTIONS} onChange={(v) => onChange("minViews", v)} />
        <FilterSelect
          value={filters.minMultiplier}
          options={MULTIPLIER_OPTIONS}
          onChange={(v) => onChange("minMultiplier", v)}
        />
        <FilterSelect value={filters.category} options={CATEGORY_OPTIONS} onChange={(v) => onChange("category", v)} />
        <FilterSelect value={filters.language} options={languageOptions} onChange={(v) => onChange("language", v)} />
        {!isAllView && (
          <Toggle
            variant="outline"
            pressed={filters.relevant === "true"}
            onPressedChange={(pressed: boolean) => onChange("relevant", pressed ? "true" : "false")}
            className="gap-1.5 px-2.5 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"
          >
            <Sparkles className="size-3.5" />
            Pertinentes uniquement
          </Toggle>
        )}
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
            <RotateCcw className="size-3.5" />
            Réinitialiser
            <Badge variant="secondary" className="ml-0.5">
              {activeCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
}
