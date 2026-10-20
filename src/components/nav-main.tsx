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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronDownIcon } from "lucide-react"

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
    <SidebarGroup className="p-0">
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
                    className="w-full justify-between rounded-lg px-2.5 py-2 text-[13px] font-semibold text-neutral-200 transition-colors hover:bg-white/5 hover:text-white"
                  />
                }
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-neutral-400">{item.icon}</span>
                  <span>{item.title}</span>
                  {item.badge && (
                    <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </span>
                <ChevronDownIcon className="ml-auto size-3.5 text-neutral-500 transition-transform duration-200 group-data-open/collapsible:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="ml-4 border-l border-white/10 py-1 pl-3 pr-0">
                  {item.items?.map((subItem) => {
                    const isSubActive = pathname === subItem.url

                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          isActive={isSubActive}
                          className={`relative rounded-lg px-3 py-[7px] text-[13px] transition-colors ${
                            isSubActive
                              ? "bg-white/10 font-medium text-white"
                              : "font-normal text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
                          }`}
                          render={<Link href={subItem.url} />}
                        >
                          <span className="flex-1 truncate">{subItem.title}</span>
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
