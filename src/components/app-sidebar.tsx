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

// Outlr navigation configuration
const data = {
  user: {
    name: "Logan",
    email: "logan@outlr.io",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LoganOutlr",
  },
  teams: [
    {
      name: "Outlr Radar",
      logo: (
        <Flame className="size-4 text-blue-600" />
      ),
      plan: "Pro Intelligence",
    },
    {
      name: "Studio Créateur",
      logo: (
        <Zap className="size-4 text-amber-500" />
      ),
      plan: "Scale Plan",
    },
  ],
  navMain: [
    {
      title: "Recherche & Découverte",
      url: "/",
      icon: (
        <Flame className="size-4" />
      ),
      isActive: true,
      items: [
        {
          title: "Vidéos Atypiques",
          url: "/",
        },
        {
          title: "Viral Niche Finder",
          url: "/niche-finder",
        },
        {
          title: "Channel Trends (24h)",
          url: "/channel-trends",
        },
        {
          title: "Radar & Tendances",
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
      icon: (
        <Sparkles className="size-4" />
      ),
      items: [
        {
          title: "Viral AI Strategist",
          url: "/viral-chat",
        },
        {
          title: "Channel Tracking (Radar)",
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
      icon: (
        <Zap className="size-4" />
      ),
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
      icon: (
        <Folder className="size-4 text-blue-500" />
      ),
    },
    {
      name: "Chaînes Faceless",
      url: "/tracking",
      icon: (
        <Folder className="size-4 text-purple-500" />
      ),
    },
    {
      name: "Inspiration Storytelling",
      url: "/tracking",
      icon: (
        <Folder className="size-4 text-emerald-500" />
      ),
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [currentUser, setCurrentUser] = React.useState(data.user)

  // Fetch logged-in user dynamically if session exists
  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser({
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatar,
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
