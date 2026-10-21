"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Settings, ShieldCheck } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { NAV_GROUPS, isFolder, type NavFolder } from "@/components/nav-config"
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
  useSidebar,
} from "@/components/ui/sidebar"

const NAV_BUTTON =
  "h-8.5 rounded-lg px-2.5 text-[13.5px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground [&_svg]:size-[17px] [&_svg]:text-sidebar-foreground/50"

// The current page reads as a raised white tab on the grey sidebar.
const NAV_ACTIVE =
  "data-active:bg-background data-active:font-semibold data-active:text-sidebar-foreground data-active:shadow-[0_1px_2px_rgb(15_23_42/0.06),0_0_0_1px_rgb(15_23_42/0.06)] data-active:hover:bg-background data-active:[&_svg]:text-sidebar-foreground dark:data-active:bg-sidebar-accent dark:data-active:shadow-none"

const FALLBACK_USER = {
  name: "Logan",
  email: "logan@outlr.io",
  avatar: getDicebearAvatar("logan@outlr.io"),
}

function NavBadge({ label }: { label: string }) {
  return (
    <span className="ml-auto flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 group-data-[collapsible=icon]:hidden dark:text-emerald-400">
      <span className="size-1.5 rounded-full bg-emerald-500" />
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
          className={`${NAV_BUTTON} ${NAV_ACTIVE}`}
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
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={folder.title}
            className={`${NAV_BUTTON} ${hasActiveChild ? "text-sidebar-foreground [&_svg]:text-sidebar-foreground" : ""}`}
          />
        }
      >
        <folder.icon />
        <span>{folder.title}</span>
        <ChevronDown className="ml-auto size-3.5! text-sidebar-foreground/40! transition-transform duration-200 group-data-open/collapsible:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
        <SidebarMenuSub className="mx-0 mt-0.5 ml-[18px] gap-0.5 border-sidebar-foreground/10 pr-0 pl-2.5">
          {folder.items.map((item) => (
            <SidebarMenuSubItem key={item.url}>
              <SidebarMenuSubButton
                isActive={isActive(item.url)}
                className={`h-8 rounded-lg px-2.5 text-[13px] text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground ${NAV_ACTIVE}`}
                render={<Link href={item.url} />}
              >
                <span className="truncate">{item.title}</span>
                {item.badge && <NavBadge label={item.badge} />}
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
    <Sidebar collapsible="icon" variant="inset" className="font-sidebar" {...props}>
      <SidebarHeader className="pb-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent active:bg-transparent" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background shadow-[0_1px_2px_rgb(15_23_42/0.08),0_0_0_1px_rgb(15_23_42/0.06)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/outlr-mark.png" alt="" className="size-5 object-contain" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-[15px] font-bold tracking-tight">Outlr</span>
                <span className="truncate text-[11.5px] text-sidebar-foreground/50">Radar YouTube</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="h-7 px-2.5 text-[11.5px] font-medium text-sidebar-foreground/45">
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
                        className={`${NAV_BUTTON} ${NAV_ACTIVE}`}
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

      <SidebarFooter className="gap-1.5">
        <SidebarMenu className="gap-0.5">
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Admin"
                isActive={isActive("/admin")}
                className={`${NAV_BUTTON} ${NAV_ACTIVE}`}
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
              className={`${NAV_BUTTON} ${NAV_ACTIVE}`}
              render={<Link href="/settings" />}
            >
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="rounded-xl bg-background p-1 shadow-[0_1px_2px_rgb(15_23_42/0.06),0_0_0_1px_rgb(15_23_42/0.06)] group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:shadow-none dark:bg-sidebar-accent dark:shadow-none">
          <NavUser user={currentUser} />
        </div>
        <p className="px-2.5 text-[11px] leading-4 text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
          Données fournies par YouTube ·{" "}
          <Link href="/privacy" className="hover:text-sidebar-foreground">
            Confidentialité
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-sidebar-foreground">
            Conditions
          </Link>
        </p>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
