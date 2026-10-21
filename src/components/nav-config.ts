import type * as React from "react"
import { Bookmark, Clapperboard, Eye, Flame, House, Search, Settings, ShieldCheck, Sparkles } from "lucide-react"

export type NavLink = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

// A folder groups several links under one collapsible entry.
export type NavFolder = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: Omit<NavLink, "icon">[]
}

export type NavEntry = NavLink | NavFolder

export const isFolder = (entry: NavEntry): entry is NavFolder => "items" in entry

export const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: "Découvrir",
    items: [
      { title: "Accueil", url: "/", icon: House },
      {
        title: "Tendances",
        icon: Flame,
        items: [
          { title: "Vidéos virales", url: "/dashboard", badge: "Live" },
          { title: "Channel Trends", url: "/channel-trends", badge: "Live" },
          { title: "Tendances YouTube", url: "/trending" },
          { title: "Radar global", url: "/radar" },
        ],
      },
      {
        title: "Recherche",
        icon: Search,
        items: [
          { title: "Recherche de niche", url: "/niche-finder" },
          { title: "Trouver une chaîne", url: "/channel-finder" },
        ],
      },
    ],
  },
  {
    label: "Suivi",
    items: [
      { title: "Mes dossiers", url: "/folders", icon: Bookmark },
      {
        title: "Chaînes",
        icon: Eye,
        items: [
          { title: "Chaînes suivies", url: "/tracking" },
          { title: "Chaînes similaires", url: "/dashboard/similar-channels" },
          { title: "Comparer", url: "/compare" },
        ],
      },
    ],
  },
  {
    label: "Création",
    items: [
      { title: "Studio", url: "/tubelab", icon: Clapperboard },
      {
        title: "Outils IA",
        icon: Sparkles,
        items: [
          { title: "Title Lab", url: "/title-lab" },
          { title: "Miniatures", url: "/thumbnail-intelligence" },
          { title: "Stratège IA", url: "/viral-chat" },
        ],
      },
    ],
  },
]

const EXTRA_PAGES: Record<string, Omit<NavLink, "url">> = {
  "/settings": { title: "Paramètres", icon: Settings },
  "/admin": { title: "Admin", icon: ShieldCheck },
}

export type Crumb = { label: string; href?: string }

export type NavTrail = { icon: NavLink["icon"]; crumbs: Crumb[] }

/** Where the page sits in the sidebar ("Tendances" › "Vidéos virales"), or null when it isn't listed there. */
export function navTrail(pathname: string): NavTrail | null {
  const extra = EXTRA_PAGES[pathname]
  if (extra) return { icon: extra.icon, crumbs: [{ label: extra.title }] }
  for (const group of NAV_GROUPS) {
    for (const entry of group.items) {
      if (!isFolder(entry)) {
        if (entry.url === pathname) return { icon: entry.icon, crumbs: [{ label: entry.title }] }
        continue
      }
      const item = entry.items.find((i) => i.url === pathname)
      if (item) return { icon: entry.icon, crumbs: [{ label: entry.title }, { label: item.title }] }
    }
  }
  return null
}
