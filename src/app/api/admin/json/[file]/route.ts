import { NextRequest, NextResponse } from "next/server";
import { parsePage, requireAdmin } from "@/lib/admin";
import { describe, readJsonFile } from "@/lib/adminJson";

export const dynamic = "force-dynamic";

const MAX_ENTRY_CHARS = 20_000;

/**
 * One page of entries of a data/*.json file. `path` (dot separated keys) drills
 * into a nested collection, e.g. intelligence_database.json?path=channels.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { file } = await params;
  const { searchParams } = new URL(request.url);
  const { page, size, offset, q } = parsePage(searchParams, 25);
  const keyPath = (searchParams.get("path") ?? "").split(".").filter(Boolean);

  let node: unknown;
  try {
    node = readJsonFile(file);
  } catch {
    return NextResponse.json({ error: "Fichier JSON illisible." }, { status: 500 });
  }
  if (node === null) return NextResponse.json({ error: "Fichier inconnu." }, { status: 404 });

  for (const key of keyPath) {
    if (!node || typeof node !== "object" || !(key in (node as object))) {
      return NextResponse.json({ error: "Chemin introuvable." }, { status: 404 });
    }
    node = (node as Record<string, unknown>)[key];
  }

  const entries: [string, unknown][] = Array.isArray(node)
    ? node.map((v, i) => [String(i), v])
    : node && typeof node === "object"
      ? Object.entries(node)
      : [["valeur", node]];

  const needle = q.toLowerCase();
  const matching = needle
    ? entries.filter(([k, v]) => k.toLowerCase().includes(needle) || JSON.stringify(v).toLowerCase().includes(needle))
    : entries;

  return NextResponse.json({
    file,
    path: keyPath,
    kind: Array.isArray(node) ? "array" : typeof node,
    total: matching.length,
    page,
    size,
    entries: matching.slice(offset, offset + size).map(([key, value]) => {
      const json = JSON.stringify(value, null, 2) ?? "null";
      return {
        key,
        summary: describe(value),
        nested: !!value && typeof value === "object",
        json: json.length > MAX_ENTRY_CHARS ? json.slice(0, MAX_ENTRY_CHARS) + "\n… (tronqué)" : json,
      };
    }),
  });
}
