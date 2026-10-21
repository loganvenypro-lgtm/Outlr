"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bookmark,
  ChevronDown,
  Clapperboard,
  Eye,
  Flame,
  House,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

type NavLink = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

// A folder groups several links under one collapsible entry.
type NavFolder = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: Omit<NavLink, "icon">[]
}

type NavEntry = NavLink | NavFolder

const isFolder = (entry: NavEntry): entry is NavFolder => "items" in entry

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
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

const NAV_BUTTON =
  "h-9 rounded-lg px-2.5 text-[14px] font-medium text-sidebar-foreground/85 hover:text-sidebar-foreground [&_svg]:size-[18px] [&_svg]:text-sidebar-foreground/70"

const NAV_BUTTON_ACTIVE =
  "data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:[&_svg]:text-sidebar-primary-foreground"

const FALLBACK_USER = {
  name: "Logan",
  email: "logan@outlr.io",
  avatar: getDicebearAvatar("logan@outlr.io"),
}

function NavBadge({ label }: { label: string }) {
  return (
    <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 group-data-[collapsible=icon]:hidden dark:text-emerald-400">
      {label}
    </span>
  )
}

function NavFolderItem({ folder, isActive }: { folder: NavFolder; isActive: (url: string) => boolean }) {
  const { state, isMobile } = useSidebar()
  const hasActiveChild = folder.items.some((item) => isActive(item.url))
  const [open, setOpen] = React.useState(hasActiveChild)

  // Opening a page inside a closed folder reveals it.
  React.useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [hasActiveChild])

  // With the sidebar reduced to icons the folder can't unfold, so it links to its first page.
  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={folder.title}
          isActive={hasActiveChild}
          className={`${NAV_BUTTON} ${NAV_BUTTON_ACTIVE}`}
          render={<Link href={folder.items[0].url} />}
        >
          <folder.icon />
          <span>{folder.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={folder.title} className={NAV_BUTTON} />}>
        <folder.icon />
        <span>{folder.title}</span>
        <ChevronDown className="ml-auto size-4! text-sidebar-foreground/45! transition-transform duration-200 group-data-open/collapsible:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <SidebarMenuSub className="mx-0 mt-0.5 ml-[19px] gap-0.5 pr-0 pl-3">
          {folder.items.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                isActive={isActive(item.url)}
                className="h-9 rounded-lg px-3 text-[13.5px] text-sidebar-foreground/70 hover:text-sidebar-foreground data-active:bg-sidebar-primary data-active:font-medium data-active:text-sidebar-primary-foreground data-active:shadow-sm"
                render={<Link href={item.url} />}
              >
                <span className="truncate">{item.title}</span>
                {item.badge && !isActive(item.url) && <NavBadge label={item.badge} />}
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = React.useState(FALLBACK_USER)
  const [isAdmin, setIsAdmin] = React.useState(false)

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
          setIsAdmin(!!resData.user.isAdmin)
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
    <Sidebar collapsible="icon" className="font-sidebar" {...props}>
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
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="h-7 px-2.5 text-[11px] font-semibold tracking-[0.08em] text-sidebar-foreground/45 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((entry) =>
                  isFolder(entry) ? (
                    <NavFolderItem key={entry.title} folder={entry} isActive={isActive} />
                  ) : (
                    <SidebarMenuItem key={entry.url}>
                      <SidebarMenuButton
                        tooltip={entry.title}
                        isActive={isActive(entry.url)}
                        className={`${NAV_BUTTON} ${NAV_BUTTON_ACTIVE}`}
                        render={<Link href={entry.url} />}
                      >
                        <entry.icon />
                        <span>{entry.title}</span>
                        {entry.badge && <NavBadge label={entry.badge} />}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-0.5">
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Admin"
                isActive={isActive("/admin")}
                className={`${NAV_BUTTON} ${NAV_BUTTON_ACTIVE}`}
                render={<Link href="/admin" />}
              >
                <ShieldCheck />
                <span>Admin</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Paramètres"
              isActive={isActive("/settings")}
              className={`${NAV_BUTTON} ${NAV_BUTTON_ACTIVE}`}
              render={<Link href="/settings" />}
            >
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
        <NavUser user={currentUser} />
        <p className="px-2 text-[11px] leading-4 text-muted-foreground group-data-[collapsible=icon]:hidden">
          Données fournies par YouTube ·{" "}
          <Link href="/privacy" className="hover:text-foreground">
            Confidentialité
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-foreground">
            Conditions
          </Link>
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
