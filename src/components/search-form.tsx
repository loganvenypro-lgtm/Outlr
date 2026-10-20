"use client"

import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"
import { SearchIcon } from "lucide-react"

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  return (
    <form {...props}>
      <SidebarGroup className="p-0 pt-1">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="search"
            placeholder="Search"
            className="rounded-lg border-white/10 bg-white/5 pl-8 text-[13px] text-neutral-200 placeholder:text-neutral-500 focus:border-white/20 focus:bg-white/10"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-neutral-500 select-none" />
          <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1 text-[10px] font-medium text-neutral-500 select-none group-data-[collapsible=icon]:hidden sm:block">
            ⌘K
          </kbd>
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}
