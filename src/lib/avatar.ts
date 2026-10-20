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
