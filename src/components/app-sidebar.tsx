"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { SearchForm } from "@/components/search-form"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Telescope,
  Clapperboard,
  Store,
  Terminal,
  House,
  Radar,
} from "lucide-react"

const data = {
  user: {
    name: "Logan",
    email: "logan@outlr.io",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LoganOutlr",
  },
  teams: [
    {
      name: "Outlr",
      plan: "Pro",
    },
  ],
  navMain: [
    {
      title: "Home",
      icon: <House className="size-4" />,
      isActive: true,
      url: "/",
      items: [{ title: "Home", url: "/" }],
    },
    {
      title: "Research Tools",
      icon: <Telescope className="size-4" />,
      url: "/radar",
      items: [
        { title: "Radar Global", url: "/radar" },
        { title: "Shorts Channels", url: "/trending" },
        { title: "Long Form Channels", url: "/radar" },
        { title: "Saved Channels", url: "/tracking" },
        { title: "Channel Trends", url: "/channel-trends" },
        { title: "Monetization Tracker", url: "/sponsors" },
        { title: "Viral Videos", url: "/niche-finder" },
        { title: "Find Channel", url: "/dashboard/similar-channels" },
        { title: "YouTube Scraper", url: "/discovery" },
      ],
    },
    {
      title: "Creation Tools",
      icon: <Clapperboard className="size-4" />,
      url: "/tubelab",
      items: [
        { title: "TubeLab Studio", url: "/tubelab" },
        { title: "Title Lab", url: "/title-lab" },
        { title: "Viral AI Strategist", url: "/viral-chat" },
        { title: "Thumbnail Intelligence", url: "/thumbnail-intelligence" },
        { title: "Global Stats", url: "/stats" },
      ],
    },
    {
      title: "Market",
      icon: <Store className="size-4" />,
      url: "/leads",
      items: [
        { title: "Brands & Sponsors", url: "/leads" },
        { title: "Compare Channels", url: "/compare" },
      ],
    },
    {
      title: "MCP/API",
      icon: <Terminal className="size-4" />,
      url: "/settings",
      badge: "New",
      items: [{ title: "Settings & API", url: "/settings" }],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [currentUser, setCurrentUser] = React.useState(data.user)

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.authenticated && resData.user) {
          setCurrentUser({
            name: resData.user.name,
            email: resData.user.email,
            avatar: resData.user.avatar,
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-white/10 bg-[#0a0a0a] text-neutral-300"
      {...props}
    >
      <SidebarHeader className="bg-[#0a0a0a] p-3 pb-1">
        <TeamSwitcher teams={data.teams} />
        <SearchForm />
      </SidebarHeader>

      <SidebarContent className="bg-[#0a0a0a] px-3 py-2">
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="bg-[#0a0a0a] p-3 pt-1">
        <NavUser user={currentUser} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
