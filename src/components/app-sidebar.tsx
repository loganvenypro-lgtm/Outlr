"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bookmark,
  Building2,
  Clapperboard,
  Flame,
  FlaskConical,
  GitCompareArrows,
  House,
  Image as ImageIcon,
  LineChart,
  MessageSquareText,
  Radar,
  ScanSearch,
  Search,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { NavUser } from "@/components/nav-user"
import { getDicebearAvatar } from "@/lib/avatar"
import { USER_UPDATED_EVENT, type PublicUser } from "@/lib/user-events"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Découvrir",
    items: [
      { title: "Accueil", url: "/", icon: House },
      { title: "Vidéos virales", url: "/dashboard", icon: Flame, badge: "Live" },
      { title: "Channel Trends", url: "/channel-trends", icon: LineChart, badge: "Live" },      { title: "Tendances YouTube", url: "/trending", icon: TrendingUp },
      { title: "Radar global", url: "/radar", icon: Radar },
      { title: "Recherche de niche", url: "/niche-finder", icon: BarChart3 },
      { title: "Trouver une chaîne", url: "/channel-finder", icon: Search },
    ],
  },
  {
    label: "Suivi",
    items: [
      { title: "Chaînes suivies", url: "/tracking", icon: Bookmark },
      { title: "Chaînes similaires", url: "/dashboard/similar-channels", icon: Users },
      { title: "Comparer", url: "/compare", icon: GitCompareArrows },
    ],
  },
  {
    label: "Création",
    items: [
      { title: "Studio", url: "/tubelab", icon: Clapperboard },
      { title: "Title Lab", url: "/title-lab", icon: FlaskConical },
      { title: "Miniatures", url: "/thumbnail-intelligence", icon: ImageIcon },
      { title: "Stratège IA", url: "/viral-chat", icon: MessageSquareText },
    ],
  },
  {
    label: "Business",
    items: [
      { title: "Monétisation", url: "/sponsors", icon: Wallet },
      { title: "Marques & sponsors", url: "/leads", icon: Building2 },
      { title: "Scraper", url: "/discovery", icon: ScanSearch },
      { title: "Statistiques", url: "/stats", icon: BarChart3 },
    ],
  },
]

const FALLBACK_USER = {
  name: "Logan",
  email: "logan@outlr.io",
  avatar: getDicebearAvatar("logan@outlr.io"),
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = React.useState(FALLBACK_USER)

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.authenticated && resData.user) {
          setCurrentUser({
            name: resData.user.name,
            email: resData.user.email,
            avatar: resData.user.avatar || getDicebearAvatar(resData.user.email || resData.user.name),
          })
        }
      })
      .catch(() => {})

    const handleUserUpdated = (event: Event) => {
      const { name, email, avatar } = (event as CustomEvent<PublicUser>).detail
      setCurrentUser({ name, email, avatar })
    }
    window.addEventListener(USER_UPDATED_EVENT, handleUserUpdated)
    return () => window.removeEventListener(USER_UPDATED_EVENT, handleUserUpdated)
  }, [])

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname === url)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flame className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Outlr</span>
                <span className="truncate text-xs text-muted-foreground">Radar YouTube</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url + item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive(item.url)}
                      render={<Link href={item.url} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="rounded-md bg-emerald-500/10 text-[10px] font-semibold text-emerald-700">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Paramètres" isActive={isActive("/settings")} render={<Link href="/settings" />}>
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
        <NavUser user={currentUser} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
