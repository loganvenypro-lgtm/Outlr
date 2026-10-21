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
