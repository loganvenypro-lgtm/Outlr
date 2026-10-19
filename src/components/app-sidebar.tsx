"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flame,
  Search,
  Sparkles,
  TrendingUp,
  BarChart3,
  Bell,
  Compass,
  Wand2,
  Zap,
  FolderHeart,
  DollarSign,
  ChevronRight,
  Layers,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NavUser } from "@/components/nav-user";
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
  SidebarRail,
} from "@/components/ui/sidebar";

const navConfig = [
  {
    title: "Recherche & Découverte",
    defaultOpen: true,
    items: [
      {
        title: "Vidéos Atypiques",
        url: "/",
        icon: Flame,
      },
      {
        title: "Viral Niche Finder",
        url: "/niche-finder",
        icon: Layers,
        badge: "Outliers",
      },
      {
        title: "Channel Trends",
        url: "/channel-trends",
        icon: TrendingUp,
        badge: "24h Spike",
      },
      {
        title: "Radar & Tendances",
        url: "/trending",
        icon: Flame,
      },
      {
        title: "Statistiques Globales",
        url: "/stats",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "Intelligence Créateur",
    defaultOpen: true,
    items: [
      {
        title: "Viral AI Strategist",
        url: "/viral-chat",
        icon: Sparkles,
        badge: "AI RAG",
      },
      {
        title: "Channel Tracking",
        url: "/tracking",
        icon: Bell,
        badge: "Radar",
      },
      {
        title: "Concurrents & Audience",
        url: "/dashboard/similar-channels",
        icon: Compass,
      },
    ],
  },
  {
    title: "Studio & Monétisation",
    defaultOpen: false,
    items: [
      {
        title: "TubeLab Studio",
        url: "/tubelab",
        icon: Zap,
      },
      {
        title: "Titre & Copywriting",
        url: "/title-lab",
        icon: Wand2,
      },
      {
        title: "Revenus & Sponsos",
        url: "/sponsors",
        icon: DollarSign,
      },
      {
        title: "Marques & Sponsors",
        url: "/leads",
        icon: FolderHeart,
      },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [searchFilter, setSearchFilter] = React.useState("");

  return (
    <Sidebar
      className="border-r border-slate-200 bg-white text-slate-800 shadow-sm"
      {...props}
    >
      {/* Brand Header */}
      <SidebarHeader className="border-b border-slate-100 bg-white px-5 pb-4 pt-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Flame className="h-5 w-5 fill-white" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight text-blue-600">
              Outlr
            </span>
            <span className="block text-[11px] font-medium text-slate-400">
              YouTube Viral Intelligence
            </span>
          </div>
        </Link>

        {/* Quick Filter Search */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer les outils..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-[12px] text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-2 py-3 bg-white space-y-1">
        {navConfig.map((group) => {
          const filteredItems = group.items.filter((item) =>
            item.title.toLowerCase().includes(searchFilter.toLowerCase())
          );

          if (searchFilter && filteredItems.length === 0) return null;

          return (
            <Collapsible
              key={group.title}
              defaultOpen={group.defaultOpen || Boolean(searchFilter)}
              className="group/collapsible"
            >
              <SidebarGroup className="p-0">
                <SidebarGroupLabel
                  render={
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
                      <span>{group.title}</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                  }
                />

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-0.5">
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          pathname === item.url ||
                          (item.url !== "/" && pathname.startsWith(item.url));

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              isActive={isActive}
                              className={`w-full justify-between rounded-xl px-3 py-2 text-sm transition-all ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 font-semibold"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                              render={
                                <Link href={item.url}>
                                  <div className="flex items-center gap-2.5">
                                    <Icon
                                      className={`h-4 w-4 shrink-0 ${
                                        isActive
                                          ? "text-blue-600"
                                          : "text-slate-400 group-hover:text-slate-600"
                                      }`}
                                    />
                                    <span>{item.title}</span>
                                  </div>

                                  {item.badge && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                                        isActive
                                          ? "bg-blue-200/60 text-blue-800"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </Link>
                              }
                            />
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      {/* Footer User Profile with clean layout */}
      <SidebarFooter className="border-t border-slate-100 p-2 bg-white">
        <NavUser
          user={{
            name: "Logan",
            email: "logan@outlr.io",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LoganOutlr",
          }}
        />
        <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-500">
              Radar Live PostgreSQL
            </span>
          </div>
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            PRO
          </span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
