import fs from "fs";
import path from "path";

const BUNDLED_DIR = path.join(process.cwd(), "data");

/**
 * Folder holding the JSON databases. On Vercel the deployed files are read-only,
 * so they're copied once into /tmp (writable, but lost when the instance recycles).
 */
export const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : BUNDLED_DIR;

if (process.env.VERCEL && !fs.existsSync(DATA_DIR)) {
  try {
    fs.cpSync(BUNDLED_DIR, DATA_DIR, { recursive: true });
  } catch {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * YouTube API data may be kept 30 days at most (YouTube API Services Developer Policies):
 * the JSON stores drop older entries when they load. A missing or invalid date counts as expired.
 */
export const API_DATA_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isExpired(at: string | number | null | undefined): boolean {
  const time = typeof at === "number" ? at : Date.parse(at ?? "");
  return !Number.isFinite(time) || Date.now() - time > API_DATA_MAX_AGE_MS;
}

/** Keeps the entries of a keyed store whose date (read by `at`) is still within 30 days. */
export function freshEntries<T>(record: Record<string, T>, at: (value: T) => string | number | null | undefined) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => !isExpired(at(value))));
}
