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
  SlidersHorizontal,
  LayoutDashboard,
  Layers,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navConfig = [
  {
    title: "Recherche & DÃ©couverte",
    defaultOpen: true,
    items: [
      {
        title: "VidÃ©os Atypiques",
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
    title: "Intelligence CrÃ©ateur",
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
    title: "Studio & MonÃ©tisation",
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-base shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
            O
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              Outlr
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              YouTube Viral Intelligence
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Filter / Quick Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrer les outils..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Navigation Sections */}
      <SidebarContent className="gap-5 bg-white px-3 py-5">
        {navConfig.map((group) => {
          const filteredItems = group.items.filter((item) =>
            !searchFilter ||
            item.title.toLowerCase().includes(searchFilter.toLowerCase())
          );

          if (filteredItems.length === 0) return null;

          return (
            <Collapsible
              key={group.title}
              defaultOpen={group.defaultOpen || Boolean(searchFilter)}
              className="group/collapsible"
            >
              <SidebarGroup className="py-1">
                <SidebarGroupLabel
                  className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between cursor-pointer hover:text-slate-600 transition-colors rounded-md"
                  render={<CollapsibleTrigger />}
                >
                  <span>{group.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-open/collapsible:rotate-90 text-slate-400" />
                </SidebarGroupLabel>

                <CollapsibleContent>
                  <SidebarGroupContent className="pt-1">
                    <SidebarMenu className="gap-1">
                      {filteredItems.map((item) => {
                        const isActive =
                          item.url === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.url);
                        const Icon = item.icon;

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              isActive={isActive}
                              className={`h-10 rounded-xl px-3 text-[13px] font-medium transition-colors flex items-center justify-between ${
                                isActive
                                  ? "bg-blue-50 text-blue-700 font-semibold"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                              render={<Link href={item.url} />}
                            >
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
                            </SidebarMenuButton>
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

      {/* Footer Info */}
      <SidebarFooter className="border-t border-slate-100 p-3 bg-white">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-500">
              Live YouTube Radar
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


