import type { SavedItemInput, SavedItemSnapshot } from "@/lib/saved-folders";

const str = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const numOrNull = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** Validate an item sent by the client; keeps only known snapshot fields. */
export function parseItem(raw: unknown): SavedItemInput | null {
  if (!raw || typeof raw !== "object") return null;
  const { type, id, snapshot } = raw as Record<string, unknown>;
  if (type !== "video" && type !== "channel") return null;
  if (typeof id !== "string" || !/^[\w-]{6,64}$/.test(id)) return null;
  const s = (snapshot && typeof snapshot === "object" ? snapshot : {}) as Record<string, unknown>;

  const clean: SavedItemSnapshot = {
    title: str(s.title, 300) ?? id,
    thumbnail: str(s.thumbnail, 600),
    channelId: str(s.channelId, 64),
    channelName: str(s.channelName, 200),
    views: numOrNull(s.views),
    multiplier: numOrNull(s.multiplier),
    publishedAt: str(s.publishedAt, 40),
    isShort: typeof s.isShort === "boolean" ? s.isShort : undefined,
    handle: str(s.handle, 120),
    subscribers: numOrNull(s.subscribers),
  };
  // Drop empty fields so the stored JSON stays small.
  for (const key of Object.keys(clean) as (keyof SavedItemSnapshot)[]) {
    if (clean[key] == null) delete clean[key];
  }
  return { type, id, snapshot: clean };
}
