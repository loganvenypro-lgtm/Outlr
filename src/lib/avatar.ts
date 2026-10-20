// DiceBear avatar generator (https://www.dicebear.com/how-to-use/http-api/)
// Same seed => same avatar, so seeding with a stable id (email, handle) keeps
// each user's picture consistent across sessions and devices.

const DICEBEAR_BASE = "https://api.dicebear.com/9.x";
const DEFAULT_STYLE = "notionists";
const BACKGROUNDS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "d1f4e0"];

export function getDicebearAvatar(seed: string, style: string = DEFAULT_STYLE): string {
  const params = new URLSearchParams({
    seed: seed.trim().toLowerCase() || "outlr",
    backgroundColor: BACKGROUNDS.join(","),
    backgroundType: "solid",
  });
  return `${DICEBEAR_BASE}/${style}/svg?${params.toString()}`;
}

// Old accounts were stored with a v7 avataaars URL (or none); normalize them.
export function resolveUserAvatar(user: { avatar?: string | null; email?: string; name?: string }): string {
  if (user.avatar && !user.avatar.includes("api.dicebear.com/7.x")) {
    return user.avatar;
  }
  return getDicebearAvatar(user.email || user.name || "outlr");
}

// Styles offered in Settings > Profil
export const AVATAR_STYLES = [
  { id: "notionists", label: "Notion" },
  { id: "avataaars", label: "Cartoon" },
  { id: "lorelei", label: "Lorelei" },
  { id: "micah", label: "Micah" },
  { id: "adventurer", label: "Aventurier" },
  { id: "personas", label: "Personas" },
  { id: "fun-emoji", label: "Emoji" },
  { id: "bottts", label: "Robot" },
] as const;

// Only accept DiceBear URLs we generate ourselves when a user saves an avatar.
export function isAllowedAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const [, version, style, format] = parsed.pathname.split("/");
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "api.dicebear.com" &&
      version === "9.x" &&
      AVATAR_STYLES.some((s) => s.id === style) &&
      format === "svg"
    );
  } catch {
    return false;
  }
}
