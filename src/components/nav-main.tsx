"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    badge?: string
    items?: {
      title: string
      url: string
      badge?: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
        Menu Principal
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => {
          const isParentActive =
            pathname === item.url ||
            item.items?.some((sub) => pathname === sub.url)

          return (
            <Collapsible
              key={item.title}
              defaultOpen={item.isActive || isParentActive}
              className="group/collapsible"
              render={<SidebarMenuItem />}
            >
              <CollapsibleTrigger
                render={
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={`w-full justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                      isParentActive
                        ? "bg-slate-100 text-slate-900 shadow-xs"
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                    }`}
                  />
                }
              >
                <div className="flex items-center gap-2.5">
                  <span className={isParentActive ? "text-lime-500" : "text-slate-400 group-hover/collapsible:text-slate-600"}>
                    {item.icon}
                  </span>
                  <span className="tracking-tight">{item.title}</span>
                </div>
                <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90 text-slate-400" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="ml-5 border-l border-slate-200/80 pl-2.5 py-1 space-y-1">
                  {item.items?.map((subItem) => {
                    const isSubActive = pathname === subItem.url

                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          isActive={isSubActive}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                            isSubActive
                              ? "bg-slate-900 text-white font-semibold shadow-xs"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                          render={<Link href={subItem.url} />}
                        >
                          <span className="flex-1 truncate">{subItem.title}</span>
                          {subItem.badge && (
                            <span
                              className={`text-[9.5px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ml-auto ${
                                isSubActive
                                  ? "bg-lime-400 text-slate-950"
                                  : "bg-slate-100 text-slate-500 border border-slate-200/60"
                              }`}
                            >
                              {subItem.badge}
                            </span>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
