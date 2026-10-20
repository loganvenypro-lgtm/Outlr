"use client";

import { CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdRevenueEstimate } from "@/lib/revenueEstimator";
import { formatCompactNumber } from "@/lib/utils";

const usd = (n: number) => (n >= 1000 ? `$${formatCompactNumber(n)}` : `$${Math.round(n)}`);
const range = (r: { min: number; max: number }) => (r.max === r.min ? usd(r.max) : `${usd(r.min)} – ${usd(r.max)}`);

const HOW =
  "Vues gagnées par jour par la chaîne × RPM de la niche, ajusté au marché de l'audience (langue) et à la part de Shorts. Pubs AdSense seulement : hors sponsors, affiliation et merch.";

/** One line for list cards: "Revenus pub · 30 j  $1.2K – $3.4K". */
export function RevenueLine({ revenue }: { revenue: AdRevenueEstimate }) {
  const value =
    revenue.status === "not_monetized"
      ? "Pas de pubs"
      : revenue.status === "unknown"
        ? "Statut en cours de vérification"
        : revenue.monthly
          ? range(revenue.monthly)
          : "Vues 24 h dispo demain";

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CircleDollarSign className="size-3.5" />
              Revenus pub estimés · 30 j
            </span>
            <span className={revenue.monthly ? "font-semibold text-emerald-600 tabular-nums" : "text-muted-foreground"}>
              {value}
            </span>
          </div>
        }
      />
      <TooltipContent className="max-w-72">
        {revenue.nicheLabel} · RPM ${revenue.rpm.min.toFixed(2)} – ${revenue.rpm.max.toFixed(2)}. {HOW}
      </TooltipContent>
    </Tooltip>
  );
}

/** Full card for the channel page. */
export function RevenueCard({ revenue }: { revenue: AdRevenueEstimate & { checkedAt: string | null } }) {
  const monetized = revenue.status === "monetized";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="size-4 text-muted-foreground" />
          Revenus pub estimés
        </CardTitle>
        <CardDescription>{HOW}</CardDescription>
        <CardAction>
          <Badge
            variant="secondary"
            className={
              monetized
                ? "bg-emerald-500/10 text-emerald-700"
                : revenue.status === "not_monetized"
                  ? "bg-rose-500/10 text-rose-700"
                  : ""
            }
          >
            {monetized ? "Monétisée" : revenue.status === "not_monetized" ? "Pas de pubs" : "Statut inconnu"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {revenue.status === "not_monetized" ? (
          <p className="text-sm text-muted-foreground">
            Aucune pub vue sur ses dernières vidéos longues : la chaîne ne touche rien d&apos;AdSense pour l&apos;instant.
          </p>
        ) : revenue.status === "unknown" ? (
          <p className="text-sm text-muted-foreground">
            Le scanner n&apos;a pas encore vérifié si cette chaîne a des pubs. L&apos;estimation s&apos;affichera après sa vérification.
          </p>
        ) : !revenue.monthly || !revenue.daily ? (
          <p className="text-sm text-muted-foreground">
            La chaîne est monétisée, mais il faut encore un jour d&apos;historique de vues pour estimer ses revenus.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Figure label="Par mois" value={range(revenue.monthly)} highlight />
            <Figure label="Par jour" value={range(revenue.daily)} />
            <Figure label="RPM estimé" value={`$${revenue.rpm.min.toFixed(2)} – $${revenue.rpm.max.toFixed(2)}`} />
            <Figure
              label="Niche · base"
              value={revenue.nicheLabel}
              hint={revenue.dailyViews != null ? `${formatCompactNumber(revenue.dailyViews)} vues / jour` : undefined}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, hint, highlight = false }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={highlight ? "text-xl font-semibold text-emerald-600 tabular-nums" : "truncate text-base font-semibold tabular-nums"}>
        {value}
      </span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
