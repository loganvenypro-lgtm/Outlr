"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, KeyRound, Loader2, Plus, Sparkles, Terminal, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { McpKey } from "@/lib/mcpKeys";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "Quels sont les 10 plus gros outliers true crime des 7 derniers jours ?",
  "Quelles niches explosent ce mois-ci en vidéos longues ?",
  "Trouve des petites chaînes gaming (moins de 50K abonnés) en forte tendance.",
  "Analyse la chaîne @nintendouk : ses meilleures vidéos et sa croissance.",
];

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="flex items-stretch gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-800 ring-1 ring-slate-200",
            !mono && "font-sans"
          )}
        >
          {value}
        </code>
        <Button type="button" variant="outline" size="lg" className="shrink-0 rounded-xl" onClick={copy} aria-label={`Copier : ${label}`}>
          {copied ? <Check className="text-emerald-600" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{n}</span>
      <div className="min-w-0 flex-1 space-y-2 text-sm text-slate-700">
        <p className="font-medium text-slate-900">{title}</p>
        {children}
      </div>
    </li>
  );
}

/** Settings > Claude: create a personal key and connect Claude to the Outlr MCP server. */
export function ClaudeConnect() {
  const [keys, setKeys] = useState<McpKey[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only mounted client-side, once the settings page has loaded the session
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  useEffect(() => {
    fetch("/api/mcp-keys")
      .then((res) => res.json())
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => setKeys([]));
  }, []);

  const endpoint = `${origin}/api/mcp`;
  const keyText = newKey ?? "TA_CLÉ";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de créer la clé.");
      setNewKey(data.key);
      setKeys((prev) => [data.record, ...(prev ?? [])]);
      setName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const res = await fetch(`/api/mcp-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setKeys((prev) => (prev ?? []).filter((k) => k.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl shadow-xs ring-slate-200/80">
        <CardHeader className="px-6">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <Sparkles className="size-4 text-orange-500" />
            Connecte Claude à Outlr
          </CardTitle>
          <CardDescription className="text-sm">
            Claude peut alors interroger toute la base Outlr pendant tes conversations : outliers, chaînes, niches et tendances.
            Il ne fait que lire les données, il ne modifie rien.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <p className="mb-2 text-xs font-medium text-slate-600">Ce que tu peux lui demander</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <li key={p} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200/70">
                « {p} »
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-xs ring-slate-200/80">
        <CardHeader className="px-6">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <KeyRound className="size-4 text-amber-500" />
            1. Crée ta clé personnelle
          </CardTitle>
          <CardDescription className="text-sm">
            La clé relie Claude à ton compte. Elle ne s&apos;affiche qu&apos;une seule fois : copie-la tout de suite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="mcp-key-name" className="text-sm font-medium text-slate-700">
                Nom de la clé
              </Label>
              <Input
                id="mcp-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Claude perso, Claude Code…"
                maxLength={80}
                className="h-10 rounded-xl"
              />
            </div>
            <Button type="submit" size="lg" className="h-10 rounded-xl px-4" disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : <Plus />}
              Créer une clé
            </Button>
          </form>

          {error && (
            <p role="status" className="flex items-center gap-1.5 text-sm text-rose-600">
              <AlertCircle className="size-4" />
              {error}
            </p>
          )}

          {newKey && (
            <div className="space-y-3 rounded-xl bg-emerald-50/60 p-4 ring-1 ring-emerald-200">
              <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-800">
                <Check className="size-4" />
                Clé créée. Copie-la maintenant, elle ne sera plus affichée.
              </p>
              <CopyField label="Ta clé" value={newKey} />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Clés actives</p>
            {keys === null ? (
              <Skeleton className="h-12 w-full rounded-xl" />
            ) : keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune clé pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {keys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{k.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <code>{k.prefix}…</code> · créée le {dateFormat.format(new Date(k.createdAt))} ·{" "}
                        {k.lastUsedAt ? `utilisée le ${dateFormat.format(new Date(k.lastUsedAt))}` : "jamais utilisée"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 text-rose-600 hover:text-rose-700" onClick={() => handleRevoke(k.id)}>
                      <Trash2 />
                      Révoquer
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-xs ring-slate-200/80">
        <CardHeader className="px-6">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <Sparkles className="size-4 text-orange-500" />
            2. Ajoute Outlr dans Claude (claude.ai ou l&apos;app Claude)
          </CardTitle>
          <CardDescription className="text-sm">Fonctionne sur le web, sur l&apos;app ordinateur et sur mobile une fois ajouté.</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <ol className="space-y-4">
            <Step n={1} title="Ouvre les connecteurs">
              <p>
                Dans Claude, va dans <b>Paramètres → Connecteurs</b>, puis clique sur <b>Ajouter un connecteur personnalisé</b>.
              </p>
            </Step>
            <Step n={2} title="Colle ces informations">
              <CopyField label="Nom" value="Outlr" mono={false} />
              <CopyField label="URL du serveur MCP" value={`${endpoint}?key=${keyText}`} />
              {!newKey && <p className="text-xs text-muted-foreground">Crée une clé ci-dessus pour obtenir ton URL complète.</p>}
            </Step>
            <Step n={3} title="Active-le dans une conversation">
              <p>Clique sur l&apos;icône des outils dans la zone de message, active « Outlr », puis pose ta question.</p>
            </Step>
          </ol>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-xs ring-slate-200/80">
        <CardHeader className="px-6">
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <Terminal className="size-4 text-slate-700" />
            Avec Claude Code
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">Développeurs</Badge>
          </CardTitle>
          <CardDescription className="text-sm">Lance cette commande dans ton terminal.</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <CopyField
            label="Commande"
            value={`claude mcp add --transport http outlr ${endpoint} --header "Authorization: Bearer ${keyText}"`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
