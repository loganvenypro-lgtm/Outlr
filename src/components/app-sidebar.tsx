"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Flame,
  Layers,
  TrendingUp,
  BarChart3,
  Sparkles,
  Bell,
  Compass,
  Zap,
  Wand2,
  DollarSign,
  FolderHeart,
  Folder,
} from "lucide-react"

const data = {
  user: {
    name: "Logan",
    email: "logan@outlr.io",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LoganOutlr",
  },
  teams: [
    {
      name: "Outlr Radar",
      plan: "Pro Intelligence",
    },
  ],
  navMain: [
    {
      title: "Recherche & Découverte",
      url: "/",
      icon: <Flame className="size-4" />,
      isActive: true,
      items: [
        {
          title: "Vidéos Atypiques",
          url: "/",
          badge: "Radar",
        },
        {
          title: "Viral Niche Finder",
          url: "/niche-finder",
          badge: "Outliers",
        },
        {
          title: "Channel Trends (24h)",
          url: "/channel-trends",
          badge: "Spike",
        },
        {
          title: "Tendances YouTube",
          url: "/trending",
        },
        {
          title: "Statistiques Globales",
          url: "/stats",
        },
      ],
    },
    {
      title: "Intelligence Créateur",
      url: "/viral-chat",
      icon: <Sparkles className="size-4" />,
      items: [
        {
          title: "Viral AI Strategist",
          url: "/viral-chat",
          badge: "IA",
        },
        {
          title: "Channel Tracking",
          url: "/tracking",
        },
        {
          title: "Concurrents & Audience",
          url: "/dashboard/similar-channels",
        },
      ],
    },
    {
      title: "Studio & Monétisation",
      url: "/tubelab",
      icon: <Zap className="size-4" />,
      items: [
        {
          title: "TubeLab Studio",
          url: "/tubelab",
        },
        {
          title: "Titre & Copywriting",
          url: "/title-lab",
        },
        {
          title: "Revenus & Sponsos",
          url: "/sponsors",
        },
        {
          title: "Marques & Sponsors",
          url: "/leads",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Dossier Tech & IA",
      url: "/tracking",
      icon: <Folder className="size-4 text-blue-500" />,
    },
    {
      name: "Chaînes Faceless / Cashcow",
      url: "/tracking",
      icon: <Folder className="size-4 text-purple-500" />,
    },
    {
      name: "Storytelling & Documentaires",
      url: "/tracking",
      icon: <Folder className="size-4 text-emerald-500" />,
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
      className="border-r border-slate-200/80 bg-white text-slate-800 shadow-xs"
      {...props}
    >
      <SidebarHeader className="p-3 border-b border-slate-100 bg-white">
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>

      <SidebarContent className="p-2 space-y-2 bg-white">
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-slate-100 bg-white space-y-2">
        <NavUser user={currentUser} />
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-lime-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-600">
              PostgreSQL Sync
            </span>
          </div>
          <span className="text-[10px] font-black text-slate-900 bg-lime-400 px-2 py-0.5 rounded-md">
            ACTIF
          </span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
