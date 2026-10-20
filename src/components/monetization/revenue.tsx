"use client";

import { CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdRevenueEstimate } from "@/lib/revenueEstimator";
import { formatCompactNumber } from "@/lib/utils";

const usd = (n: number) => (n >= 1000 ? `$${formatCompactNumber(n)}` : `$${Math.round(n)}`);
const range = (r: { min: number; max: number }) => (r.max === r.min ? usd(r.max) : `${usd(r.min)} – ${usd(r.max)}`);

/** Estimated AdSense revenue card for the channel page. */
export function RevenueCard({ revenue }: { revenue: AdRevenueEstimate }) {
  const eligible = revenue.status === "eligible";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="size-4 text-muted-foreground" />
          Revenus pub estimés
        </CardTitle>
        <CardDescription>
          Si la chaîne est monétisée : vues gagnées par jour × RPM de la niche, ajusté au marché de l&apos;audience (langue)
          et à la part de Shorts. Pubs AdSense seulement : hors sponsors, affiliation et merch.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary" className={eligible ? "bg-emerald-500/10 text-emerald-700" : ""}>
            {eligible ? "Éligible à la monétisation" : "Pas encore éligible"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!eligible ? (
          <p className="text-sm text-muted-foreground">
            Moins de 1 000 abonnés : la chaîne ne peut pas encore toucher de revenus publicitaires.
          </p>
        ) : !revenue.monthly || !revenue.daily ? (
          <p className="text-sm text-muted-foreground">
            Il faut encore quelques heures d&apos;historique de vues pour estimer ses revenus.
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
