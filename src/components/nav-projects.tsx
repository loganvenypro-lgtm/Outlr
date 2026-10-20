"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavProjects({
  projects,
}: {
  projects: {
    name: string
    url: string
    icon: React.ReactNode
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">
        Dossiers de veille
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {projects.map((item) => {
          const isActive = pathname.startsWith(item.url) && item.name === "Tous les dossiers"

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
                render={
                  <Link href={item.url} className="flex items-center gap-2.5">
                    {item.icon}
                    <span className="truncate">{item.name}</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
